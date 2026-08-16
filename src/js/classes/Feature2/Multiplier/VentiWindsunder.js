import { BuildData } from "../../Build/Data";
import { FeatureMultiplier } from "../Multiplier";

export class FeatureMultiplierVentiWindsunder extends FeatureMultiplier {
    constructor(data) {
        super(data);
        this.windsunderValues = data.windsunderValues;
        this.scalingSource = 'windsunder_arrow';
    }

    /**
     * @param {BuildData} data
     * @returns {number}
     */
    getScalingMultiplier(data) {
        let isActive = !this.scalingMultiplierCondition || this.scalingMultiplierCondition.isActive(data.settings);
        if (isActive) {
            let level = data.settings.getLevel(this.leveling) || 1;
            return this.windsunderValues.getValue(level) / 100;
        }
        return 1;
    }
}
