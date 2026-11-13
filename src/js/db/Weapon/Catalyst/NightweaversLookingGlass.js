import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

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
                new StatTable('mastery', weaponPassiveTables.NightweaversLookingGlass.p1),
            ],
        }),
        // New Moon Verse: EM +60 for 10s (Lunar-Bloom triggered)
        new ConditionBooleanRefine({
            name: 'weapon_nightweavers_looking_glass_2',
            serializeId: 2,
            title: 'talent_name.weapon_nightweavers_looking_glass',
            description: 'talent_descr.weapon_nightweavers_looking_glass_2',
            stats: [
                new StatTable('mastery', weaponPassiveTables.NightweaversLookingGlass.p3),
            ],
        }),
        // Combined effect: Bloom/Hyperbloom/Burgeon/Lunar-Bloom bonuses (both buffs active)
        // Millennial Hymn: This effect cannot stack.
        new ConditionBooleanRefine({
            name: 'weapon_nightweavers_looking_glass_3',
            serializeId: 3,
            receivers: RECEIVERS.TEAM,
            stack: 'nightweavers_looking_glass',
            title: 'talent_name.weapon_nightweavers_looking_glass',
            description: 'talent_descr.weapon_nightweavers_looking_glass_3',
            stats: [
                new StatTable('dmg_reaction_bloom', percent(weaponPassiveTables.NightweaversLookingGlass.p5)),
                new StatTable('dmg_reaction_hyperbloom', percent(weaponPassiveTables.NightweaversLookingGlass.p6)),
                new StatTable('dmg_reaction_burgeon', percent(weaponPassiveTables.NightweaversLookingGlass.p6)),
                new StatTable('dmg_reaction_lunarbloom', percent(weaponPassiveTables.NightweaversLookingGlass.p7)),
            ],
        }),
    ],
});
