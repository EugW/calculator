import { variableName } from "../Helpers";
import { CBlock } from "../Types";
import { wgslNumber, wgslStatAccess, wgslVariableName } from "../WGSL";
import { CConst, CStat } from "./Item";


export class CSum extends CBlock {
    getType() {return 'block_sum';}
    dontShrink() {return 0;}

    /**
     * @param {Object} opts Compilation options
     * @returns {string} String contains code
     */
    compile(opts) {
        let parts = this.compileChildrens(opts);
        let result = parts.join(' + ');

        if (parts.length > 1) {
            result = '(' + result + ')';
        }

        return result || '0';
    }

    compileWGSL(opts) {
        let parts = this.compileChildrensWGSL(opts);
        let result = parts.join(' + ');

        if (parts.length > 1) {
            result = '(' + result + ')';
        }

        return result || '0.0';
    }

    /**
     * @param {Object} opts
     * @returns {CBlock}
     */
    process(opts) {
        this.items = this.items.map((i) => {return i.process(opts);});
        let staticItems = this.items.filter((i) => {return i instanceof CConst && i.value != 0;});
        let nonStaticItems = this.items.filter((i) => {return !(i instanceof CConst);});

        if (staticItems.length > 1 && !opts.dontProcessStaticValues) {
            let newItems = [];
            let value = 0;

            for (let item of staticItems) {
                value += item.value;
            }

            let constItem = new CConst({value: value, comment: 'processed'});
            if (nonStaticItems.length == 0 && !this.dontShrink()) {
                return constItem;
            }

            newItems.push(constItem);
            for (let item of nonStaticItems) {
                newItems.push(item);
            }

            this.items = newItems;
        } else {
            this.items = [
                ...staticItems,
                ...nonStaticItems,
            ];
        }

        if (this.items.length == 0) { // CHECK
            this.items = [new CConst({value: 0})];
        }

        // if (this.items.length == 1 && this.getType() == 'block_sum') {
        //     return this.items[0];
        // }

        return super.process(opts);
    }
}

export class CSumPlusOne extends CSum {
    getType() {return 'block_sum_plus';}

    /**
     * @param {Object} opts Compilation options
     * @returns {string} String contains code
     */
    compile(opts) {
        let parts = this.compileChildrens(opts);
        if (parts.length == 0) return '';

        parts.unshift(1);
        return '(' + parts.join(' + ') + ')';
    }

    compileWGSL(opts) {
        let parts = this.compileChildrensWGSL(opts);
        if (parts.length == 0) return '1.0';

        parts.unshift('1.0');
        return '(' + parts.join(' + ') + ')';
    }

    /**
     * @param {Object} opts
     * @returns {CBlock}
     */
    process(opts) {
        let result = new CSum([
            new CConst({value: 1}),
            ...this.items.map((i) => {return i.process(opts);}),
        ], this.getInfoProperties(opts));

        return result.process(opts);
    }
}

export class CSubtract extends CBlock {
    getType() {return 'block_subtract';}

    /**
     * @param {Object} opts Compilation options
     * @returns {string} String contains code
     */
    compile(opts) {
        let parts = this.compileChildrens(opts);
        let result = parts.join(' - ');

        if (parts.length > 1) {
            result = '(' + result + ')';
        }

        return result || '0';
    }

    compileWGSL(opts) {
        let parts = this.compileChildrensWGSL(opts);
        let result = parts.join(' - ');

        if (parts.length > 1) {
            result = '(' + result + ')';
        }

        return result || '0.0';
    }
}

export class CMulti extends CBlock {
    getType() {return 'block_multi';}

    /**
     * @param {Object} opts Compilation options
     * @returns {string} String contains code
     */
    compile(opts) {
        let parts = this.compileChildrens(opts);

        let result = parts.join(' * ');
        if (parts.length > 1) {
            result = '(' + result + ')';
        }

        return result || 0;
    }

    compileWGSL(opts) {
        let parts = this.compileChildrensWGSL(opts);

        let result = parts.join(' * ');
        if (parts.length > 1) {
            result = '(' + result + ')';
        }

        return result || '1.0';
    }

    /**
     * @param {Object} opts
     * @returns {CBlock}
     */
    process(opts) {
        this.items = this.items.map((i) => {return i.process(opts);});
        let staticItems = this.items.filter((i) => {return i instanceof CConst && i.value != 1;});
        let nonStaticItems = this.items.filter((i) => {return !(i instanceof CConst);});

        if (staticItems.length > 1 && !opts.dontProcessStaticValues) {
            let newItems = [];
            let value = 1;

            for (let item of staticItems) {
                value *= item.value;
            }

            let constItem = new CConst({value: value, comment: 'processed'});
            if (nonStaticItems.length == 0) {
                return constItem;
            }

            newItems.push(constItem);
            for (let item of nonStaticItems) {
                newItems.push(item);
            }

            this.items = newItems;
        } else {
            this.items = [
                ...staticItems,
                ...nonStaticItems,
            ];
        }

        // Do not replace inherited blocks
        if (this.items.length == 1 && this.getType() == 'block_multi') {
            return this.items[0];
        }

        return super.process();
    }
}

export class CDivide extends CBlock {
    getType() {return 'block_divide';}

    compile(opts) {
        let parts = this.compileChildrens(opts);

        let result = parts.join(' / ');
        if (parts.length > 1) {
            result = '(' + result + ')';
        }

        return result || 0;
    }

    compileWGSL(opts) {
        let parts = this.compileChildrensWGSL(opts);

        let result = parts.join(' / ');
        if (parts.length > 1) {
            result = '(' + result + ')';
        }

        return result || '1.0';
    }

    /**
     * @param {Object} opts
     * @returns {CBlock}
     */
    process(opts) {
        this.items = this.items.map((i) => {return i.process(opts);});
        let staticItems = this.items.filter((i) => {return i instanceof CConst;});
        let nonStaticItems = this.items.filter((i) => {return !(i instanceof CConst);});

        if (staticItems.length > 1 && !opts.dontProcessStaticValues) {
            let newItems = [];

            let first = staticItems.shift();
            let value = first.value;

            for (let item of staticItems) {
                value /= item.value;
            }

            let constItem = new CConst({value: value, comment: 'processed'});
            if (nonStaticItems.length == 0) {
                return constItem;
            }

            newItems.push(constItem);
            for (let item of nonStaticItems) {
                newItems.push(item);
            }

            this.items = newItems;
        }

        return super.process();
    }

    // getSignature() {
    //     return '(multi:'+ this.items.map((i) => {return i.getSignature()}).join(',') +')';
    // }
}

export class CNumberFloor extends CSum {
    getType() {return 'number_floor';}
    isCollapsable() {return false;}

    compile(opts) {
        return 'Math.floor('+ super.compile(opts) +')';
    }

    compileWGSL(opts) {
        return 'floor('+ super.compileWGSL(opts) +')';
    }
}

export class CNumberCeil extends CSum {
    getType() {return 'number_ceil';}
    isCollapsable() {return false;}

    compile(opts) {
        return 'Math.ceil('+ super.compile(opts) +')';
    }

    compileWGSL(opts) {
        return 'ceil('+ super.compileWGSL(opts) +')';
    }
}

export class CMax extends CBlock {
    getType() {return 'block_max';}

    compile(opts) {
        let parts = this.compileChildrens(opts);

        if (parts.length > 1) {
            return 'Math.max(' + parts.join(', ') + ')';
        }

        return parts[0];
    }

    compileWGSL(opts) {
        let parts = this.compileChildrensWGSL(opts);

        if (parts.length > 1) {
            return 'max(' + parts.join(', ') + ')';
        }

        return parts[0];
    }
}

export class CMin extends CBlock {
    getType() {return 'block_min';}

    compile(opts) {
        let parts = this.compileChildrens(opts);

        if (parts.length > 1) {
            return 'Math.min(' + parts.join(', ') + ')';
        }

        return parts[0];
    }

    compileWGSL(opts) {
        let parts = this.compileChildrensWGSL(opts);

        if (parts.length > 1) {
            return 'min(' + parts.join(', ') + ')';
        }

        return parts[0];
    }
}

export class CIfGreater extends CBlock {
    getType() {return 'if_greater';}
    isCollapsable() {return false;}

    compile(opts) {
        let parts = this.compileChildrens(opts);
        return `(${parts[0]} > ${parts[1]} ? ${parts[2]} : ${parts[3]})`;
    }

    compileWGSL(opts) {
        let parts = this.compileChildrensWGSL(opts);
        // WGSL uses select(false_val, true_val, condition)
        return `select(${parts[3]}, ${parts[2]}, ${parts[0]} > ${parts[1]})`;
    }
}

export class CVar extends CSum {
    getType() {return 'variable_set';}
    isCollapsable() {return false;}
    isVariableSet() {return true;}

    constructor(items, params) {
        params = Object.assign({}, params);
        params.name = variableName(params.name);
        super(items, params);
    }

    compile(opts) {
        return 'let '+ this.name +' = '+ super.compile(opts);
    }

    compileWGSL(opts) {
        // Use 'var' instead of 'let' because variables may be modified later with CVarIncrease
        return 'var '+ wgslVariableName(this.name, opts) +' = '+ super.compileWGSL(opts);
    }

    // compile(opts) {
    //     let result = 'let '+ this.name +' = '+ super.compile(opts);
    //     result += ';console.log("'+ this.name +'", '+ this.name +')';
    //     return result
    // }
}

export class CVarIncrease extends CSum {
    constructor(items, params) {
        params.name = params.ref.name;
        delete params.ref;
        super(items, params);
    }

    getType() {return 'variable_inc';}
    isCollapsable() {return false;}
    isVariableSet() {return true;}
    isVariableGet() {return true;}

    compile(opts) {
        return this.name +' += '+ super.compile(opts);
    }

    compileWGSL(opts) {
        return wgslVariableName(this.name, opts) +' += '+ super.compileWGSL(opts);
    }
}

export class CBaseDamage extends CSum {
    getType() {return 'base_damage';}
}

export class CFlatDamage extends CBaseDamage {
    getType() {return 'flat_damage';}
}

export class CFlatReduction extends CBaseDamage {
    getType() {return 'flat_reduce';}
}

export class CReactionBase extends CMulti {
    getType() {return 'reaction_base';}
}

export class CReactionBaseBonus extends CSum {
    getType() {return 'reaction_base_bonus';}
}

export class CMultiplierBonus extends CSumPlusOne {
    getType() {return 'multiplier_bonus';}

    getInfoProperties(opts) {
        let result = super.getInfoProperties(opts);
        result.percent = true;
        return result;
    }
}

export class CMultiplierReaction extends CSumPlusOne {
    getType() {return 'multiplier_reaction';}

    getInfoProperties(opts) {
        let result = super.getInfoProperties(opts);
        result.percent = true;
        return result;
    }
}

export class CMultiplierAmplifying extends CSum {
    getType() {return 'multiplier_amplifying';}
}

export class CMultiplierResistance extends CSum {
    getType() {return 'multiplier_resistance';}
}

export class CMultiplierDefence extends CSum {
    getType() {return 'multiplier_defence';}
}

export class CMultiplierCustom extends CSum {
    getType() {return 'multiplier_custom';}
}

export class CBlockPost extends CBlock {
    getType() {return 'post';}
}

export class CIsolatedBlock extends CBlock {
    getType() {return 'isolated';}

    // compile(opts) {
    //     let result = super.compile(opts);
    //     return '// block start\n' + result + ';\n// block end';
    // }
}

export class CPostEffect extends CMulti {
    getType() {return 'post_effect';}

    getAssignedStats() {
        if (this.stat) {
            return [this.stat];
        }

        return [];
    }
}

export class CStatIncrease extends CSum {
    getType() {return 'stat_increase';}
    isCollapsable() {return false;}

    getAssignedStats() {
        return [this.newName || this.stat];
    }

    getUsedStats() {
        // `target += value` reads target, while the renamed form writes a new
        // lane from the original source (`newName = stat + value`). Children
        // report the dependencies of `value` separately during the AST walk.
        return [this.stat];
    }

    compile(opts) {
        let code = super.compile(opts);
        if (this.newName) {
            return 'stats.' + this.newName + ' = stats.' + this.stat + ' + ' + code;
        } else {
            return 'stats.' + this.stat + ' += ' + code;
        }
    }

    compileWGSL(opts) {
        let code = super.compileWGSL(opts);
        let statAccess = wgslStatAccess(this.stat, opts);
        if (this.newName) {
            let newStatAccess = wgslStatAccess(this.newName, opts);
            return `${newStatAccess} = ${statAccess} + ${code}`;
        } else {
            return `(*stats)[${opts.statIndex[this.stat]}u] += ${code}`;
        }
    }
}

export class CStatDecrease extends CSum {
    getType() {return 'stat_decrease';}
    isCollapsable() {return false;}

    getAssignedStats() {
        return [this.stat];
    }

    getUsedStats() {
        return [this.stat];
    }

    /**
     * @param {Object} opts Compilation options
     * @returns {string} String contains code
     */
    compile(opts) {
        let code = super.compile(opts);
        return 'stats.' + this.stat + ' -= ' + code;
    }

    compileWGSL(opts) {
        let code = super.compileWGSL(opts);
        return `(*stats)[${opts.statIndex[this.stat]}u] -= ${code}`;
    }
}

export class CStatSet extends CSum {
    getType() {return 'stat_set';}
    isCollapsable() {return false;}

    getAssignedStats() {
        return [this.stat];
    }

    /**
     * @param {Object} opts Compilation options
     * @returns {string} String contains code
     */
    compile(opts) {
        let code = super.compile(opts);
        return 'stats.' + this.stat + ' = ' + code;
    }

    compileWGSL(opts) {
        let code = super.compileWGSL(opts);
        return `(*stats)[${opts.statIndex[this.stat]}u] = ${code}`;
    }
}

export class CValueCap extends CSum {
    constructor(items, params) {
        params = Object.assign({}, params);
        const value = params.value;
        delete params.value;
        super(items, params);
        // Keep the cap expression in a mutable child array so walkReplace can
        // fold its root and liveness traversal can see all of its stat reads.
        this.valueItems = [value];
    }

    getType() {return 'value_cap';}

    get value() {
        return this.valueItems[0];
    }

    set value(value) {
        this.valueItems[0] = value;
    }

    treeBlockFields() {
        return [
            ...super.treeBlockFields(),
            this.valueItems,
        ];
    }

    /**
     * @param {Object} opts Compilation options
     * @returns {string} String contains code
     */
    compile(opts) {
        let code = super.compile(opts);
        let code2 = this.value.compile(opts);
        return 'Math.min('+ code +', ' + code2 + ')';
    }

    compileWGSL(opts) {
        let code = super.compileWGSL(opts);
        let code2 = this.value.compileWGSL(opts);
        return 'min('+ code +', ' + code2 + ')';
    }
}

export class CValueAboveZero extends CSum {
    getType() {return 'value_above_zero';}

    /**
     * @param {Object} opts Compilation options
     * @returns {string} String contains code
     */
    compile(opts) {
        let code = super.compile(opts);
        return 'Math.max(0, ' + code + ')';
    }

    compileWGSL(opts) {
        let code = super.compileWGSL(opts);
        return 'max(0.0, ' + code + ')';
    }
}

export class CResistanceValue extends CSum {
    getType() {return 'resistance_value';}
    dontShrink() {return 1;}

    process(opts) {
        let result = super.process(opts);
        if (!opts.processResistance) {
            return result;
        }

        result = new CSum(result.items);

        // used only for details and require total resistance value
        if (opts.resistanceValue > 75) {
            result = new CDivide([
                new CConst({value: 1}),
                new CSumPlusOne([
                    new CMulti([
                        new CConst({value: 4}),
                        result,
                    ]),
                ]),
            ], {percent: true});
        } else if (opts.resistanceValue < 0) {
            result = new CSubtract([
                new CConst({value: 1, percent: true}),
                new CDivide([
                    result,
                    new CConst({value: 2}),
                ]),
            ], {percent: true});
        } else {
            result = new CSubtract([
                new CConst({value: 1, percent: true}),
                result,
            ], {percent: true});
        }

        return result;
    }

    compile(opts) {
        let code = super.compile(opts);
        return `(${code} < 0 ? (1 - ${code} / 2) : (${code} > 0.75 ? (1 / (4 * ${code} + 1)) : 1 - ${code}))`;
    }

    compileWGSL(opts) {
        let code = super.compileWGSL(opts);
        // Piecewise resistance formula:
        // res < 0: 1 - res/2 (negative resistance = bonus damage)
        // 0 <= res <= 0.75: 1 - res (normal range)
        // res > 0.75: 1 / (4*res + 1) (diminishing returns)
        return `select(select(1.0 - ${code}, 1.0 / (4.0 * ${code} + 1.0), ${code} > 0.75), 1.0 - ${code} * 0.5, ${code} < 0.0)`;
    }
}
