import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionLithic } from "../../../classes/Condition/Lithic";
import { ConditionStacksSetting } from "../../../classes/Condition/Stacks/Setting";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const LithicSpear = new DbObjectWeapon({
    name: 'lithic_spear',
    serializeId: 81,
    gameId: 13406,
    iconClass: "weapon-icon-polearm-lithic-spear",
    rarity: 4,
    weapon: 'polearm',
    statTable: weaponStatTables.LithicSpear,
    conditions: [
        new ConditionLithic(),
        new ConditionStacksSetting({
            name: 'weapon_lithic_stacks',
            serializeId: 1,
            title: 'talent_name.weapon_lithic_axiome',
            description: 'talent_descr.weapon_lithic_axiome',
            maxStacks: 4,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.LithicSpear.p1)),
                new StatTable('crit_rate', percent(weaponPassiveTables.LithicSpear.p2)),
            ],
            subConditions: [
                new ConditionBoolean({name: 'weapon_lithic_stacks'}),
            ],
        }),
    ],
});

