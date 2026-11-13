import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionCalcMoonsign } from "../../../classes/Condition/CalcMoonsign";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const BlackmarrowLantern = new DbObjectWeapon({
    name: 'blackmarrow_lantern',
    serializeId: 234,
    gameId: 14433,
    iconClass: "weapon-icon-catalyst-blackmarrow-lantern",
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.BlackmarrowLantern,
    conditions: [
        // Calculate moonsign level from party composition
        new ConditionCalcMoonsign({}),
        new ConditionStaticRefine({
            title: 'talent_name.weapon_blackmarrow_lantern',
            description: 'talent_descr.weapon_blackmarrow_lantern_1',
            stats: [
                new StatTable('dmg_reaction_bloom', percent(weaponPassiveTables.BlackmarrowLantern.p1)),
                new StatTable('dmg_reaction_lunarbloom', percent(weaponPassiveTables.BlackmarrowLantern.p2)),
            ],
        }),
        // Additional Lunar-Bloom DMG when Moonsign level >= 2 (Ascendant Gleam)
        new ConditionStaticRefine({
            title: 'talent_name.weapon_blackmarrow_lantern',
            description: 'talent_descr.weapon_blackmarrow_lantern_2',
            stats: [
                new StatTable('dmg_reaction_lunarbloom', percent(weaponPassiveTables.BlackmarrowLantern.p3)),
            ],
            subConditions: [
                new ConditionBooleanValue({
                    setting: 'party_moonsign',
                    cond: 'ge',
                    value: 2,
                }),
            ],
        }),
    ],
});
