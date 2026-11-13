import { Feature2 } from "../Feature2";
import { FeatureResult } from "../FeatureResult";
import { Feature2RotationTree, forEachHit, getActiveFeature, hitData, isTeamHit } from "./Rotation/Tree";

/**
 * A team's rotation as one member's feature, compiled into the member's
 * programs (see RotationCompiler): the whole team's hits
 * (rotation.total) or only the member's own (rotation_self.total). The
 * compiled items are the rotation's states and hits, each hit with its
 * member's data at its point of the rotation.
 */
export class FeatureRotation extends Feature2 {
    /**
     * @param {Object} params {name, items: compiled items, viewerSlot: the
     *     member's slot, onlySlot: the only slot whose hits count (optional)}
     */
    constructor(params) {
        super({name: params.name, items: params.items});
        this.name = params.name;
        this.items = params.items;
        this.viewerSlot = params.viewerSlot;
        this.onlySlot = params.onlySlot;
    }

    getName() { return this.name; }

    /**
     * It holds its team's states as they were when it was compiled: a build
     * with other artifacts needs its own (see MemberView.getResultOf).
     *
     * @returns {boolean}
     */
    isRotation() { return true; }

    /**
     * @param {Object} hit a compiled hit
     * @returns {boolean} whether this feature counts the hit: a member's own
     *     total leaves out what the whole team deals
     */
    counts(hit) {
        return this.onlySlot === undefined || (hit.slot == this.onlySlot && !isTeamHit(hit.feature));
    }

    /**
     * @param {BuildData} data
     * @returns {Function}
     */
    getTree(data, opts) {
        let tree = new Feature2RotationTree(this.items, Object.assign({}, opts, {
            viewerSlot: this.viewerSlot,
            counts: (hit) => this.counts(hit),
        }));
        return tree.getTree(data);
    }

    /**
     * @param {BuildData} data
     * @returns {Function}
     */
    compile(data, opts) {
        let tree = this.getTree(data, opts);
        return this.compileTree(tree, opts);
    }

    /**
     * @param {CBlock} tree
     * @returns {Function}
     */
    compileTree(root, opts) {
        opts = Object.assign({}, opts);
        return root.compile(opts);
    }

    /** A prepared compiler may be reused while only artifact stats vary. */
    getResult(data, compiler) {
        if (!this.checkConditions(data)) {
            return {};
        }

        compiler ||= this.getCompiled(data);
        let [normal, crit, average] = compiler.execute(data);

        let element = this.getElement(data);
        if (data.settings && data.settings.rotation_include) {
            element = data.settings.rotation_include;
        }

        return {
            [this.getName()]: new FeatureResult({
                icon: element,
                normal: normal,
                crit: crit,
                average: average,
            }),
        };
    }

    /**
     * Every hit's result in the rotation's order, for the editor, whichever
     * hits this feature counts. A hit is computed with its member's data at
     * its point of the rotation; a hit in an uptime block is weighted by it.
     *
     * @returns {Array.<Object>} {result, count, subLine}, or {} for a hit that does not apply
     */
    getResultForEditor() {
        return editorResults(this.items);
    }

    getDisplaySettings(data) {
        let elements = {};
        let damageTypes = {};
        let section = this.getName().split('.')[0];

        let result = [{
            settings: {rotation_include: null},
            setTotal: 1,
            icon: 'multi',
        }];

        forEachHit(this.items, (hit) => {
            if (!this.counts(hit)) return;

            let hitDataItem = hitData(hit);
            let activeFeature = getActiveFeature(hit.feature, hitDataItem);
            if (activeFeature) {
                elements[activeFeature.getElement(hitDataItem)] = 1;
                damageTypes[activeFeature.getDamageType()] = 1;
            }
        });

        for (let element of Object.keys(elements)) {
            result.push({
                id: section + '.total_' + element,
                title: 'rotation.' + element,
                isChild: true,
                settings: {rotation_include: element},
                getTotal: 1,
            });
        }

        for (let datageType of Object.keys(damageTypes)) {
            result.push({
                id: section + '.total_' + datageType,
                title: 'rotation.' + datageType,
                icon: 'multi',
                isChild: true,
                settings: {rotation_include: datageType},
                getTotal: 1,
            });
        }

        return result;
    }
}

function editorResults(items) {
    let result = [];

    for (let item of items) {
        if (item.type == 'feature') {
            let data = hitData(item);
            let activeFeature = getActiveFeature(item.feature, data);
            if (activeFeature) {
                result.push({
                    result: activeFeature.getResult(data)[activeFeature.getName()],
                    count: item.count,
                    subLine: featureSubline(activeFeature, data),
                });
            } else {
                result.push({});
            }
        } else if (item.type == 'repeat') {
            result = result.concat(editorResults(item.items));
        } else if (item.type == 'uptime') {
            let on = editorResults(item.on);
            let off = editorResults(item.off);
            let percent = item.percent / 100;

            for (let i = 0; i < off.length; ++i) {
                let resultOn = on[i] && on[i].result;
                let resultOff = off[i].result;

                if (!resultOn && !resultOff) continue;  // both invalid

                let base = resultOff ? off[i] : on[i];
                let merged = Object.assign(Object.create(Object.getPrototypeOf(base.result)), base.result);
                for (let key of ['normal', 'crit', 'average']) {
                    merged[key] = (resultOff ? resultOff[key] : 0) * (1 - percent) + (resultOn ? resultOn[key] : 0) * percent;
                }
                off[i] = Object.assign({}, base, {result: merged});
            }

            result = result.concat(off);
        } else if (item.type == 'invalid') {
            result.push({});
        }
    }

    return result;
}

function featureSubline(feature, data) {
    let descr = feature.getRotationHitDescription(data);

    if (descr) {
        return {
            descr: 'talent_descr.' + descr,
            value: feature.getDisplayRotationHitMiltiplier(data),
        };
    }
}
