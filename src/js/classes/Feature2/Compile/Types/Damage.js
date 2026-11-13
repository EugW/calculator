import { makeRoyalAverageCrit } from "../Helpers";
import { CBlock, CReturn } from "../Types";
import { CMax, CMulti, CSubtract, CSum, CSumPlusOne, CVar } from "./Block";
import { CConst, CVarValue } from "./Item";

/**
 * Share of a contribution by its rank, on the reaction's base rate: 60% of
 * the highest, 30% of the second, 5% of each of the rest (the game's 1, 1/2
 * and 1/12 on a rate of 60% of ours).
 */
export const CONTRIBUTION_WEIGHTS = [0.6, 0.3, 0.05];

/**
 * @param {Array.<number>} values what each contributor deals
 * @returns {Array.<number>} the weight of each, by its rank among them
 */
export function contributionWeights(values) {
    let order = values.map((value, index) => index).sort((a, b) => values[b] - values[a]);
    let result = new Array(values.length);
    order.forEach((index, rank) => {
        result[index] = CONTRIBUTION_WEIGHTS[Math.min(rank, CONTRIBUTION_WEIGHTS.length - 1)];
    });
    return result;
}

export class CCritRate extends CSum {
    // A rate of static stats only (a teammate's, in a search objective) stays
    // a block: folded into a constant it would lose its bounds.
    dontShrink() {return 1;}

    compile(opts) {
        let result = super.compile(opts);
        return `Math.max(0, Math.min(1, ${result}))`;
    }

    compileWGSL(opts) {
        let result = super.compileWGSL(opts);
        return `clamp(${result}, 0.0, 1.0)`;
    }
}

export class CCritDmg extends CSumPlusOne {
    // Inherits compileWGSL from CSumPlusOne
}

export class CDamageResult extends CBlock {
    getType() {return 'damage_result';}
    isCollapsable() {return false;}


    compile(opts) {
        return '[' + this.compileChildrens(opts).join(', ') + ']';
    }

    compileWGSL(opts) {
        let parts = this.compileChildrensWGSL(opts);
        return `vec3<f32>(${parts.join(', ')})`;
    }

    getSignature() { return null; }
}

export class CHeal extends CMulti {
    getType() {return 'heal_result';}
    isCollapsable() {return false;}

    /**
     * @returns {CBlock}
     */
    makeResult(opts) {
        let varNormal = new CVar([new CMulti(this.items)], {name: 'normal'});

        return new CReturn([
            varNormal,
            new CDamageResult([
                new CVarValue({ref: varNormal}),
                new CVarValue({ref: varNormal}),
                new CVarValue({ref: varNormal}),
            ]),
        ]);
    }

    makeResultWGSL(opts) {
        return this.makeResult(opts);
    }
}

export class CShield extends CMulti {
    getType() {return 'shield_result';}
    isCollapsable() {return false;}

    /**
     * @returns {CBlock}
     */
    makeResult(opts) {
        let varNormal = new CVar([new CMulti(this.items)], {name: 'normal'});

        return new CReturn([
            varNormal,
            new CDamageResult([
                new CVarValue({ref: varNormal}),
                new CVarValue({ref: varNormal}),
                new CVarValue({ref: varNormal}),
            ]),
        ]);
    }

    makeResultWGSL(opts) {
        return this.makeResult(opts);
    }
}

export class CDamage extends CMulti {
    getType() {return 'damage_result';}

    /**
     * @returns {Array.<CBlock>}
     */
    treeBlockFields() {
        let result = super.treeBlockFields();
        if (this.critRate) result.push(this.critRate.items);
        if (this.critDmg) result.push(this.critDmg.items);
        if (this.royalCrit) result.push([this.royalCrit]);
        return result;
    }

    /**
     * @returns {CBlock}
     */
    makeResult(opts) {
        opts = Object.assign({}, opts);

        let varNormal = new CVar([new CMulti(this.items)], {name: 'normal'});
        let varChance = new CVar([this.critRate], {name: 'crit_rate'});
        let varCrit = new CVar([
            new CMulti([
                new CVarValue({ref: varNormal}),
                this.critDmg,
            ]),
        ], {name: 'crit_dmg'});

        let varsBlock = [];
        if (this.royalCrit) {
            [varsBlock, varChance] = makeRoyalAverageCrit(varChance, this.royalCrit);
        }

        return new CReturn([
            varNormal,
            ...varsBlock,
            varChance,
            varCrit,
            new CDamageResult([
                new CVarValue({ref: varNormal}),
                new CVarValue({ref: varCrit}),
                new CSum([
                    new CMulti([
                        new CVarValue({ref: varNormal}),
                        new CSubtract([
                            new CConst({value: 1}),
                            new CVarValue({ref: varChance}),
                        ]),
                    ]),
                    new CMulti([
                        new CVarValue({ref: varCrit}),
                        new CVarValue({ref: varChance}),
                    ]),
                ]),
            ]),
        ]);
    }

    makeResultWGSL(opts) {
        // Reuse the same tree structure - compileWGSL will handle the translation
        return this.makeResult(opts);
    }
}

/**
 * Damage several members deal together (Lunar-Charged, Lunar-Crystallize,
 * Stellar Swirl). Its items are the contributors' damage trees (CDamage), each
 * what its member would deal alone. Every contributor rolls its own CRIT;
 * the values are ranked after the rolls and weighted by rank
 * (CONTRIBUTION_WEIGHTS).
 *
 * Results: normal with no CRIT, crit with every contributor's CRIT, average
 * over every combination of CRITs, each combination ranked on its own.
 */
export class CDamageContribution extends CBlock {
    getType() {return 'damage_contribution_result';}
    isCollapsable() {return false;}

    /**
     * The result as variables, for a root that adds it to others (a hit of
     * a rotation).
     *
     * @returns {{blocks: Array.<CBlock>, normal: CVar, crit: CVar, average: CVar}}
     */
    makeVars() {
        let blocks = [];
        let members = this.items.map((tree) => {
            let normal = new CVar([new CMulti(tree.items)], {name: 'normal'});
            let chance = new CVar([tree.critRate], {name: 'crit_rate'});
            let miss = new CVar([
                new CSubtract([new CConst({value: 1}), new CVarValue({ref: chance})]),
            ], {name: 'no_crit_rate'});
            let crit = new CVar([
                new CMulti([new CVarValue({ref: normal}), tree.critDmg]),
            ], {name: 'crit_dmg'});

            blocks.push(normal, chance, miss, crit);
            return {normal, chance, miss, crit};
        });

        let normal = new CVar([ranked(members.map((item) => item.normal))], {name: 'normal'});
        let crit = new CVar([ranked(members.map((item) => item.crit))], {name: 'crit_dmg'});

        let outcomes = [];
        for (let mask = 0; mask < 1 << members.length; ++mask) {
            let isCrit = (index) => !!(mask >> index & 1);
            outcomes.push(new CMulti([
                ...members.map((item, index) => new CVarValue({ref: isCrit(index) ? item.chance : item.miss})),
                ranked(members.map((item, index) => isCrit(index) ? item.crit : item.normal)),
            ]));
        }
        let average = new CVar(members.length ? outcomes : [new CConst({value: 0})], {name: 'average'});

        blocks.push(normal, crit, average);
        return {blocks, normal, crit, average};
    }

    /**
     * @returns {CBlock}
     */
    makeResult(opts) {
        let vars = this.makeVars();

        return new CReturn([
            ...vars.blocks,
            new CDamageResult([
                new CVarValue({ref: vars.normal}),
                new CVarValue({ref: vars.crit}),
                new CVarValue({ref: vars.average}),
            ]),
        ]);
    }

    makeResultWGSL(opts) {
        return this.makeResult(opts);
    }
}

/**
 * Values weighted by rank, without sorting them: every value counts for the
 * last weight, the two highest for the difference up to the second, the
 * highest for the difference up to the first.
 *
 * @param {Array.<CVar>} vars the values
 * @returns {CBlock}
 */
function ranked(vars) {
    let [first, second, rest] = CONTRIBUTION_WEIGHTS;
    let values = () => vars.map((item) => new CVarValue({ref: item}));

    if (vars.length == 0) {
        return new CConst({value: 0});
    }
    if (vars.length == 1) {
        return new CMulti([new CConst({value: first}), ...values()]);
    }

    let pairs = [];
    for (let i = 0; i < vars.length; ++i) {
        for (let j = i + 1; j < vars.length; ++j) {
            pairs.push(new CSum([new CVarValue({ref: vars[i]}), new CVarValue({ref: vars[j]})]));
        }
    }

    return new CSum([
        new CMulti([new CConst({value: rest}), new CSum(values())]),
        new CMulti([new CConst({value: second - rest}), highest(pairs)]),
        new CMulti([new CConst({value: first - second}), highest(values())]),
    ]);
}

/**
 * @param {Array.<CBlock|CItem>} items
 * @returns {CBlock|CItem} the highest of the items, as maximums of two (WGSL's max takes two)
 */
function highest(items) {
    return items.reduce((result, item) => new CMax([result, item]));
}

export class CDamageRotation extends CMulti {
    getType() {return 'damage_rotation_result';}

    /**
     * @returns {CBlock}
     */
    makeResult(opts) {
        opts = Object.assign({}, opts);

        return new CReturn([
            ...this.items,
            new CDamageResult(this.vars),
        ]);
    }

    makeResultWGSL(opts) {
        return this.makeResult(opts);
    }
}

export class CStaticValue extends CHeal {
    getType() {return 'static_result';}
    // Inherits makeResultWGSL from CHeal
}
