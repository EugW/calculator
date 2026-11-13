import { ConditionShielded } from "../../../classes/Condition/Field";
import { ConditionRetired } from "../../../classes/Condition/Retired";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { StatTableConditions } from "../../../classes/StatTable/Condition";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent, times } from "../../Params";

export const MemoryOfDust = new DbObjectWeapon({
    name: 'memory_of_dust',
    serializeId: 48,
    gameId: 14504,
    iconClass: "weapon-icon-catalyst-memory-of-dust",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.MemoryofDust,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_golden_majesty',
            description: 'talent_descr.weapon_golden_majesty_passive',
            stats: [
                new StatTable('shield', weaponPassiveTables.MemoryofDust.shield),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_memory_of_dust',
            serializeId: 1,
            title: 'talent_name.weapon_golden_majesty',
            description: 'talent_descr.weapon_golden_majesty',
            maxStacks: 5,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTableConditions(
                    'atk_percent',
                    percent(weaponPassiveTables.MemoryofDust.p2),
                    [
                        new ConditionShielded({invert: true}),
                    ]
                ),
                new StatTableConditions(
                    'atk_percent',
                    percent(times(weaponPassiveTables.MemoryofDust.p2, 2)),
                    [
                        new ConditionShielded(),
                    ]
                ),
            ],
        }),
        // Shield state follows the team's on-field shield.
        new ConditionStatic({
            title: 'talent_name.weapon_golden_majesty',
            description: 'talent_descr.weapon_golden_majesty_shield',
            subConditions: [
                new ConditionShielded(),
            ],
        }),
        new ConditionRetired({serializeId: 2, type: 'checkbox'}),
    ],
});
