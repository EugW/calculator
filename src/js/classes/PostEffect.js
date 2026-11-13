import { CHANNELS } from "./PostEffect/Channels";
import { derivedStage, registerPostEffect } from "./PostEffect/Stages";

/**
 * Fixed stages. Content never sets a stage: it declares what an effect reads
 * and writes (`reads`, `writes`: CHANNELS) and the stage is derived
 * (PostEffect/Stages). An explicit `priority` param remains for tests that
 * stage synthetic effects by hand.
 */
export const PRIORITIES = {
    PRE_STATS: 1,
    SET_BONUS: 1,
    STAT_LOCAL: 2,
    STAT_GLOBAL: 3,
};

export class PostEffect {
    /**
     * @param {Object} params
     * @param {string} [params.reads] CHANNELS: the premod or the total value
     *     of the stats it reads (default premod)
     * @param {string} [params.writes] CHANNELS: the premod or the extra part
     *     of the stats it writes (default total, the extra part)
     */
    constructor(params) {
        this.params = params;
        registerPostEffect(this);
    }

    isActive(settings) {
        if (this.params.condition) {
            return this.params.condition.isActive(settings);
        } else {
            // deprecated
            let conditions = this.params.conditions;

            if (conditions) {
                for (let i = 0; i < conditions.length; ++i) {
                    const cond = conditions[i];
                    if (!cond.isActive(settings)) {
                        return false;
                    }
                }
            }

            return true;
        }
    }

    getPriority() {
        return this.getFixedStage() || derivedStage(this);
    }

    /**
     * @returns {number|undefined} a stage not derived from reads and writes
     */
    getFixedStage() {
        return this.params.priority;
    }

    /**
     * @returns {string} CHANNELS: what its stat reads see
     */
    getReads() {
        if (this.params.reads) return this.params.reads;
        // A hand-staged test effect keeps the old meaning: from stage 3 on it
        // read the stats after every earlier stage.
        return this.getFixedStage() >= PRIORITIES.STAT_GLOBAL ? CHANNELS.TOTAL : CHANNELS.PREMOD;
    }

    /**
     * @returns {string} CHANNELS: which part of a stat it writes
     */
    getWrites() {
        if (this.params.writes) return this.params.writes;
        // A hand-staged test effect at stage 1 was seen by stage 2, as set
        // bonuses are.
        return this.getFixedStage() <= PRIORITIES.SET_BONUS ? CHANNELS.PREMOD : CHANNELS.TOTAL;
    }

    /**
     * @returns {Array.<string>} stats its value reads that other effects may
     *     write (ordering only; PostEffect/Stages)
     */
    getReadStats() {
        return [];
    }

    /**
     * @returns {Array.<string>} stats it writes (ordering only)
     */
    getWriteStats() {
        return [];
    }

    getLevel(settings) {
        let settingName = this.params.levelSetting;
        let result = settings[settingName] || 1;
        if (this.params.maxLevelSetting > 1) {
            result = Math.min(result, this.params.maxLevelSetting);
        }
        result += settings[settingName +'_bonus'] || 0;
        result += settings[settingName +'_bonus_2'] || 0;

        return result;
    }
}
