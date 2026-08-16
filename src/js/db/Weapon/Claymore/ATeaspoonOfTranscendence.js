import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const ATeaspoonOfTranscendence = new DbObjectWeapon({
    name: 'a_teaspoon_of_transcendence',
    serializeId: 245,
    gameId: 12516,
    iconClass: "weapon-icon-claymore-a-teaspoon-of-transcendence",
    rarity: 5,
    weapon: 'claymore',
    statTable: weaponStatTables.ATeaspoonOfTranscendence,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_a_teaspoon_of_transcendence',
            description: 'talent_descr.weapon_a_teaspoon_of_transcendence_1',
            stats: [
                new StatTable('atk_percent', [28, 35, 42, 49, 56]),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_a_teaspoon_of_transcendence',
            serializeId: 1,
            title: 'talent_name.weapon_a_teaspoon_of_transcendence',
            description: 'talent_descr.weapon_a_teaspoon_of_transcendence_2',
            maxStacks: 3,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_stellarglimmer', [16, 20, 24, 28, 32]),
            ],
        }),
    ],
});
