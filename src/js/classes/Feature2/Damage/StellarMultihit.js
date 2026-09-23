import { CBaseDamage, CFlatDamage, CMulti, CMultiplierResistance, CSum } from "../Compile/Types/Block";
import { CDamage } from "../Compile/Types/Damage";
import { FeatureDamageStellarGlimmer } from "./StellarGlimmer";
import { FeatureMultiplierStellarConduct } from "../Multiplier/StellarConduct";
import { FeatureMultiplierStellarSwirl } from "../Multiplier/StellarSwirl";

/**
 * A two-or-more-hit direct Stellar Glimmer feature.
 *
 * FeatureDamageMultihit cannot be used here because it applies the ordinary
 * damage buckets.  This keeps the multihit behavior local to Stellar damage
 * without changing the ordinary/base damage classes.
 */
export class FeatureDamageStellarMultihit extends FeatureDamageStellarGlimmer {
    /**
     * @returns {boolean}
     */
    hasDetails() {
        return false;
    }

    /**
     * @param {BuildData} data
     * @returns {Function}
     */
    getTree(data) {
        const Multiplier = this.getStellarMultiplierClass();
        const hits = [];

        for (const hit of this.items) {
            const multipliers = this.getBaseMultipliers(data);

            // Apply the same feature-targeted post multipliers as a regular
            // Stellar hit (e.g. character/party effects).  Flat Stellar
            // additions are handled separately below so they are inserted
            // after the base and additive multiplier buckets.
            for (const item of data.multipliers) {
                if (this.isFlatDamageMultiplier(item)) continue;
                if (!item.isActive(data)) continue;
                if (!item.isMatchFeature(this, data)) continue;
                multipliers.push(item);
            }

            for (const item of hit.multipliers || []) {
                if (item.isActive(data)) {
                    multipliers.push(item);
                }
            }

            let base = new CMulti([
                Multiplier.baseMultiplier(data),
                new CBaseDamage(
                    multipliers.map(item => item.getTree(data)),
                ),
                Multiplier.baseBonusMultiplier(data),
                Multiplier.damageBonusMultiplier(data, this.damageBonuses),
            ], {group: true});

            const flatMultipliers = this.getFlatDamageMultipliers(data);
            if (flatMultipliers.length) {
                base = new CSum([
                    base,
                    new CFlatDamage(
                        flatMultipliers.map(item => item.getTree(data)),
                    ),
                ], {group: true});
            }

            hits.push(new CMulti([
                base,
                new CMultiplierResistance([this.getResistanceMultiplier(data)]),
                Multiplier.elevationMultiplier(data),
            ]));
        }

        return new CDamage([new CSum(hits)], {
            critRate: this.getCritRateBlock(data),
            critDmg: this.getCritDmgBlock(data),
        });
    }
}

export class FeatureDamageStellarConductMultihit extends FeatureDamageStellarMultihit {
    constructor(params) {
        params.damageType ||= 'stellarconduct';
        super(params);
    }

    getStellarMultiplierClass() {
        return FeatureMultiplierStellarConduct;
    }
}

export class FeatureDamageStellarSwirlMultihit extends FeatureDamageStellarMultihit {
    constructor(params) {
        params.damageType ||= 'stellarswirl';
        super(params);
    }

    getStellarMultiplierClass() {
        return FeatureMultiplierStellarSwirl;
    }
}
