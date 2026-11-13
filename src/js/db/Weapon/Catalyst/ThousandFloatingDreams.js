import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionCalcElements } from "../../../classes/Condition/CalcElements";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { ConditionStaticRefineDreamsOther } from "../../../classes/Condition/Static/Refine/DreamsOther";
import { ConditionStaticRefineDreamsSame } from "../../../classes/Condition/Static/Refine/DreamsSame";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const ThousandFloatingDreams = new DbObjectWeapon({
    name: 'a_thousand_floating_dreams',
    serializeId: 138,
    gameId: 14511,
    iconClass: "weapon-icon-catalyst-a-thousand-floating-dreams",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.ThousandFloatingDreams,
    conditions: [
        new ConditionCalcElements({}),
        new ConditionStatic({
            title: 'talent_name.weapon_thousand_floating_dreams',
            description: 'talent_descr.weapon_thousand_floating_dreams_static',
        }),
        new ConditionStaticRefineDreamsSame({
            title: 'talent_name.weapon_thousand_floating_dreams',
            description: 'talent_descr.weapon_thousand_floating_dreams_same',
            stats: [
                new StatTable('mastery', weaponPassiveTables.ThousandFloatingDreams.p1),
            ],
            subConditions: [
                new ConditionBoolean({name: 'party_elements_same'}),
            ],
        }),
        new ConditionStaticRefineDreamsOther({
            title: 'talent_name.weapon_thousand_floating_dreams',
            description: 'talent_descr.weapon_thousand_floating_dreams_other',
            stats: [
                new StatTable('dmg_own', percent(weaponPassiveTables.ThousandFloatingDreams.p2)),
            ],
            subConditions: [
                new ConditionBoolean({name: 'party_elements_different'}),
            ],
        }),
        // A Thousand Nights' Dawnsong: all nearby party members other than
        // the equipping character gain EM. Multiple such effects can stack,
        // and the old PartyWeapon allowed several copies: no stack key.
        new ConditionBooleanRefine({
            name: 'weapon_thousand_floating_dreams_party',
            serializeId: 1,
            receivers: RECEIVERS.OTHERS,
            title: 'talent_name.weapon_thousand_floating_dreams',
            description: 'talent_descr.weapon_thousand_floating_dreams_party',
            stats: [
                new StatTable('mastery', weaponPassiveTables.ThousandFloatingDreams.p3),
            ],
        }),
    ],
});

