import { makeStatItem } from "../../Feature2/Compile/Helpers";
import { CDivide, CIfGreater } from "../../Feature2/Compile/Types/Block";
import { CConst } from "../../Feature2/Compile/Types/Item";
import { PostEffectStats } from "../Stats";

export class PostEffectStatsNeuvillette extends PostEffectStats {
    getBaseReadStats() {
        return [this.params.from, 'hp*'];
    }

    getBaseValueTree(data, opts) {
        return new CIfGreater([
            makeStatItem(this.params.from, data.stats),
            new CConst({value: 100}),
            new CDivide([
                makeStatItem(this.params.from, data.stats),
                new CDivide([
                    this.statTotalItem('hp', data),
                    new CConst({value: 100}),
                ]),
            ]),
            makeStatItem(this.params.from, data.stats)
        ]);
    }
}
