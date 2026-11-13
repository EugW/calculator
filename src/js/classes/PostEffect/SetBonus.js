import { CPostEffect } from "../Feature2/Compile/Types/Block";
import { CConst } from "../Feature2/Compile/Types/Item";
import { PostEffect, PRIORITIES } from "../PostEffect";
import { Stats } from "../Stats";
import { programStatName } from "../Team/EnemyStats";
import { CHANNELS } from "./Channels";

export class PostEffectSetBonus extends PostEffect {
    getFixedStage() {
        return PRIORITIES.SET_BONUS;
    }

    /**
     * @returns {string} set bonuses are ordinary stats: premod
     */
    getWrites() {
        return CHANNELS.PREMOD;
    }

    getWriteStats() {
        return Object.keys(this.params.stats || {});
    }

    getData(stats, settings) {
        if (!this.isActive(settings)) {
            return new Stats();
        }

        return new Stats(this.params.stats);
    }

    getTree(data, opts) {
        opts = Object.assign({}, opts);

        let result = [];
        let stats = this.getData(data.stats, data.settings);
        stats.processPercent();

        for (let stat of Object.keys(stats)) {
            let item = new CConst({
                value: stats.get(stat),
            });

            result.push(new CPostEffect([item], {
                stat: programStatName(stat),
                priority: this.getPriority(),
            }));
        }

        return result;
    }
}
