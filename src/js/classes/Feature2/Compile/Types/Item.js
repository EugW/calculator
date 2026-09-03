import { CItem } from "../Types";
import { wgslNumber, wgslStatAccess, wgslVariableName } from "../WGSL";
import { CMulti, CSum, CSumPlusOne } from "./Block";

export class CConst extends CItem {
    getType() {return 'item_const';}

    compileWGSL(opts) {
        return wgslNumber(this.value, opts);
    }

    getSignature() {
        return '(const:' + this.value + ')';
    }
}

export class CStat extends CItem {
    getType() {return 'item_stat';}

    compile(opts) {
        return 'stats.' + this.stat;
    }

    compileWGSL(opts) {
        return wgslStatAccess(this.stat, opts);
    }

    process(opts) {
        if (opts.staticStats && opts.staticStats.includes(this.stat)) {
            return new CConst({value: this.value, comment: this.stat});
        }

        return super.process();
    }

    getUsedStats() {
        return [this.stat];
    }

    getSignature() {
        return '(stat:' + this.stat + ')';
    }
}

export class CStatTotal extends CStat {
    getType() {return 'item_stat_total';}

    getUsedStats() {
        return [this.stat, this.stat + '_base', this.stat + '_percent'];
    }

    process(opts) {
        let block = new CSum([
            new CMulti([
                new CStat({stat: this.statBaseName(), value: this.baseBalue}),
                new CSumPlusOne([
                    new CStat({stat: this.statPercentName(), value: this.percentValue}),
                ], {comment: this.stat + '_percent', percent: true}),
            ]),
            new CStat({stat: this.statFlatName(), value: this.flatValue}),
        ], {comment: this.stat});

        return block.process(opts);
    }

    statBaseName() {
        return this.replaceName(this.stat + '_base');
    }

    statPercentName() {
        return this.replaceName(this.stat + '_percent');
    }

    statFlatName() {
        return this.replaceName(this.stat);
    }

    replaceName(stat) {
        if (this.replace && this.replace[stat]) {
            return this.replace[stat];
        }
        return stat;
    }

    compile(opts) {
        return `(stats.${this.statBaseName()} * (1 + stats.${this.statPercentName()}) + stats.${this.statFlatName()})`;
    }

    compileWGSL(opts) {
        const base = wgslStatAccess(this.statBaseName(), opts);
        const percent = wgslStatAccess(this.statPercentName(), opts);
        const flat = wgslStatAccess(this.statFlatName(), opts);
        return `(${base} * (1.0 + ${percent}) + ${flat})`;
    }
}

export class CVarValue extends CItem {
    constructor(params) {
        params.name = params.ref.name;
        delete params.ref;
        super(params);
    }

    getType() {return 'variable_get';}
    isVariableGet() {return true;}

    compile(opts) {
        return this.name;
    }

    compileWGSL(opts) {
        return wgslVariableName(this.name, opts);
    }

    getSignature() {
        return '(var_value:' + this.name + ')';
    }
}
