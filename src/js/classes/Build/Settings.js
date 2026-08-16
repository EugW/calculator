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

    // Mizuki and Vesna expose only the Swirl switch. Polestar Field is their
    // competing Conduct state, so it receives the same persistent priority.
    if (settings.polestar_field) {
        if (settings.mizuki_radiance_stellarswirl) {
            settings.mizuki_radiance_stellarswirl = false;
        }
        if (settings.vesna_radiance_stellarswirl) {
            settings.vesna_radiance_stellarswirl = false;
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
