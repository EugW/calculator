import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionCalcElements } from "../../../classes/Condition/CalcElements";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { ConditionStaticRefineDreamsOther } from "../../../classes/Condition/Static/Refine/DreamsOther";
import { ConditionStaticRefineDreamsSame } from "../../../classes/Condition/Static/Refine/DreamsSame";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

class ConditionJadeVistaSame extends ConditionStaticRefineDreamsSame {
    getStacks(settings) {
        return Math.min(3, Math.max(0, super.getStacks(settings)));
    }
}

class ConditionJadeVistaOther extends ConditionStaticRefineDreamsOther {
    getStacks(settings) {
        const same = Math.min(3, Math.max(0, settings.party_elements_same || 0));
        return Math.min(3 - same, Math.max(0, super.getStacks(settings)));
    }
}

export const JadeVista = new DbObjectWeapon({
    name: 'jade_vista',
    serializeId: 256,
    gameId: 15435,
    iconClass: "weapon-icon-bow-jade-vista",
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.JadeVista,
    conditions: [
        new ConditionCalcElements({}),
        new ConditionStatic({
            title: 'talent_name.weapon_jade_vista',
            description: 'talent_descr.weapon_jade_vista_static',
        }),
        new ConditionJadeVistaSame({
            title: 'talent_name.weapon_jade_vista',
            description: 'talent_descr.weapon_jade_vista_same',
            stats: [
                new StatTable('mastery', [64, 80, 96, 112, 128]),
            ],
            subConditions: [
                new ConditionBoolean({name: 'party_elements_same'}),
            ],
        }),
        new ConditionJadeVistaOther({
            title: 'talent_name.weapon_jade_vista',
            description: 'talent_descr.weapon_jade_vista_other',
            stats: [
                new StatTable('atk_percent', [12, 15, 18, 21, 24]),
            ],
            subConditions: [
                new ConditionBoolean({name: 'party_elements_different'}),
            ],
        }),
    ],
});
