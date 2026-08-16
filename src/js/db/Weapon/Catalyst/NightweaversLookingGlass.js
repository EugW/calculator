import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const NightweaversLookingGlass = new DbObjectWeapon({
    name: 'nightweavers_looking_glass',
    serializeId: 231,
    gameId: 14520,
    iconClass: "weapon-icon-catalyst-nightweavers-looking-glass",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.NightweaversLookingGlass,
    conditions: [
        // Prayer of the Far North: EM +60 for 4.5s (Skill deals Hydro/Dendro DMG)
        new ConditionBooleanRefine({
            name: 'weapon_nightweavers_looking_glass',
            serializeId: 1,
            title: 'talent_name.weapon_nightweavers_looking_glass',
            description: 'talent_descr.weapon_nightweavers_looking_glass_1',
            stats: [
                new StatTable('mastery', [60, 75, 90, 105, 120]),
            ],
        }),
        // New Moon Verse: EM +60 for 10s (Lunar-Bloom triggered)
        new ConditionBooleanRefine({
            name: 'weapon_nightweavers_looking_glass_2',
            serializeId: 2,
            title: 'talent_name.weapon_nightweavers_looking_glass',
            description: 'talent_descr.weapon_nightweavers_looking_glass_2',
            stats: [
                new StatTable('mastery', [60, 75, 90, 105, 120]),
            ],
        }),
        // Combined effect: Bloom/Hyperbloom/Burgeon/Lunar-Bloom bonuses (both buffs active)
        new ConditionBooleanRefine({
            name: 'weapon_nightweavers_looking_glass_3',
            serializeId: 3,
            title: 'talent_name.weapon_nightweavers_looking_glass',
            description: 'talent_descr.weapon_nightweavers_looking_glass_3',
            stats: [
                new StatTable('dmg_reaction_bloom', [120, 150, 180, 210, 240]),
                new StatTable('dmg_reaction_hyperbloom', [80, 100, 120, 140, 160]),
                new StatTable('dmg_reaction_burgeon', [80, 100, 120, 140, 160]),
                new StatTable('dmg_reaction_lunarbloom', [40, 50, 60, 70, 80]),
            ],
        }),
    ],
    partyConditions: [
        // Combined effect for party members: Bloom/Hyperbloom/Burgeon/Lunar-Bloom bonuses
        new ConditionBooleanRefine({
            name: 'weapon_nightweavers_looking_glass_party',
            serializeId: 1,
            title: 'weapon_name.nightweavers_looking_glass',
            description: 'talent_descr.weapon_nightweavers_looking_glass_party',
            stats: [
                new StatTable('dmg_reaction_bloom', [120, 150, 180, 210, 240]),
                new StatTable('dmg_reaction_hyperbloom', [80, 100, 120, 140, 160]),
                new StatTable('dmg_reaction_burgeon', [80, 100, 120, 140, 160]),
                new StatTable('dmg_reaction_lunarbloom', [40, 50, 60, 70, 80]),
            ],
        }),
    ],
});
