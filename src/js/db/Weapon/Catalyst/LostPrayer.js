import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const LostPrayer = new DbObjectWeapon({
    name: 'lost_prayer_to_the_sacred_winds',
    serializeId: 45,
    gameId: 14502,
    iconClass: "weapon-icon-catalyst-lost-prayer-to-the-sacred-winds",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.LostPrayer,
    settingsSets: [
        {
            name: 'no_stacks',
            settings: {
                "weapon_lost_prayer": 0,
            },
        },
        {
            name: 'stacks_2',
            settings: {
                "weapon_lost_prayer": 2,
            },
        },
        {
            name: 'stacks_4',
            settings: {
                "weapon_lost_prayer": 4,
            },
        },
    ],
    conditions: [
        new ConditionStacks({
            name: 'weapon_lost_prayer',
            serializeId: 1,
            title: 'talent_name.weapon_lost_prayer',
            description: 'talent_descr.weapon_lost_prayer',
            maxStacks: 4,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_anemo', percent(weaponPassiveTables.LostPrayer.p2)),
                new StatTable('dmg_geo', percent(weaponPassiveTables.LostPrayer.p2)),
                new StatTable('dmg_pyro', percent(weaponPassiveTables.LostPrayer.p2)),
                new StatTable('dmg_electro', percent(weaponPassiveTables.LostPrayer.p2)),
                new StatTable('dmg_hydro', percent(weaponPassiveTables.LostPrayer.p2)),
                new StatTable('dmg_cryo', percent(weaponPassiveTables.LostPrayer.p2)),
                new StatTable('dmg_dendro', percent(weaponPassiveTables.LostPrayer.p2)),
            ],
        }),
    ]
});
