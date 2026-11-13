import { PostEffectStats } from "../Stats";

export class PostEffectStatsMastery extends PostEffectStats {
    getBaseReadStats() {
        return ['mastery*'];
    }

    getBaseValueTree(data, opts) {
        return this.statTotalItem('mastery', data);
    }
}
