import { Condition } from "../../Condition";
import { ConditionDropdownElement } from "./Element";

const RESONATED_SPECS = [
    ['anemo', 1, {crit_rate: 10}],
    ['geo', 2, {def_percent: 20}],
    ['electro', 3, {recharge: 20}],
    ['dendro', 4, {mastery: 60}],
    ['hydro', 5, {hp_percent: 20}],
    ['pyro', 6, {atk_percent: 20}],
    ['cryo', 7, {crit_dmg: 20}],
];

export function getTravelerResonatedValues() {
    return RESONATED_SPECS.map(([value, serializeId, stats]) => ({
        value,
        serializeId,
        conditions: [new Condition({stats})],
    }));
}

export class ConditionDropdownTravelerResonated extends ConditionDropdownElement {
    constructor(params) {
        params = Object.assign(
            {
                title: 'talent_name.n10050001',
                description: 'talent_descr.n10050001',
                multiple: true,
                values: getTravelerResonatedValues(),
            },
            params || {},
        );

        super(params);
    }
}
