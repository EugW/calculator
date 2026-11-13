import { CSum } from "../../Feature2/Compile/Types/Block";
import { PostEffectStats } from "../Stats";
import { teamStatItems } from "../../Team/TeamStats";

export class PostEffectPartyEnergy extends PostEffectStats {
    getBaseReadStats() {
        return ['burst_energy_cost'];
    }

    getBaseValueTree(data, opts) {
        return new CSum(teamStatItems('burst_energy_cost', data));
    }
}
