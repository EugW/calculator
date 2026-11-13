import { CConst } from "../Compile/Types/Item";
import { FeatureMultiplierStellarGlimmer } from "./StellarGlimmer";
import { teamSettings } from "../../Team/Scope";

export class FeatureMultiplierStellarConduct extends FeatureMultiplierStellarGlimmer {
    static getSubtype() {
        return 'stellarconduct';
    }

    static getHitCount(data) {
        // A feature's own count, or the hits the team's Polestar Field includes.
        let hasDirectValue = Object.prototype.hasOwnProperty.call(data.settings, 'stellarconduct_hit_count');
        let value = hasDirectValue
            ? data.settings.getNumber('stellarconduct_hit_count')
            : Number(teamSettings(data.settings).polestar_included_hits);
        value ||= 0;

        return Math.max(0, Math.min(12, value));
    }

    static baseMultiplier(data) {
        let hits = this.getHitCount(data);
        let value = hits ? 1.4 + 0.05 * hits : 1;

        return new CConst({
            value: value,
            percent: true,
            comment: 'stellarconduct_base',
        });
    }

}
