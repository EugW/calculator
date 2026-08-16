import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const BladeOfAtonement = new DbObjectWeapon({
    name: 'blade_of_atonement',
    serializeId: 251,
    gameId: 12436,
    iconClass: 'weapon-icon-claymore-blade-of-atonement',
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.BladeOfAtonement,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_blade_of_atonement_reaction',
            serializeId: 1,
            title: 'talent_name.weapon_blade_of_atonement',
            description: 'talent_descr.weapon_blade_of_atonement_1',
            stats: [
                new StatTable('mastery', [64, 80, 96, 112, 128]),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_blade_of_atonement_stellarglimmer',
            serializeId: 2,
            title: 'talent_name.weapon_blade_of_atonement',
            description: 'talent_descr.weapon_blade_of_atonement_2',
            stats: [
                new StatTable('atk_percent', [16, 20, 24, 28, 32]),
            ],
        }),
    ],
});
