import { CMax } from "../../Feature2/Compile/Types/Block";
import { teamStatTotalItems } from "../../Team/TeamStats";
import { CHANNELS } from "../Channels";
import { PostEffectStats } from "../Stats";

/**
 * Nahida's A1: a share of "the Elemental Mastery of the party member with
 * the highest Elemental Mastery".
 */
export class PostEffectStatsNahida extends PostEffectStats {
    getBaseReadStats() {
        return ['mastery*'];
    }

    getBaseValueTree(data, opts) {
        return new CMax(teamStatTotalItems('mastery', data, this.getReads() == CHANNELS.PREMOD));
    }
}
