import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const BalladoftheBoundlessBlue = new DbObjectWeapon({
    name: 'ballad_of_the_boundless_blue',
    serializeId: 162,
    gameId: 14426,
    iconClass: "weapon-icon-catalyst-ballad-of-the-boundless-blue",
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.BalladoftheBoundlessBlue,
    conditions: [
        new ConditionStacks({
            name: 'weapon_azure_skies',
            serializeId: 1,
            title: 'talent_name.weapon_azure_skies',
            description: 'talent_descr.weapon_azure_skies',
            maxStacks: 3,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.BalladoftheBoundlessBlue.p3)),
                new StatTable('dmg_charged', percent(weaponPassiveTables.BalladoftheBoundlessBlue.p4)),
            ],
        }),
    ],
});

