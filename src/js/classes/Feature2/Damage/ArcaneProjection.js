import { FeatureDamageOther } from "./Other";

export class FeatureDamageArcaneProjection extends FeatureDamageOther {
    constructor(params) {
        params.cannotReact = true;
        params.elementSetting ||= 'char_element';
        super(params);
    }

    /**
     * @param {BuildData} data
     * @returns {Array.<FeatureMultiplier>}
     */
    getMultipliers(data) {
        let multipliers = [];

        for (let item of this.multipliers) {
            if (!item.isActive(data)) continue;
            multipliers.push(item);
        }

        for (let item of data.multipliers) {
            if (!item.target || !item.target.tags.length) continue;
            if (!item.isActive(data)) continue;
            if (!item.isMatchFeature(this, data)) continue;
            multipliers.push(item);
        }

        return multipliers;
    }
}
