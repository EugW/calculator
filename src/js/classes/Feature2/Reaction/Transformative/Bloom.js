import { FeatureReactionTransformative } from "../Transformative";
import { makeStatItem } from "../../Compile/Helpers";
import { CMin } from "../../Compile/Types/Block";
import { CConst } from "../../Compile/Types/Item";
import { CCritDmg } from "../../Compile/Types/Damage";

export class FeatureReactionBloom extends FeatureReactionTransformative {
    getReactionRate() { return 2; }

    /**
     * @returns {Array.<string>}
     */
    getStatsReactionBonus() {
        let result = super.getStatsReactionBonus();
        result.push('dmg_reaction_bloom');
        return result;
    }

    /**
     * @returns {Array.<string>}
     */
    getStatsCritRate() {
        let result = super.getStatsCritRate();
        result.push('crit_rate_bloom');
        return result;
    }

    /**
     * @returns {Array.<string>}
     */
    getStatsCritDamage() {
        let result = super.getStatsCritDamage();
        result.push('crit_dmg_bloom');
        return result;
    }

    getCritDmgBlock(data) {
        let items = this.getStatsCritDamage(data).map((stat) => {
            let item = makeStatItem(stat, data.stats);
            if (stat === 'crit_dmg_bloom') {
                return new CMin([
                    item,
                    new CConst({value: 1, comment: 'bloom_crit_dmg_cap', percent: true}),
                ]);
            }
            return item;
        });
        if (items.length == 0) {
            items = [new CConst({value: 0})];
        }
        return new CCritDmg(items);
    }
}
