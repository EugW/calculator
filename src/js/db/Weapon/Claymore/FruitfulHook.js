import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const FruitfulHook = new DbObjectWeapon({
    name: 'fruitful_hook',
    serializeId: 188,
    gameId: 12430,
    iconClass: "weapon-icon-claymore-fruitful-hook",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.FruitfulHook,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_fruitful_hook',
            description: 'talent_descr.weapon_fruitful_hook_1',
            stats: [
                new StatTable('crit_rate_plunge', percent(weaponPassiveTables.FruitfulHook.p1)),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_fruitful_hook',
            serializeId: 1,
            title: 'talent_name.weapon_fruitful_hook',
            description: 'talent_descr.weapon_fruitful_hook_2',
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.FruitfulHook.p2)),
                new StatTable('dmg_charged', percent(weaponPassiveTables.FruitfulHook.p2)),
                new StatTable('dmg_plunge', percent(weaponPassiveTables.FruitfulHook.p2)),
            ],
        }),
    ],
});
