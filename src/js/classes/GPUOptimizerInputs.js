import {MAX_GPU_STAT_CONSTRAINTS} from './OptimizerConstraints';
import {resolveOptimizationPlanVariation} from './OptimizationPlan';

const MAX_GPU_SET_COUNT = 128;
const SET_BONUS_LEVELS = MAX_GPU_SET_COUNT * 2;
const VARIATION_LOOKUP_SIZE = 257 + MAX_GPU_SET_COUNT * MAX_GPU_SET_COUNT;
export const GPU_SLOT_NAMES = Object.freeze(['flower', 'plume', 'sands', 'goblet', 'circlet']);

/** One encoder per search/region: set IDs never live on an execution engine. */
export class GPUOptimizerInputs {
    artifactsToBuffer(artifacts, statIndexMap) {
        const statCount = Object.keys(statIndexMap).length;
        // No padding - just stats + set_id
        const artifactSize = statCount + 1;
        const bytesPerArtifact = artifactSize * 4;

        // Create ArrayBuffer and views for both f32 and u32 access
        const arrayBuffer = new ArrayBuffer(artifacts.length * bytesPerArtifact);
        const floatView = new Float32Array(arrayBuffer);
        const uintView = new Uint32Array(arrayBuffer);

        for (let i = 0; i < artifacts.length; i++) {
            const art = artifacts[i];
            const offset = i * artifactSize;

            // Copy stats as f32
            if (art.calculated) {
                for (const [stat, value] of Object.entries(art.calculated)) {
                    const idx = statIndexMap[stat];
                    if (idx !== undefined) {
                        floatView[offset + idx] = value;
                    }
                }
            }

            // Set ID as u32 (NOT as float!)
            const setName = art.getSetName ? art.getSetName() : art.set;
            const setId = this.getSetIdNumber(setName);
            uintView[offset + statCount] = setId;
            // Padding stays as 0
        }

        return floatView;
    }

    artifactsToCombinedBuffer(slots, statIndexMap) {
        const statCount = Object.keys(statIndexMap).length;
        const artifactSize = statCount + 1;
        const slotNames = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
        const counts = {};
        const offsets = {};

        let totalArtifacts = 0;
        for (const slot of slotNames) {
            offsets[slot] = totalArtifacts;
            counts[slot] = slots[slot].length;
            totalArtifacts += slots[slot].length;
        }

        const arrayBuffer = new ArrayBuffer(totalArtifacts * artifactSize * 4);
        const floatView = new Float32Array(arrayBuffer);
        const uintView = new Uint32Array(arrayBuffer);

        let globalIndex = 0;
        for (const slot of slotNames) {
            for (const art of slots[slot]) {
                const offset = globalIndex * artifactSize;
                if (art.calculated) {
                    for (const [stat, value] of Object.entries(art.calculated)) {
                        const idx = statIndexMap[stat];
                        if (idx !== undefined) {
                            floatView[offset + idx] = value;
                        }
                    }
                }
                const setName = art.getSetName ? art.getSetName() : art.set;
                uintView[offset + statCount] = this.getSetIdNumber(setName);
                globalIndex++;
            }
        }

        return { buffer: floatView, offsets, counts };
    }

    getSetIdNumber(setName) {
        if (!this._setIdMap) {
            this._setIdMap = new Map();
            this._setIdCounter = 0;
        }
        if (!this._setIdMap.has(setName)) {
            this._setIdMap.set(setName, this._setIdCounter++);
        }
        return this._setIdMap.get(setName);
    }

    preBuildSetIdMap(slots, setData = {}, settings = {}, variationSource = {}) {
        this._setIdMap = new Map();
        this._setIdCounter = 0;
        const setNames = new Set();

        for (const slotName of Object.keys(slots)) {
            for (const art of slots[slotName]) {
                // Get set name - could be property or method
                const setName = art.getSetName ? art.getSetName() : art.set;
                if (setName) {
                    setNames.add(setName);
                }
            }
        }

        for (const setName of Object.keys(setData || {})) {
            setNames.add(setName);
        }

        for (const setName of Object.keys(settings.setMinValues || {})) {
            setNames.add(setName);
        }

        for (const setName of Object.keys(settings.setMaxValues || {})) {
            setNames.add(setName);
        }

        for (const setInfo of getVariationSetInfo(variationSource)) {
            for (const { setName } of setInfo) {
                if (setName) {
                    setNames.add(setName);
                }
            }
        }

        for (const setName of Array.from(setNames).sort()) {
            this._setIdMap.set(setName, this._setIdCounter++);
        }

        if (this._setIdCounter > MAX_GPU_SET_COUNT) {
            throw new RangeError(
                `GPU optimizer supports at most ${MAX_GPU_SET_COUNT} visible artifact sets; got ${this._setIdCounter}`
            );
        }
    }

    computeSetKeyFromIds(setIds) {
        // Count pieces per set
        const counts = {};
        for (const id of setIds) {
            if (id !== undefined && id < 128) {
                counts[id] = (counts[id] || 0) + 1;
            }
        }

        // Compact collision-free key:
        //   0             -> default/no dynamic set
        //   1+s           -> one 2pc set
        //   129+s         -> one 4pc set
        //   257+lo*128+hi -> two 2pc sets, lo < hi
        const sortedSetIds = Object.keys(counts).map(Number).sort((a, b) => a - b);
        const twoPieceSets = [];

        for (const setId of sortedSetIds) {
            const count = counts[setId];
            if (count >= 4) {
                return 129 + setId;
            } else if (count >= 2) {
                twoPieceSets.push(setId);
            }
        }

        if (twoPieceSets.length >= 2) {
            return 257 + twoPieceSets[0] * MAX_GPU_SET_COUNT + twoPieceSets[1];
        }
        if (twoPieceSets.length === 1) {
            return 1 + twoPieceSets[0];
        }

        return 0;
    }

    statsToBuffer(stats, statIndexMap) {
        const statCount = Object.keys(statIndexMap).length;
        const buffer = new Float32Array(statCount);

        for (const [stat, idx] of Object.entries(statIndexMap)) {
            buffer[idx] = stats[stat] || 0;
        }

        return buffer;
    }

    setBonusesToBuffer(setData, statIndexMap, settings = {}) {
        const statCount = Object.keys(statIndexMap).length;
        // 128 possible set IDs * 2 bonus levels.
        const buffer = new Float32Array(SET_BONUS_LEVELS * statCount);

        if (!setData) {
            console.warn('GPU: setData is null/undefined!');
            return buffer;
        }

        const setMaxValues = settings.setMaxValues || {};

        for (const [setId, piecesData] of Object.entries(setData)) {
            const setIdNum = this.getSetIdNumber(setId);
            if (setIdNum >= MAX_GPU_SET_COUNT) {
                continue;
            }

            // Check if this set is limited by setMaxValues
            // setMaxValues keys match setData keys directly (e.g., "MarechausseeHunter")
            const maxPieces = setMaxValues[setId];
            const maxPiecesNum = maxPieces !== undefined ? parseInt(maxPieces, 10) : Infinity;

            // Get 2-piece stats (if any)
            const twopiece = piecesData['2'];
            const fourpiece = piecesData['4'];

            // Store 2-piece bonus at index setIdNum * 2
            // Skip if setMaxValues limits us to < 2 pieces
            const skip2pc = maxPiecesNum <= 2;
            if (twopiece && twopiece.stats && !skip2pc) {
                const offset = setIdNum * 2 * statCount;
                for (const [stat, value] of Object.entries(twopiece.stats)) {
                    const idx = statIndexMap[stat];
                    if (idx !== undefined) {
                        buffer[offset + idx] = value;
                    }
                }
            }

            // Store 4-piece DELTA at index setIdNum * 2 + 1
            // Skip if setMaxValues limits us to < 4 pieces
            const skip4pc = maxPiecesNum <= 4;
            if (fourpiece && fourpiece.stats && !skip4pc) {
                const offset = (setIdNum * 2 + 1) * statCount;
                const twopieceStats = twopiece ? twopiece.stats : {};

                for (const [stat, value] of Object.entries(fourpiece.stats)) {
                    const idx = statIndexMap[stat];
                    if (idx !== undefined) {
                        // Store the delta: 4pc cumulative minus 2pc
                        const twopieceValue = twopieceStats[stat] || 0;
                        const deltaValue = value - twopieceValue;
                        buffer[offset + idx] = deltaValue;
                    }
                }
            }
        }

        return buffer;
    }

    buildConstraintData(normalizedBounds, statIndexMap) {
        const constraints = [];
        const statBounds = new Map();

        if (!Array.isArray(normalizedBounds)) {
            throw new TypeError('GPU optimizer constraint bounds must be an array');
        }

        for (const bound of normalizedBounds) {
            if (
                !bound ||
                typeof bound.stat !== 'string' ||
                !bound.stat ||
                (bound.op !== 'min' && bound.op !== 'max') ||
                !Number.isFinite(bound.value)
            ) {
                throw new RangeError('GPU optimizer received an invalid normalized stat constraint');
            }
            const f32Value = Math.fround(bound.value);
            if (!Number.isFinite(f32Value)) {
                throw new RangeError(
                    `GPU optimizer constraint ${bound.stat}_${bound.op}=${bound.value} is outside the finite f32 domain`
                );
            }

            if (!statBounds.has(bound.stat)) {
                statBounds.set(bound.stat, {
                    min: undefined,
                    max: undefined,
                    isRealTotal: !!bound.isRealTotal,
                });
            }
            const grouped = statBounds.get(bound.stat);
            if (grouped.isRealTotal !== !!bound.isRealTotal) {
                throw new RangeError(`GPU optimizer constraint metadata disagrees for "${bound.stat}"`);
            }
            grouped[bound.op] = f32Value;
        }

        if (statBounds.size > MAX_GPU_STAT_CONSTRAINTS) {
            throw new RangeError(
                `GPU optimizer supports at most ${MAX_GPU_STAT_CONSTRAINTS} constrained stats; got ${statBounds.size}`
            );
        }

        for (const [stat, bounds] of statBounds) {
            if (bounds.min !== undefined && bounds.max !== undefined && bounds.min > bounds.max) {
                throw new RangeError(`GPU optimizer constraint "${stat}" has min greater than max`);
            }

            const statIndex = statIndexMap[stat];
            const baseIndex = statIndexMap[stat + '_base'];
            const pctIndex = bounds.isRealTotal ? statIndexMap[stat + '_percent'] : undefined;

            // A missing lane must reject the run, never silently remove a user
            // constraint and expand the feasible set.
            if (statIndex === undefined || baseIndex === undefined) {
                throw new RangeError(`GPU constraint stat "${stat}" is missing from the shader stat layout`);
            }
            if (bounds.isRealTotal && pctIndex === undefined) {
                throw new RangeError(`GPU constraint stat "${stat}_percent" is missing from the shader stat layout`);
            }

            constraints.push({
                stat_index: statIndex,
                stat_base_index: baseIndex,
                stat_pct_index: bounds.isRealTotal ? pctIndex : 0xFFFFFFFF,
                min_value: bounds.min !== undefined ? bounds.min : -3.4e38,
                max_value: bounds.max !== undefined ? bounds.max : 3.4e38,
                is_real_total: bounds.isRealTotal ? 1 : 0,
            });
        }

        // Build flat array for uniform buffer
        // Each constraint: [stat_index, base_index, pct_index, is_real_total, min_value(f32 bits), max_value(f32 bits), pad, pad]
        // Fixed size: 8 constraints * 8 values = 64 u32s
        const CONSTRAINT_SIZE = 8;
        const data = new Uint32Array(MAX_GPU_STAT_CONSTRAINTS * CONSTRAINT_SIZE);
        const floatView = new Float32Array(data.buffer);

        for (let i = 0; i < constraints.length; i++) {
            const c = constraints[i];
            const offset = i * CONSTRAINT_SIZE;

            data[offset + 0] = c.stat_index;
            data[offset + 1] = c.stat_base_index;
            data[offset + 2] = c.stat_pct_index;
            data[offset + 3] = c.is_real_total;
            floatView[offset + 4] = c.min_value;
            floatView[offset + 5] = c.max_value;
            data[offset + 6] = 0;
            data[offset + 7] = 0;
        }

        return { data, count: constraints.length };
    }

    buildSetFlagsData(settings) {
        const flags = new Uint32Array(128);
        const setMaxValues = settings.setMaxValues || {};
        const setMinValues = settings.setMinValues || {};

        // Add max constraints (disabled sets): reject if count >= pieces
        for (const [setName, pieces] of Object.entries(setMaxValues)) {
            const setId = this._setIdMap ? this._setIdMap.get(setName) : undefined;
            if (setId === undefined || setId >= 128) {
                console.warn(`GPU set flags: set "${setName}" not found or out of range`);
                continue;
            }

            const piecesNum = parseInt(pieces, 10);
            // Store in bits 0-7
            flags[setId] = (flags[setId] & 0xFF00) | (piecesNum & 0xFF);
        }

        // Add min constraints (required sets): reject if count < pieces
        for (const [setName, pieces] of Object.entries(setMinValues)) {
            const setId = this._setIdMap ? this._setIdMap.get(setName) : undefined;
            if (setId === undefined || setId >= 128) {
                console.warn(`GPU set flags: required set "${setName}" not found or out of range`);
                continue;
            }

            const piecesNum = parseInt(pieces, 10);
            // Store in bits 8-15
            flags[setId] = (flags[setId] & 0x00FF) | ((piecesNum & 0xFF) << 8);
        }

        return flags;
    }

    hasSetMinConstraints(settings) {
        return Object.keys(settings.setMinValues || {}).length > 0 ? 1 : 0;
    }

    hasSetMaxConstraints(settings) {
        return Object.keys(settings.setMaxValues || {}).length > 0 ? 1 : 0;
    }

    buildVariationLookup(planOrVariationMap, featureVariants) {
        if (planOrVariationMap?.kind === 'optimization-plan') {
            return this.buildPlanVariationLookup(planOrVariationMap);
        }

        const variationMap = planOrVariationMap;
        const buffer = new Uint32Array(VARIATION_LOOKUP_SIZE);
        const entries = [];
        let defaultVariation = 0;

        for (const [variationId, idx] of variationMap) {
            // Get set info directly from the compiler (more reliable than parsing)
            const compiler = featureVariants[variationId];
            const setInfo = compiler?.setInfo || [];

            if (setInfo.length === 0) {
                defaultVariation = idx;
                entries.push({ idx, key: 0, setInfo, setIds: [] });
                continue;
            }

            // Build array of set IDs (repeated by piece count)
            const setIds = [];
            for (const { setName, pieces } of setInfo) {
                const setId = this._setIdMap ? this._setIdMap.get(setName) : undefined;
                if (setId !== undefined) {
                    for (let i = 0; i < pieces; i++) {
                        setIds.push(setId);
                    }
                }
            }

            // Compute key the same way GPU does
            const key = this.computeSetKeyFromIds(setIds);
            if (key < buffer.length) {
                entries.push({ idx, key, setInfo, setIds });
            } else {
                console.warn(`GPU variation key ${key} is outside lookup size ${buffer.length}`);
            }
        }

        // Every unrecognized physical set state must use the semantic default,
        // even if future compiler ordering no longer assigns it variation 0.
        buffer.fill(defaultVariation);

        // A semantic single-dynamic-2pc variation remains active when the
        // other two pieces form an ordinary static set. The shader key includes
        // both physical 2pc sets, while compiler.setInfo intentionally lists
        // only variation-bearing sets, so populate those equivalent aliases.
        const dynamicTwoPieceSetIds = new Set();
        for (const entry of entries) {
            const semanticSetIds = [...new Set(entry.setIds)];
            if (entry.setInfo.length === 1 && semanticSetIds.length === 1 && Number(entry.setInfo[0].pieces) === 2) {
                dynamicTwoPieceSetIds.add(semanticSetIds[0]);
            }
        }

        const visibleSetIds = this._setIdMap
            ? [...this._setIdMap.values()].filter((setId) => setId < MAX_GPU_SET_COUNT)
            : [];

        for (const entry of entries) {
            const semanticSetIds = [...new Set(entry.setIds)];
            if (entry.setInfo.length !== 1 || semanticSetIds.length !== 1 || Number(entry.setInfo[0].pieces) !== 2) {
                continue;
            }

            const dynamicSetId = semanticSetIds[0];
            for (const partnerSetId of visibleSetIds) {
                if (partnerSetId === dynamicSetId || dynamicTwoPieceSetIds.has(partnerSetId)) {
                    continue;
                }

                const lo = Math.min(dynamicSetId, partnerSetId);
                const hi = Math.max(dynamicSetId, partnerSetId);
                buffer[257 + lo * MAX_GPU_SET_COUNT + hi] = entry.idx;
            }
        }

        // Explicit semantic entries, especially two-dynamic-2pc combinations,
        // always override the physical aliases above.
        for (const entry of entries) {
            buffer[entry.key] = entry.idx;
        }

        return buffer;
    }

    buildPlanVariationLookup(plan) {
        const buffer = new Uint32Array(VARIATION_LOOKUP_SIZE);
        const invalidVariation = 0xFFFFFFFF;
        const resolveIndex = (counts) => {
            const variation = resolveOptimizationPlanVariation(plan, counts);
            return variation ? variation.index : invalidVariation;
        };
        const defaultIndex = resolveIndex({});
        if (defaultIndex === invalidVariation) {
            throw new RangeError('Optimization plan has no unambiguous default variation');
        }
        buffer.fill(defaultIndex);

        const visibleSets = this._setIdMap
            ? [...this._setIdMap.entries()]
                .filter(([, setId]) => setId < MAX_GPU_SET_COUNT)
                .sort((left, right) => left[1] - right[1])
            : [];

        for (const [setName, setId] of visibleSets) {
            buffer[1 + setId] = resolveIndex({[setName]: 2});
            buffer[129 + setId] = resolveIndex({[setName]: 4});
        }

        for (let i = 0; i < visibleSets.length; ++i) {
            const [leftName, leftId] = visibleSets[i];
            for (let j = i + 1; j < visibleSets.length; ++j) {
                const [rightName, rightId] = visibleSets[j];
                const lo = Math.min(leftId, rightId);
                const hi = Math.max(leftId, rightId);
                buffer[257 + lo * MAX_GPU_SET_COUNT + hi] = resolveIndex({
                    [leftName]: 2,
                    [rightName]: 2,
                });
            }
        }

        return buffer;
    }

    validateSetBonusModel(setData = {}, slots = {}, variationSource = {}) {
        const reachablePieces = new Map();
        for (const [slotName, artifacts] of Object.entries(slots || {})) {
            const seenInSlot = new Set();
            for (const art of artifacts || []) {
                const setName = art.getSetName ? art.getSetName() : art.set;
                if (setName) {
                    seenInSlot.add(setName);
                }
            }
            for (const setName of seenInSlot) {
                reachablePieces.set(setName, (reachablePieces.get(setName) || 0) + 1);
            }
        }

        for (const [setName, piecesData] of Object.entries(setData || {})) {
            const reachable = reachablePieces.get(setName) || 0;
            if (reachable >= 1 && !setBonusEntriesEqual(piecesData?.['1'], undefined)) {
                throw new RangeError(`GPU optimizer does not support a reachable 1-piece effect for set "${setName}"`);
            }
            if (reachable >= 3 && !setBonusEntriesEqual(piecesData?.['3'], piecesData?.['2'])) {
                throw new RangeError(`GPU optimizer does not support a distinct 3-piece effect for set "${setName}"`);
            }
            if (reachable >= 5 && !setBonusEntriesEqual(piecesData?.['5'], piecesData?.['4'])) {
                throw new RangeError(`GPU optimizer does not support a distinct 5-piece effect for set "${setName}"`);
            }
        }

        for (const setInfo of getVariationSetInfo(variationSource)) {
            for (const { setName, pieces } of setInfo) {
                const threshold = Number(pieces);
                if (threshold !== 2 && threshold !== 4) {
                    throw new RangeError(
                        `GPU optimizer variation for set "${setName}" uses unsupported ${pieces}-piece semantics`
                    );
                }
            }
        }
    }

    buildParamsData({statIndexMap, baseStatsData, constraintData, settings, damageIndex}) {
        const statCount = Object.keys(statIndexMap).length;
        const baseStatsAligned = Math.ceil(statCount / 4) * 4;
        const headerSize = 20;
        const data = new Uint32Array(headerSize + baseStatsAligned + 64 + 128);
        data[8] = damageIndex;
        data[9] = constraintData.count;
        data[15] = statCount;
        data[16] = this.hasSetMinConstraints(settings);
        data[17] = this.hasSetMaxConstraints(settings);
        data[18] = constraintData.count > 0 ? 1 : 0;
        new Float32Array(data.buffer).set(baseStatsData, headerSize);
        const constraintOffset = headerSize + baseStatsAligned;
        data.set(constraintData.data, constraintOffset);
        data.set(this.buildSetFlagsData(settings), constraintOffset + 64);
        return data;
    }
}

function setBonusEntriesEqual(left, right) {
    const leftVariation = left?.variation || '';
    const rightVariation = right?.variation || '';
    if (leftVariation !== rightVariation) {
        return false;
    }

    const leftStats = left?.stats || {};
    const rightStats = right?.stats || {};
    const statNames = new Set([...Object.keys(leftStats), ...Object.keys(rightStats)]);
    for (const stat of statNames) {
        if (/^text_/.test(stat)) {
            continue;
        }
        const leftValue = Number(leftStats[stat] || 0);
        const rightValue = Number(rightStats[stat] || 0);
        if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
            return false;
        }
        const tolerance = 1e-7 * Math.max(1, Math.abs(leftValue), Math.abs(rightValue));
        if (Math.abs(leftValue - rightValue) > tolerance) {
            return false;
        }
    }
    return true;
}

function getVariationSetInfo(source) {
    if (source?.kind === 'optimization-plan') {
        return source.variations.map((variation) => {
            return variation.selector.terms.map((term) => ({
                setName: term.setName,
                pieces: term.minimumInclusive,
            }));
        });
    }

    return Object.values(source || {}).map((variation) => variation?.setInfo || []);
}

