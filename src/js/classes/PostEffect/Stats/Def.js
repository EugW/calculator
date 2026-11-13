import { PostEffectStats } from "../Stats";

export class PostEffectStatsDef extends PostEffectStats {
    getBaseReadStats() {
        return ['def*'];
    }

    getBaseValueTree(data, opts) {
        return this.statTotalItem('def', data);
    }
}
