import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionLithic } from "../../../classes/Condition/Lithic";
import { ConditionStacksSetting } from "../../../classes/Condition/Stacks/Setting";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const LithicBlade = new DbObjectWeapon({
    name: 'lithic_blade',
    serializeId: 67,
    gameId: 12410,
    iconClass: "weapon-icon-claymore-lithic-blade",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.LithicBlade,
    conditions: [
        new ConditionLithic(),
        new ConditionStacksSetting({
            name: 'weapon_lithic_stacks',
            serializeId: 1,
            title: 'talent_name.weapon_lithic_axiome',
            description: 'talent_descr.weapon_lithic_axiome',
            maxStacks: weaponPassiveTables.LithicBlade.p3[0],
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.LithicBlade.p1)),
                new StatTable('crit_rate', percent(weaponPassiveTables.LithicBlade.p2)),
            ],
            subConditions: [
                new ConditionBoolean({name: 'weapon_lithic_stacks'}),
            ],
        }),
    ],
});
