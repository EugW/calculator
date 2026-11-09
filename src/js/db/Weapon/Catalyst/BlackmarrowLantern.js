import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionCalcMoonsign } from "../../../classes/Condition/CalcMoonsign";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const BlackmarrowLantern = new DbObjectWeapon({
    name: 'blackmarrow_lantern',
    serializeId: 234,
    gameId: 14433,
    iconClass: "weapon-icon-catalyst-blackmarrow-lantern",
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.BlackmarrowLantern,
    conditions: [
        new ConditionCalcMoonsign({}),
        new ConditionStaticRefine({
            title: 'talent_name.weapon_blackmarrow_lantern',
            description: 'talent_descr.weapon_blackmarrow_lantern_1',
            stats: [
                new StatTable('dmg_reaction_bloom', [48, 60, 72, 84, 96]),
                new StatTable('dmg_reaction_lunarbloom', [12, 15, 18, 21, 24]),
            ],
        }),
        // Moonsign: Ascendant Gleam: additional Lunar-Bloom DMG.
        new ConditionStaticRefine({
            title: 'talent_name.weapon_blackmarrow_lantern',
            description: 'talent_descr.weapon_blackmarrow_lantern_2',
            stats: [
                new StatTable('dmg_reaction_lunarbloom', [12, 15, 18, 21, 24]),
            ],
            condition: new ConditionBooleanValue({setting: 'party_moonsign', cond: 'ge', value: 2}),
        }),
    ],
});
