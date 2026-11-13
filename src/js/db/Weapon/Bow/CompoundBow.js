import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const CompoundBow = new DbObjectWeapon({
    name: 'compound_bow',
    serializeId: 26,
    gameId: 15407,
    iconClass: "weapon-icon-bow-compound-bow",
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.CompoundBow,
    conditions: [
        new ConditionStacks({
            name: 'weapon_compound_bow',
            serializeId: 1,
            title: 'talent_name.weapon_compound_bow',
            description: 'talent_descr.weapon_compound_bow',
            maxStacks: 4,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.CompoundBow.p1)),
                new StatTable('atk_speed_normal', percent(weaponPassiveTables.CompoundBow.p2)),
            ],
        })
    ],
});

