import fs from "fs";
import path from "path";
import { Artifact } from "../../src/js/classes/Artifact";
import { CalcSet } from "../../src/js/classes/CalcSet";
import { CalcObjectEnemy } from "../../src/js/classes/CalcObject/Enemy";
import { isExtraStat } from "../../src/js/classes/PostEffect/Channels";
import { Team } from "../../src/js/classes/Team";
import { enemyStatOf } from "../../src/js/classes/Team/EnemyStats";
import { Stats } from "../../src/js/classes/Stats";
import { Condition } from "../../src/js/classes/Condition";
import { DB } from "../../src/js/db/DB";

export const RECEIVERS = ['Hutao', 'Tartaglia', 'Keqing', 'Eula', 'Wanderer', 'Itto', 'Alhaitham'];

export const PARTY_STAT_VALUES = {
    atk_total: 2000,
    hp_total: 30000,
    def_total: 2000,
    mastery_total: 800,
    mastery: 500,
    atk_base: 900,
    hp: 5000,
    def: 800,
    atk: 800,
    recharge_total: 200,
    crit_rate_total: 60,
};

/**
 * How far a number may be from its recording. The recordings are of 54e1d63;
 * the generated tables are printed to four decimals, and a later import
 * rounds some of them the other way (the released 7.2: a base DEF of 63.5197
 * became 63.5198). Base stats and talent values then differ from the
 * recording by up to 1.5e-6 of their value, the largest of the 4,237 numbers
 * that moved with that import. Anything a change of the model moves is
 * orders of magnitude above this.
 */
export const REL_TOL = 5e-6;
export const ABS_TOL = 1e-9;
export const ZERO_THRESHOLD = 1e-12;

export function ensureTestGlobals() {
    global.DB = DB;
    if (!global.UI) {
        global.UI = {Lang: {get: () => ''}};
    }
}

export function getCharKeys() {
    return DB.Chars.getKeys(true);
}

export function getPartyCharKeys() {
    return getCharKeys().filter((key) => DB.Chars.get(key).hasPartyData?.());
}

export function getArtifactSetKeys() {
    return DB.Artifacts.Sets.getKeys(true);
}

export function getBuffLeafConditions() {
    const top = [];
    for (const group of DB.Buffs.getList()) {
        top.push(...group.getConditions());
    }
    const unwrapped = Condition.unwrap(top);
    // Keep every leaf with a name and a serializeId, except infrastructure
    // types ('char', 'custom_buffs', the member's overrides, which save
    // their own value) which have no toggle semantics.
    const result = unwrapped.filter((cond) => {
        return cond && cond.getName && cond.getName() &&
            cond.params && cond.params.serializeId &&
            !(cond.isRetired && cond.isRetired()) &&
            cond.getType() !== 'char' && cond.getType() !== 'custom_buffs' && !cond.serializeValue;
    });
    result.sort((a, b) => {
        const na = a.getName();
        const nb = b.getName();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return (a.params.serializeId || 0) - (b.params.serializeId || 0);
    });
    return result;
}

export function getFixedEnemy() {
    return DB.Enemies.getFirst().getFirst();
}

/**
 * The enemy the scenarios were recorded against: the fixed enemy at level 90.
 *
 * @returns {CalcObjectEnemy}
 */
export function makeBaseEnemy() {
    const enemy = new CalcObjectEnemy();
    enemy.set(getFixedEnemy());
    enemy.setLevels({level: 90});
    return enemy;
}

export function getFixedWeaponForChar(charKey) {
    const char = DB.Chars.get(charKey);
    return DB.Weapons.get(char.weapon).getFirst(true);
}

export function getWeaponKey(weapon) {
    if (!weapon) return '';
    if (weapon.name) return weapon.name;
    return '';
}

export function makeBaseBuild(charKey, constellation) {
    const build = new CalcSet();
    const char = DB.Chars.get(charKey);
    const weapon = getFixedWeaponForChar(charKey);
    build.setChar(char);
    build.setCharLevels({level: 90, ascension: 6, constellation: constellation});
    build.setCharSkills({attack: 10, elemental: 10, burst: 10});
    build.setWeapon(weapon);
    build.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    build.setPartyChars?.([]); // Only the pre-refactor recording engine has this API.
    return build;
}

export function numberOnValue(cond, settings) {
    const params = cond.params || {};
    let value;
    if (params.partyStat !== undefined && PARTY_STAT_VALUES[params.partyStat] !== undefined) {
        value = PARTY_STAT_VALUES[params.partyStat];
    } else if (params.partySetting !== undefined) {
        value = 10;
    } else {
        try {
            value = cond.getMaxValue ? cond.getMaxValue(settings) : undefined;
        } catch {
            value = undefined;
        }
        if (value === undefined || value === null) {
            value = 1;
        }
    }
    if (typeof value === 'string') {
        value = parseFloat(value);
    }
    let min;
    let max;
    try {
        min = cond.getMinValue ? cond.getMinValue(settings) : params.min;
    } catch {
        min = params.min;
    }
    try {
        max = cond.getMaxValue ? cond.getMaxValue(settings) : params.max;
    } catch {
        max = params.max;
    }
    if (typeof min === 'string') min = parseFloat(min);
    if (typeof max === 'string') max = parseFloat(max);
    if (min !== undefined && min !== null && Number.isFinite(min)) {
        value = Math.max(min, value);
    }
    if (max !== undefined && max !== null && Number.isFinite(max) && max !== 0 && max !== false) {
        value = Math.min(max, value);
    }
    if (params.format === 'decimal') {
        value = Math.round(parseFloat(value) * 10) / 10;
    }
    return value;
}

export function conditionOnEntries(cond, settings) {
    if (!cond) return {};
    const name = cond.getName ? cond.getName() : null;
    // Nameless conditions (calc elements, moonsign, static helpers): use their
    // own all-on helper when available, otherwise nothing to set.
    if (!name) {
        if (typeof cond.getAllConditionsOn === 'function') {
            try {
                return cond.getAllConditionsOn(settings) || {};
            } catch {
                return {};
            }
        }
        return {};
    }
    const type = cond.getType ? cond.getType() : '';
    if (type === 'checkbox') {
        return {[name]: true};
    }
    if (type === 'stacks') {
        let max = 0;
        try {
            max = cond.getMaxStacks ? cond.getMaxStacks(settings) : 0;
        } catch {
            max = 0;
        }
        if (!max) {
            max = cond.params.maxStacks || 1;
        }
        return {[name]: max};
    }
    if (type === 'number') {
        return {[name]: numberOnValue(cond, settings)};
    }
    if (type === 'dropdown' || type === 'dropdown_multiple') {
        // Spec: multiple selects all values joined with ';' (see
        // Condition/Dropdown.js), single selects the last entry.
        if (cond.params.multiple) {
            const values = (cond.params.values || []).map((item) => '' + item.value);
            return {[name]: values.join(';')};
        }
        const values = cond.params.values || [];
        if (!values.length) return {};
        return {[name]: '' + values[values.length - 1].value};
    }
    if (typeof cond.getAllConditionsOn === 'function') {
        try {
            return cond.getAllConditionsOn(settings) || {};
        } catch {
            return {};
        }
    }
    return {};
}

export function buildAllOnSettings(conditions, baseSettings) {
    const unwrapped = Condition.unwrap(conditions);
    const settings = {};
    const merged = Object.assign({}, baseSettings);
    for (const cond of unwrapped) {
        const entries = conditionOnEntries(cond, merged);
        Object.assign(settings, entries);
        Object.assign(merged, entries);
    }
    return settings;
}

export function sortKeysDeep(value) {
    if (Array.isArray(value)) {
        return value.map((item) => sortKeysDeep(item));
    }
    if (value && typeof value === 'object') {
        const result = {};
        for (const key of Object.keys(value).sort()) {
            result[key] = sortKeysDeep(value[key]);
        }
        return result;
    }
    return value;
}

export function stringifyDeterministic(value) {
    return JSON.stringify(sortKeysDeep(value), null, 1);
}

export function baselineFilePath(fileName) {
    return path.join(__dirname, "..", "baseline", fileName);
}

export function loadRecorded(fileName) {
    const filePath = baselineFilePath(fileName);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function saveRecorded(fileName, data) {
    const filePath = baselineFilePath(fileName);
    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    fs.writeFileSync(filePath, stringifyDeterministic(data) + "\n");
}

/**
 * @param {Array|Function} [exclude] post-effects, or a predicate on them
 * @returns {Function} predicate
 */
export function excludedPostEffect(exclude) {
    if (typeof exclude == 'function') return exclude;
    return (effect) => (exclude || []).includes(effect);
}

/**
 * @param {CalcSet} build
 * @param {Object} [opts] {excludePostEffects} leaves those post-effects of the
 *     build's program out (see excludedPostEffect), to compare with a
 *     recording in which they were zero; {bonus} adds stats to the build's
 *     own stats before post-effects, as the recording had them
 */
export function computeScenarioResults(build, opts = {}) {
    // The enemy is the team's: evaluate against the recorded one.
    if (build.team) {
        build.team.enemy = makeBaseEnemy();
    } else {
        Team.fromMember(build, makeBaseEnemy());
    }
    const excluded = excludedPostEffect(opts.excludePostEffects);
    const getData = () => {
        const data = build.getBuildData();
        data.postEffects = data.postEffects.filter((effect) => !excluded(effect));
        if (opts.bonus) {
            const bonus = new Stats(opts.bonus);
            bonus.processPercent();
            data.stats.concat(bonus);
        }
        return data;
    };
    const dataStats = getData();
    dataStats.applyPostEffects();
    // The recording kept the enemy's RES and DEF changes among the receiver's
    // stats, without the base RES; they are the enemy's stats now, its totals
    // (Team/EnemyStats). DEF ignore was named enemy_def_ignore*.
    const baseRes = new Stats(build.team.enemy.getStats().stats);
    baseRes.processPercent();
    const stats = {};
    for (const key of Object.keys(dataStats.stats)) {
        // Extra lanes are bookkeeping for premod reads (PostEffect/Channels).
        if (isExtraStat(key)) continue;
        const enemyStat = enemyStatOf(key);
        const name = enemyStat || key.replace(/^def_ignore/, 'enemy_def_ignore');
        const value = enemyStat ? dataStats.stats[key] - (baseRes[enemyStat] || 0) : dataStats.stats[key];
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            continue;
        }
        if (Math.abs(value) < ZERO_THRESHOLD) {
            continue;
        }
        stats[name] = value;
    }
    const dataFeatures = getData();
    const features = build.getFeatures(dataFeatures);
    const recorded = {};
    for (const name of Object.keys(features).sort()) {
        const result = features[name];
        const normal = result ? result.normal : 0;
        const crit = result ? result.crit : 0;
        const average = result ? result.average : 0;
        recorded[name] = {
            normal: Number.isFinite(normal) ? normal : null,
            crit: Number.isFinite(crit) ? crit : null,
            average: Number.isFinite(average) ? average : null,
        };
    }
    return {stats, features: recorded};
}

export function numbersClose(actual, expected) {
    if (expected === null || actual === null) {
        return actual === expected;
    }
    if (typeof actual !== 'number' || typeof expected !== 'number') {
        return actual === expected;
    }
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
        return actual === expected;
    }
    const diff = Math.abs(actual - expected);
    if (diff <= ABS_TOL) {
        return true;
    }
    if (Math.abs(expected) > 0 && diff / Math.abs(expected) <= REL_TOL) {
        return true;
    }
    return false;
}

/**
 * Rows the recordings predate: the reactions a team deals together
 * (Feature2/Reaction/Team). What each member contributes to them is recorded
 * as its rows with a rank weight; test/teamReaction.test.js ranks those.
 */
const UNRECORDED_FEATURES = new Set([
    'reaction.lunarcharged',
    'reaction.lunarcrystallize',
    'reaction.stellarswirl_anemo',
    'reaction.stellarswirl_vortex_1',
    'reaction.stellarswirl_vortex_2',
]);

export function compareScenario(scenarioId, actual, recorded) {
    const mismatches = [];
    if (recorded && Object.prototype.hasOwnProperty.call(recorded, 'error')) {
        if (!actual || !Object.prototype.hasOwnProperty.call(actual, 'error')) {
            mismatches.push(scenarioId + " | expected error " + JSON.stringify(recorded.error) + ", got success");
        } else if (actual.error !== recorded.error) {
            mismatches.push(scenarioId + " | error mismatch expected=" + JSON.stringify(recorded.error) + " actual=" + JSON.stringify(actual.error));
        }
        return mismatches;
    }
    if (actual && Object.prototype.hasOwnProperty.call(actual, 'error')) {
        mismatches.push(scenarioId + " | unexpected error " + JSON.stringify(actual.error) + ", expected success");
        return mismatches;
    }
    const recordedStats = (recorded && recorded.stats) || {};
    const actualStats = (actual && actual.stats) || {};
    for (const key of Object.keys(recordedStats).sort()) {
        // Obsolete party metadata is replaced by live member stat reads.
        if (key === 'party_burst_energy_cost') continue;
        if (!Object.prototype.hasOwnProperty.call(actualStats, key)) {
            mismatches.push(scenarioId + " | stat " + key + " expected=" + recordedStats[key] + " actual=<missing>");
        } else if (!numbersClose(actualStats[key], recordedStats[key])) {
            mismatches.push(scenarioId + " | stat " + key + " expected=" + recordedStats[key] + " actual=" + actualStats[key]);
        }
    }
    for (const key of Object.keys(actualStats).sort()) {
        if (/^m\d+__/.test(key) || key === 'party_burst_energy_cost') continue;
        if (!Object.prototype.hasOwnProperty.call(recordedStats, key)) {
            if (Math.abs(actualStats[key]) >= ZERO_THRESHOLD) {
                mismatches.push(scenarioId + " | stat " + key + " expected=<unrecorded> actual=" + actualStats[key]);
            }
        }
    }
    const recordedFeatures = (recorded && recorded.features) || {};
    const actualFeatures = (actual && actual.features) || {};
    for (const name of Object.keys(recordedFeatures).sort()) {
        if (!Object.prototype.hasOwnProperty.call(actualFeatures, name)) {
            mismatches.push(scenarioId + " | feature " + name + " expected=present actual=<missing>");
            continue;
        }
        for (const field of ['normal', 'crit', 'average']) {
            const expected = recordedFeatures[name][field];
            const value = actualFeatures[name][field];
            if (!numbersClose(value, expected)) {
                mismatches.push(scenarioId + " | feature " + name + "." + field + " expected=" + expected + " actual=" + value);
            }
        }
    }
    for (const name of Object.keys(actualFeatures).sort()) {
        if (!Object.prototype.hasOwnProperty.call(recordedFeatures, name) && !UNRECORDED_FEATURES.has(name)) {
            const value = actualFeatures[name];
            const nonZero = ['normal', 'crit', 'average'].some((field) => {
                return typeof value[field] === 'number' && Math.abs(value[field]) >= ZERO_THRESHOLD;
            });
            if (nonZero) {
                mismatches.push(scenarioId + " | feature " + name + " expected=<unrecorded> actual=" + JSON.stringify(value));
            }
        }
    }
    return mismatches;
}

function findResonanceRequirement(cond) {
    const elements = new Set();
    const visit = (node, seen) => {
        if (!node || seen.has(node)) return;
        seen.add(node);
        if (node.constructor && node.constructor.name === 'ConditionResonance' && node.params && node.params.element) {
            elements.add(node.params.element);
        }
        const nested = [];
        if (node.params) {
            if (node.params.condition) nested.push(node.params.condition);
            if (node.params.subConditions) nested.push(...node.params.subConditions);
            if (node.params.hideCondition) nested.push(...node.params.hideCondition);
        }
        if (node.items) nested.push(...node.items);
        for (const item of nested) visit(item, seen);
    };
    visit(cond, new Set());
    return [...elements];
}

function requiresMoonsign(cond) {
    let found = false;
    const visit = (node, seen) => {
        if (!node || found || seen.has(node)) return;
        seen.add(node);
        if (node.params && node.params.setting === 'party_moonsign') found = true;
        const nested = [];
        if (node.params) {
            if (node.params.condition) nested.push(node.params.condition);
            if (node.params.subConditions) nested.push(...node.params.subConditions);
            if (node.params.hideCondition) nested.push(...node.params.hideCondition);
        }
        if (node.items) nested.push(...node.items);
        for (const item of nested) visit(item, seen);
    };
    visit(cond, new Set());
    return found;
}

function requiresHexerei(cond) {
    let found = false;
    const visit = (node, seen) => {
        if (!node || found || seen.has(node)) return;
        seen.add(node);
        const name = node.constructor ? node.constructor.name : '';
        if (name === 'ConditionHexereiResonance' || name === 'ConditionWitchHomework') found = true;
        const nested = [];
        if (node.params) {
            if (node.params.condition) nested.push(node.params.condition);
            if (node.params.subConditions) nested.push(...node.params.subConditions);
            if (node.params.hideCondition) nested.push(...node.params.hideCondition);
        }
        if (node.items) nested.push(...node.items);
        for (const item of nested) visit(item, seen);
    };
    visit(cond, new Set());
    return found;
}

function requiresSettingName(cond, settingName) {
    let found = false;
    const visit = (node, seen) => {
        if (!node || found || seen.has(node)) return;
        seen.add(node);
        if (node.params && node.params.name === settingName) found = true;
        const nested = [];
        if (node.params) {
            if (node.params.condition) nested.push(node.params.condition);
            if (node.params.subConditions) nested.push(...node.params.subConditions);
            if (node.params.hideCondition) nested.push(...node.params.hideCondition);
        }
        if (node.items) nested.push(...node.items);
        for (const item of nested) visit(item, seen);
    };
    visit(cond, new Set());
    return found;
}

function firstCharsWithElement(element, excludeKeys, count) {
    const result = [];
    for (const key of getCharKeys()) {
        if (excludeKeys.includes(key)) continue;
        if (DB.Chars.get(key).element === element) {
            result.push(key);
            if (result.length >= count) break;
        }
    }
    return result;
}

function firstCharsWithOrigin(origin, excludeKeys, count) {
    const result = [];
    for (const key of getCharKeys()) {
        if (excludeKeys.includes(key)) continue;
        if (DB.Chars.get(key).origin === origin) {
            result.push(key);
            if (result.length >= count) break;
        }
    }
    return result;
}

function firstHexereiChars(excludeKeys, count) {
    const capable = ['Durin', 'Venti', 'Albedo', 'Mona', 'Klee', 'Sucrose', 'Razor', 'Fischl', 'Varka', 'Lohen', 'Nicole', 'Prune'];
    const capableSet = new Set(capable.map((name) => name.toLowerCase()));
    const result = [];
    for (const key of getCharKeys()) {
        if (excludeKeys.includes(key)) continue;
        if (capableSet.has(key.toLowerCase())) {
            result.push(key);
            if (result.length >= count) break;
        }
    }
    return result;
}

function partyWitchHomeworkSettings(partyKeys) {
    const settings = {};
    for (const key of partyKeys) {
        const char = DB.Chars.get(key);
        if (!char) continue;
        for (const cond of Condition.unwrap(char.getAllConditions())) {
            const name = cond.getName ? cond.getName() : null;
            if (name && name.endsWith('_witch_homework') && cond.getType() === 'checkbox') {
                settings[name] = true;
            }
        }
    }
    return settings;
}

// Sibling refinement for PartyWeapon stat/mode leaves: the numeric or mode
// leaf only produces its post-effect when the matching refinement leaf is set.
const PARTY_WEAPON_SIBLINGS = [
    {level: 'weapon_other.desert_pavilion', stat: 'desert_pavilion_mastery'},
    {level: 'weapon_other.desert_pavilion_2', stat: 'desert_pavilion_mastery_2'},
    {level: 'weapon_other.desert_pavilion_3', stat: 'desert_pavilion_mastery_3'},
    {level: 'weapon_other.weapon_key_of_khaj_nisut', stat: 'sunken_song_of_the_sands_hp'},
    {level: 'weapon_other.weapon_key_of_khaj_nisut_2', stat: 'sunken_song_of_the_sands_hp_2'},
    {level: 'weapon_other.weapon_key_of_khaj_nisut_3', stat: 'sunken_song_of_the_sands_hp_3'},
    {level: 'weapon_other.whisper_of_the_jinn', stat: 'whisper_of_the_jinn_mastery'},
    {level: 'weapon_other.whisper_of_the_jinn_2', stat: 'whisper_of_the_jinn_mastery_2'},
    {level: 'weapon_other.whisper_of_the_jinn_3', stat: 'whisper_of_the_jinn_mastery_3'},
    {level: 'weapon_other.weapon_peak_patrol_song', stat: 'peak_patrol_song_def'},
    {level: 'weapon_other.weapon_angelos_heptades', stat: 'angelos_heptades_atk', mode: 'weapon_other.weapon_angelos_heptades_mode'},
    {level: 'weapon_other.weapon_hymn_of_the_maelstrom', stat: 'weapon_hymn_of_the_maelstrom_holder_hp', mode: 'weapon_other.weapon_hymn_of_the_maelstrom_mode'},
];

export function buffPrerequisiteSettings(targetCond) {
    const settings = {};
    const name = targetCond.getName();
    for (const family of PARTY_WEAPON_SIBLINGS) {
        if (name === family.stat && family.level) {
            settings[family.level] = 5;
        }
        if (name === family.mode && family.level) {
            settings[family.level] = 5;
        }
    }
    if (requiresSettingName(targetCond, 'polestar_field')) {
        settings['polestar_field'] = true;
    }
    return settings;
}

export function buffPartyForCondition(targetCond, receiverKey) {
    // Returns {partyKeys, extraSettings} needed to make the condition active.
    // Empty when the condition is already active without a party.
    const elements = findResonanceRequirement(targetCond);
    if (elements.length) {
        const element = elements.sort()[0];
        const receiverElement = DB.Chars.get(receiverKey).element;
        const needed = receiverElement === element ? 1 : 2;
        const party = firstCharsWithElement(element, [receiverKey], needed);
        return {partyKeys: party, extraSettings: {}};
    }
    if (requiresMoonsign(targetCond)) {
        return {partyKeys: firstCharsWithOrigin('nodkrai', [receiverKey], 2), extraSettings: {}};
    }
    if (requiresHexerei(targetCond)) {
        const party = firstHexereiChars([receiverKey], 2);
        return {partyKeys: party, extraSettings: partyWitchHomeworkSettings(party)};
    }
    return {partyKeys: [], extraSettings: {}};
}

export function makeSetArtifacts(setId) {
    const set = DB.Artifacts.Sets.get(setId);
    const rarity = set.maxRarity;
    const level = DB.Artifacts.Rarity[rarity - 1].maxLevel;
    const desired = [
        {slot: 'flower', mainStat: 'hp'},
        {slot: 'plume', mainStat: 'atk'},
        {slot: 'sands', mainStat: 'atk_percent'},
        {slot: 'goblet', mainStat: 'dmg_pyro'},
        {slot: 'circlet', mainStat: 'crit_rate'},
    ];
    const artifacts = [];
    for (const item of desired) {
        if (!set.canEquipSlot(item.slot)) {
            continue;
        }
        artifacts.push(new Artifact(rarity, level, item.slot, setId, item.mainStat, []));
    }
    return artifacts;
}
