export class BuildSettings {
    constructor(data) {
        Object.assign(this, data);
        normalizeRadianceStellarGlimmer(this);
    }

    /**
     * @param {string} name
     * @param {string|number} value
     */
    set(name, value) {
        this[name] = value;
        normalizeRadianceStellarGlimmer(this);
    }

    /**
     * @param {string} name
     * @returns {string|number}
     */
    get(name) {
        return this[name];
    }

    /**
     * @param {string} name
     * @returns {string|number}
     */
    getNumber(name) {
        return this[name] || 0;
    }

    /**
     * @param {BuildSettings} settings
     */
    concat() {
        for (let item of arguments) {
            Object.assign(this, item);
        }
        sumBySource(this, arguments);
        normalizeRadianceStellarGlimmer(this);
    }

    /**
     * Get talent level with bonuses
     * @param {string} name
     * @returns {number}
     */
    getLevel(name) {
        return getSkillLevelByName(name, this);
    }
}

/**
 * Talent level bonuses members give (`char_skill_*_bonus_2`, see
 * getSkillLevelByName) add up, one per source: two teammates that each give
 * +1 give +2. Each source's bonus is kept under its source
 * (`char_skill_elemental_bonus_2@<char ID>`, keyBySource) and the setting
 * itself holds their sum. A source's bonus applied again replaces its own
 * part, so evaluation rounds that apply it again never count it twice.
 */
const SUMMED = /^char_skill_\w+_bonus_2$/;
const SUMMED_PART = /^(char_skill_\w+_bonus_2)@\d+$/;

/**
 * @param {Object} settings settings a condition gives
 * @param {number} sourceId character ID of the member they come from
 * @returns {Object} the settings, with the summed ones keyed by their source
 */
export function keyBySource(settings, sourceId) {
    let result = null;
    for (const name of Object.keys(settings || {})) {
        if (!SUMMED.test(name)) continue;

        result ||= Object.assign({}, settings);
        result[name + '@' + sourceId] = settings[name];
        delete result[name];
    }
    return result || settings;
}

/**
 * Sum the sources' parts of every summed setting the items changed.
 *
 * @param {Object} settings
 * @param {Array.<Object>} items settings just assigned
 */
function sumBySource(settings, items) {
    let names = null;
    for (const item of items) {
        for (const name of Object.keys(item || {})) {
            const match = SUMMED_PART.exec(name);
            if (match) (names ||= new Set()).add(match[1]);
        }
    }
    if (!names) return;

    for (const name of names) {
        let total = 0;
        for (const key of Object.keys(settings)) {
            if (key.startsWith(name + '@')) total += Number(settings[key]) || 0;
        }
        settings[name] = total;
    }
}

/**
 * Resolve paired Stellar Glimmer Radiance checkboxes as one exclusive state.
 * The condition names follow the shared mode-suffix convention and retain
 * their serialize IDs. If both flags are present, Stellar-Conduct wins.
 */
export function normalizeRadianceStellarGlimmer(settings) {
    for (let name of Object.keys(settings)) {
        let match = /^(.*radiance_)stellarconduct$/.exec(name);
        if (!match || !settings[name]) continue;

        let swirlName = match[1] + 'stellarswirl';
        if (settings[swirlName]) {
            settings[swirlName] = false;
        }
    }

    return settings;
}

/**
 * Member settings a team toggle overrides while it is on, in an evaluation's
 * copy: the member's own settings keep them. Mizuki and Vesna expose only
 * the Swirl switch; Polestar Field is their competing Conduct state and wins
 * as Conduct does.
 *
 * @param {Object} settings a member's settings in an evaluation, changed in place
 * @param {Object} team the team's toggles
 * @returns {Object} settings
 */
export function applyTeamOverrides(settings, team) {
    if (team.polestar_field) {
        for (const name of ['mizuki_radiance_stellarswirl', 'vesna_radiance_stellarswirl']) {
            if (settings[name]) {
                settings[name] = false;
            }
        }
    }

    return settings;
}

export function getSkillLevelByName(name, settings) {
    let result = settings[name] || 1;

    result += settings[name + '_bonus'] || 0;
    result += settings[name + '_bonus_2'] || 0;

    let match = /\w+_(char_skill_\w+)/.exec(name);
    if (match) {
        result += settings[match[1] +'_bonus_party'] || 0;
    }

    return result;
}
