import { FeatureDamage } from "../Damage";

export class FeatureDamageOther extends FeatureDamage {
    constructor(params) {
        params.category ||= 'other';
        super(params);

        this.damageType = '';
    }
}
