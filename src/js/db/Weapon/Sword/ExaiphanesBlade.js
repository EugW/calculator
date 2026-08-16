import { ConditionBooleanChar } from "../../../classes/Condition/Boolean/Char";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

const travelerOnly = new ConditionBooleanChar({
    chars: [
        'traveler_anemo',
        'traveler_geo',
        'traveler_electro',
        'traveler_dendro',
        'traveler_hydro',
        'traveler_pyro',
        'traveler_cryo',
    ],
});

export const ExaiphanesBlade = new DbObjectWeapon({
    name: 'exaiphanes_blade',
    serializeId: 249,
    gameId: 11521,
    iconClass: "weapon-icon-sword-exaiphanes-blade",
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.ExaiphanesBlade,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_exaiphanes_blade_hit',
            serializeId: 1,
            title: 'talent_name.weapon_exaiphanes_blade',
            description: 'talent_descr.weapon_exaiphanes_blade_hit',
            stats: [
                new StatTable('atk_percent', [16, 20, 24, 32, 40]),
                new StatTable('text_number_energy', [3, 3, 5, 5, 5]),
            ],
            subConditions: [travelerOnly],
        }),
        new ConditionStacks({
            name: 'weapon_exaiphanes_blade_resonated_elements',
            serializeId: 2,
            title: 'talent_name.weapon_exaiphanes_blade_resonated_elements',
            description: 'talent_descr.weapon_exaiphanes_blade_resonated_elements',
            maxStacks: 7,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('crit_dmg', [0, 6, 6, 6, 6]),
            ],
            subConditions: [travelerOnly],
        }),
    ],
});
