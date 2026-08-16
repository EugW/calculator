import { makeStatItem, makeStatTotalItem } from "../Compile/Helpers";
import { CDivide, CMulti, CSum, CSumPlusOne } from "../Compile/Types/Block";
import { CConst } from "../Compile/Types/Item";

/**
 * Shared formula buckets for Stellar-Conduct and Stellar Swirl.
 * Stellar Glimmer is an umbrella stat family, not a separate damage type.
 */
export class FeatureMultiplierStellarGlimmer {
    static getSubtype() {
        throw new Error('Define the Stellar Glimmer subtype');
    }

    static masteryMultiplier(data) {
        return new CMulti([
            new CConst({value: 6}),
            new CDivide([
                makeStatTotalItem('mastery', data.stats),
                new CSum([
                    makeStatTotalItem('mastery', data.stats),
                    new CConst({value: 2000}),
                ]),
            ]),
        ], {percent: true, comment: 'stellarglimmer_mastery'});
    }

    static baseBonusMultiplier(data) {
        let subtype = this.getSubtype();

        return new CSumPlusOne([
            makeStatItem('stellarglimmer_multi', data.stats),
            makeStatItem(subtype + '_multi', data.stats),
        ], {percent: true, comment: subtype + '_base_bonus'});
    }

    static damageBonusMultiplier(data, damageBonuses) {
        let subtype = this.getSubtype();
        damageBonuses ||= [];

        return new CSumPlusOne([
            this.masteryMultiplier(data),
            makeStatItem('dmg_stellarglimmer', data.stats),
            makeStatItem('dmg_' + subtype, data.stats),
            ...damageBonuses.map((stat) => makeStatItem(stat, data.stats)),
        ], {percent: true, comment: subtype + '_dmg_bonus'});
    }

    static elevationMultiplier(data) {
        let subtype = this.getSubtype();

        return new CSumPlusOne([
            makeStatItem('dmg_stellarglimmer_special', data.stats),
            makeStatItem('dmg_' + subtype + '_special', data.stats),
        ], {percent: true, comment: subtype + '_special'});
    }

    static flatOptions() {
        return ['stellarglimmer_flat', this.getSubtype() + '_flat'];
    }
}
