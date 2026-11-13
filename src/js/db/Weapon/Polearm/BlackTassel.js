import { ConditionBooleanEnemyType } from "../../../classes/Condition/Boolean/EnemyType";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const BlackTassel = new DbObjectWeapon({
    name: 'black_tassel',
    serializeId: 82,
    gameId: 13303,
    iconClass: "weapon-icon-polearm-black-tassel",
    rarity: 3,
    weapon: 'polearm',
    statTable: weaponStatTables.BlackTassel,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_black_tassel',
            description: 'talent_descr.weapon_black_tassel',
            stats: [
                new StatTable('dmg_all', percent(weaponPassiveTables.BlackTassel.p1)),
            ],
            subConditions: [
                new ConditionBooleanEnemyType({types: ['slime']}),
            ],
        }),
    ],
});

