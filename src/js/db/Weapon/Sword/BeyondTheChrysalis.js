import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionDropdown } from "../../../classes/Condition/Dropdown";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const BeyondTheChrysalis = new DbObjectWeapon({
    name: 'beyond_the_chrysalis',
    serializeId: 260,
    gameId: 11522,
    iconClass: 'weapon-icon-sword-beyond-the-chrysalis',
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.BeyondTheChrysalis,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_beyond_the_chrysalis',
            description: 'talent_descr.weapon_beyond_the_chrysalis',
            stats: [
                new StatTable('text_percent_blazing', [56, 72, 88, 104, 120]),
                new StatTable('text_percent_dazzling', [36, 45, 54, 63, 72]),
                new StatTable('text_number_radiant', [5, 5.5, 6, 6.5, 7]),
            ],
        }),
        new ConditionDropdown({
            // Consume the removed selector's saved ID without reusing its format.
            name: 'weapon_beyond_the_chrysalis_attention',
            serializeId: 1,
            isHidden: true,
            values: [],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_beyond_the_chrysalis_winds_of_devotion',
            serializeId: 2,
            title: 'talent_name.weapon_beyond_the_chrysalis_winds_of_devotion',
            stats: [
                new StatTable('crit_dmg', [56, 72, 88, 104, 120]),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_beyond_the_chrysalis_winds_of_defiance',
            serializeId: 3,
            title: 'talent_name.weapon_beyond_the_chrysalis_winds_of_defiance',
            stats: [
                new StatTable('dmg_stellarswirl', [36, 45, 54, 63, 72]),
            ],
        }),
    ],
});
