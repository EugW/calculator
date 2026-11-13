import { PostEffectStats } from "../Stats";

export class PostEffectStatsHP extends PostEffectStats {
    getBaseReadStats() {
        return ['hp*'];
    }

    getBaseValueTree(data, opts) {
        return this.statTotalItem('hp', data);
    }
}
