import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const SurfingTime = new DbObjectWeapon({
    name: 'surfing_time',
    serializeId: 178,
    gameId: 14516,
    iconClass: "weapon-icon-catalyst-surfs-up",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.SurfingTime,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_surfing_time',
            description: 'talent_descr.weapon_surfing_time_1',
            stats: [
                new StatTable('hp_percent', weaponPassiveTables.SurfingTime.hp_percent),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_surfing_time',
            serializeId: 1,
            title: 'talent_name.weapon_surfing_time',
            description: 'talent_descr.weapon_surfing_time_2',
            maxStacks: weaponPassiveTables.SurfingTime.p4[0],
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.SurfingTime.p5)),
            ],
        })
    ],
});

