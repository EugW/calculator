import { ConditionBoLStat } from "../../classes/Condition/BoLStat";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { DbObjectBuff } from "../../classes/DbObject/Buff";

export const Static = new DbObjectBuff({
    name: 'static',
    invisible: true,
    conditions: [
        new ConditionBoLStat({
            condition: new ConditionBoolean({name: 'common.bond_of_life'}),
        }),
    ],
    // Key of Khaj-Nisut party post-effect is delivered by the weapon now
    // (KeyofKhajNisut.js).
    postEffects: [],
});
