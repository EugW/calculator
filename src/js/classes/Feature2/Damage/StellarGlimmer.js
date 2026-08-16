import { BuildData } from "../../Build/Data";
import { CBaseDamage, CFlatDamage, CMulti, CMultiplierResistance, CSum } from "../Compile/Types/Block";
import { CDamage } from "../Compile/Types/Damage";
import { FeatureDamage } from "../Damage";

/** Shared direct-damage ordering for both Stellar Glimmer subtypes. */
export class FeatureDamageStellarGlimmer extends FeatureDamage {
    constructor(params) {
        params.cannotReact = true;
        params.tags = (params.tags || []).filter((tag) => ![
            'stellarglimmer_trigger',
            'stellarconduct_trigger',
            'stellarswirl_trigger',
        ].includes(tag));

        for (let tag of ['stellarglimmer_direct', params.damageType + '_direct']) {
            if (!params.tags.includes(tag)) {
                params.tags.push(tag);
            }
        }

        super(params);
    }

    getStellarMultiplierClass() {
        throw new Error('Define the Stellar Glimmer multiplier class');
    }

    /** Stellar damage does not use ordinary elemental/category DMG buckets. */
    getStatsDmgBonus(data) {
        return [];
    }

    getStatsCritRate(data) {
        let result = this.getDefaultStatsCritRate(data);
        result.push('crit_rate_stellarglimmer');
        return result;
    }

    getStatsCritDamage(data) {
        let result = this.getDefaultStatsCritDamage(data);
        result.push('crit_dmg_stellarglimmer');
        return result;
    }

    getBaseMultipliers(data) {
        let multipliers = [];
        for (let item of this.multipliers) {
            if (!item.isActive(data)) continue;
            multipliers.push(item);
        }
        return multipliers;
    }

    isFlatDamageMultiplier(item) {
        if (!item.target || !item.target.options.length) {
            return false;
        }

        let Multiplier = this.getStellarMultiplierClass();
        return Multiplier.flatOptions().some((option) => item.isMatchOption(option));
    }

    getFlatDamageMultipliers(data) {
        let result = [];
        for (let item of data.multipliers) {
            if (!this.isFlatDamageMultiplier(item)) continue;
            if (!item.isActive(data)) continue;
            if (!item.isMatchFeature(this, data)) continue;
            result.push(item);
        }
        return result;
    }

    /**
     * talent base * base bonus * (EM + additive), then flat Quills, then
     * resistance/CRIT/elevation. Stellar damage intentionally has no DEF term.
     *
     * @param {BuildData} data
     * @returns {CItem}
     */
    getTree(data) {
        let Multiplier = this.getStellarMultiplierClass();
        let multipliers = this.getBaseMultipliers(data);

        for (let item of data.multipliers) {
            if (this.isFlatDamageMultiplier(item)) continue;
            if (!item.isActive(data)) continue;
            if (!item.isMatchFeature(this, data)) continue;
            multipliers.push(item);
        }

        let base = new CMulti([
            Multiplier.baseMultiplier(data),
            new CBaseDamage(
                multipliers.map((item) => item.getTree(data))
            ),
            Multiplier.baseBonusMultiplier(data),
            Multiplier.damageBonusMultiplier(data, this.damageBonuses),
        ], {group: true});

        let flatMultipliers = this.getFlatDamageMultipliers(data);
        if (flatMultipliers.length) {
            base = new CSum([
                base,
                new CFlatDamage(
                    flatMultipliers.map((item) => item.getTree(data))
                ),
            ], {group: true});
        }

        base = new CMulti([
            base,
            new CMultiplierResistance([this.getResistanceMultiplier(data)]),
            Multiplier.elevationMultiplier(data),
        ], {group: true});

        return new CDamage([base], {
            critRate: this.getCritRateBlock(data),
            critDmg: this.getCritDmgBlock(data),
        });
    }
}
