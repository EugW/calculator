import { PostEffectStats } from "../Stats";

export class PostEffectStatsRecharge extends PostEffectStats {
    getBaseReadStats() {
        return ['recharge*'];
    }

    getBaseValueTree(data, opts) {
        return this.statTotalItem('recharge', data);
    }
}
