import { BuildData } from "../../Build/Data";
import { FeatureMultiplier } from "../Multiplier";

export class FeatureMultiplierVarkaA1 extends FeatureMultiplier {
    /**
     * @param {BuildData} data
     * @returns {number}
     */
    getScalingMultiplier(data) {
        let a1Mult = 1.0;

        let isActive = !this.scalingMultiplierCondition || this.scalingMultiplierCondition.isActive(data.settings);
        if (isActive && data.settings.party_varka_priority_element_str) {
            let counts = {
                pyro: 0,
                hydro: 0,
                electro: 0,
                cryo: 0,
                anemo: 1, // Varka himself
            };

            for (const name of ['resonance_element_1', 'resonance_element_2', 'resonance_element_3']) {
                const element = data.settings[name] || '';
                if (counts[element] !== undefined) {
                    counts[element]++;
                }
            }

            let has2Anemo = counts.anemo >= 2;
            let selectedElement = data.settings.party_varka_priority_element_str;
            let has2Selected = counts[selectedElement] >= 2;

            if (has2Anemo && has2Selected) {
                a1Mult = 2.2;
            } else if (has2Anemo || has2Selected) {
                a1Mult = 1.4;
            }
        }

        let c1Mult = 1.0;
        if (data.settings['varka_lyrical_libation']) {
            c1Mult = 2.0;
        }

        if (this.scalingSource === 'varka_a1_c1_multiplier') {
            return a1Mult * c1Mult;
        }
        
        return a1Mult;
    }
}
