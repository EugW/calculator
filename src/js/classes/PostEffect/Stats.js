import { makeStatItem, makeStatPremodItem, makeStatTotalItem } from "../Feature2/Compile/Helpers";
import { CMulti, CPostEffect, CSubtract, CSum, CValueAboveZero, CValueCap } from "../Feature2/Compile/Types/Block";
import { CConst } from "../Feature2/Compile/Types/Item";
import { PostEffect } from "../PostEffect";
import { isPercent } from "../Stats";
import { programStatName } from "../Team/EnemyStats";
import { CHANNELS, hasExtraLane } from "./Channels";
import { markReadOnly } from "./Stages";

export class PostEffectStats extends PostEffect {
    constructor(params) {
        super(params);
        if (params.statCapPost) {
            // A cap's value only; never applied on its own.
            markReadOnly(params.statCapPost);
        }
    }

    /**
     * @returns {Array.<string>} the stat its base value reads (`from`, or the
     *     total its class reads), and what its cap reads
     */
    getReadStats() {
        let result = this.getBaseReadStats();
        if (this.params.statCapPost) {
            result = result.concat(this.params.statCapPost.getReadStats());
        }
        return result;
    }

    getBaseReadStats() {
        let from = this.params.from;
        // A base stat (atk_base) is never written by an effect.
        if (!from || /_base$/.test(from)) {
            return [];
        }
        return [from];
    }

    getWriteStats() {
        let percent = this.params.percent;
        return (Array.isArray(percent) ? percent : [percent])
            .filter((table) => table && table.getName())
            .map((table) => table.getName());
    }

    /**
     * @param {string} stat total to read, such as 'hp'
     * @param {BuildData} data
     * @param {Stats} [stats] stats to read, data.stats by default
     * @returns {CBlock} the stat's premod or total value, as the effect reads
     */
    statTotalItem(stat, data, stats = data.stats) {
        return this.getReads() == CHANNELS.PREMOD
            ? makeStatPremodItem(stat, stats)
            : makeStatTotalItem(stat, stats);
    }

    getStacks(data) {
        if (!this.params.stacksSetting) {
            return 1;
        }

        return data.settings[this.params.stacksSetting] || 1;
    }

    getBaseValueTree(data, opts) {
        const receiver = this.params.fromScope === 'receiver';
        const stats = receiver ? (data.receiverStats || data.stats) : data.stats;
        const from = this.params.from;
        const tree = from.indexOf('*') > 0
            ? this.statTotalItem(from.replace('*', ''), data, stats)
            : makeStatItem(from, stats);
        if (receiver) {
            // Totals such as mastery* may expand into several stat reads.
            const mark = (item) => {
                if (['item_stat', 'item_stat_total'].includes(item.getType())) item.scope = 'receiver';
            };
            mark(tree);
            if (tree.walk) tree.walk(mark);
        }
        return tree;
    }

    getPercents(data) {
        return Array.isArray(this.params.percent) ? this.params.percent : [this.params.percent];
    }

    getTree(data, opts) {
        opts = Object.assign({}, opts);

        let result = [];
        let percents = this.getPercents(data);
        let level = this.getLevel(data.settings);

        let maxValue;
        let maxValuePost;
        if (this.params.statCap) {
            maxValue = this.params.statCap.getValue(level);
        } else if (this.params.statCapPost) {
            maxValuePost = this.params.statCapPost.getTree(data)[0];
        }

        let bonus = 0;
        let bonusValue = 0;
        if (this.params.percentBonus) {
            if (!this.params.bonusCondition || this.params.bonusCondition.isActive(data.settings)) {
                let bonusLevel = data.settings.getLevel(this.params.percentBonusLevel);
                bonus = this.params.percentBonus.getValue(bonusLevel);
                if (this.params.bonusStackSettings) {
                    let stacks = data.settings[this.params.bonusStackSettings];
                    bonus *= stacks;
                }
            }
        }

        if (this.params.flatBonus) {
            if (!this.params.flatBonusCondition || this.params.flatBonusCondition.isActive(data.settings)) {
                bonusValue = this.params.flatBonus.getValue(level);
            }
        }

        for (let table of percents) {
            let value = table.getValue(level);
            let stat = table.getName();
            let statMaxValue = maxValue;

            if (isPercent(stat)) {
                value = value / 100;
                statMaxValue = statMaxValue / 100;
            }

            let base = this.getBaseValueTree(data, opts);
            if (this.params.maxBase) {
                base = new CValueCap([base], {value: new CConst({value: this.params.maxBase})});
            } else if (this.params.exceed) {
                base = new CValueAboveZero([
                    new CSubtract([base, new CConst({value: this.params.exceed})]),
                ]);
            }

            let stacks = this.getStacks(data);
            let valueConst = new CConst({value: value});
            if (stacks > 1) {
                valueConst = new CMulti([valueConst, new CConst({value: stacks, comment: 'stacks'})]);
            }

            if (bonus) {
                valueConst = new CSum([
                    valueConst,
                    new CConst({value: bonus}),
                ]);
            }

            let items = [
                new CMulti([valueConst, base]),
            ];

            if (bonusValue) {
                items = [
                    new CSum([
                        ...items,
                        new CConst({value: bonusValue}),
                    ]),
                ];
            }

            if (statMaxValue) {
                items = [new CValueCap(items, {value: new CConst({value: statMaxValue})})];
            } else if (maxValuePost) {
                items = [new CValueCap(items, {value: maxValuePost})];
            }

            let programStat = programStatName(stat);
            result.push(new CPostEffect(items, {
                // An enemy's RES is written on the enemy (Team/EnemyStats).
                stat: programStat,
                priority: this.getPriority(),
                // The extra part is also kept apart, for premod reads.
                extra: this.getWrites() == CHANNELS.TOTAL && hasExtraLane(programStat),
            }));
        }

        return result;
    }
}
