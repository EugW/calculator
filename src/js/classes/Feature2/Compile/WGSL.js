/**
 * WGSL Code Generation Utilities
 * Provides compilation of CBlock/CItem trees to WebGPU Shading Language
 */

// Stat name to array index mapping (built at preparation time)
let statIndexMap = {};
let statIndexCounter = 0;

/**
 * Reset stat index mapping for new compilation session
 */
export function resetStatIndices() {
    statIndexMap = {};
    statIndexCounter = 0;
}

/**
 * Get or create index for a stat name
 * @param {string} stat - Stat name
 * @returns {number} - Array index for this stat
 */
export function getStatIndex(stat) {
    if (statIndexMap[stat] === undefined) {
        statIndexMap[stat] = statIndexCounter++;
    }
    return statIndexMap[stat];
}

/**
 * Get the full stat index mapping
 * @returns {Object} - Map of stat name to index
 */
export function getStatIndexMap() {
    return { ...statIndexMap };
}

/**
 * Get total number of stats used
 * @returns {number}
 */
export function getStatCount() {
    return statIndexCounter;
}

/**
 * Build stat index map from list of used stats
 * @param {string[]} usedStats - Array of stat names
 * @returns {Object} - Map of stat name to index
 */
export function buildStatIndexMap(usedStats) {
    resetStatIndices();
    for (const stat of usedStats) {
        getStatIndex(stat);
    }
    return getStatIndexMap();
}

// Variable name counter for WGSL (similar to JS variableName helper)
let wgslVarCounter = 0n;

/**
 * Generate unique WGSL variable name
 * @param {string} suffix - Optional suffix for readability
 * @returns {string}
 */
export function wgslVariableName(suffix) {
    return (suffix || 'v') + '_' + (++wgslVarCounter);
}

/**
 * Reset WGSL variable counter
 */
export function resetWGSLVariables() {
    wgslVarCounter = 0n;
}

/**
 * WGSL compilation options
 * @typedef {Object} WGSLCompileOptions
 * @property {Object} statIndex - Map of stat name to array index
 * @property {boolean} [useF32=true] - Legacy option metadata; production WGSL is fixed to f32
 * @property {string} [statsVar='stats'] - Name of stats array variable
 */

/**
 * Default WGSL compilation options
 * @returns {WGSLCompileOptions}
 */
export function defaultWGSLOptions() {
    return {
        statIndex: {},
        useF32: true,
        statsVar: 'stats',
    };
}

/**
 * Format a number as WGSL literal
 * @param {number} value
 * @param {WGSLCompileOptions} opts
 * @returns {string}
 */
export function wgslNumber(value, opts) {
    if (Number.isInteger(value) && Math.abs(value) < 1000000) {
        return value.toFixed(1);
    }
    // Ensure proper float formatting
    const str = value.toString();
    if (!str.includes('.') && !str.includes('e')) {
        return str + '.0';
    }
    return str;
}

/**
 * Generate WGSL stat access expression
 * @param {string} stat - Stat name
 * @param {WGSLCompileOptions} opts
 * @returns {string}
 */
export function wgslStatAccess(stat, opts) {
    const index = opts.statIndex[stat];
    if (index === undefined) {
        throw new Error(`Stat "${stat}" not found in statIndex map`);
    }
    return `${opts.statsVar}[${index}u]`;
}

/**
 * WGSL code wrapper for a variation function
 * @param {number} variationId
 * @param {string} bodyCode
 * @param {Object} opts
 * @returns {string}
 */
export function wrapVariationFunction(variationId, bodyCode, opts) {
    return `
fn eval_v${variationId}(stats: ptr<function, array<f32, ${opts.statCount}>>) -> vec3<f32> {
${bodyCode}
}`;
}

/**
 * Generate the dispatch switch statement
 * @param {number[]} variationIds
 * @returns {string}
 */
export function generateDispatchSwitch(variationIds) {
    const cases = variationIds.map(id =>
        `        case ${id}u: { return eval_v${id}(stats); }`
    ).join('\n');

    return `
fn dispatch_variation(variation: u32, stats: ptr<function, array<f32, STAT_COUNT>>) -> vec3<f32> {
    switch (variation) {
${cases}
        default: { return eval_v0(stats); }
    }
}`;
}
