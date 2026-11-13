import { CConst } from "../../Feature2/Compile/Types/Item";
import { PostEffectStats } from "../Stats";

export class PostEffectStatsStatic extends PostEffectStats {
    getBaseReadStats() {
        return [];
    }

    getBaseValueTree(data, opts) {
        return new CConst({value: 1});
    }
}
