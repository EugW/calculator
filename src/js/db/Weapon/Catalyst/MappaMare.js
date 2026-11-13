import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const MappaMare = new DbObjectWeapon({
    name: 'mappa_mare',
    serializeId: 54,
    gameId: 14407,
    iconClass: "weapon-icon-catalyst-mappa-mare",
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.MappaMare,
    conditions: [
        new ConditionStacks({
            name: 'weapon_mappa_mare',
            serializeId: 1,
            title: 'talent_name.weapon_mappa_mare',
            description: 'talent_descr.weapon_mappa_mare',
            maxStacks: 2,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_anemo', percent(weaponPassiveTables.MappaMare.p1)),
                new StatTable('dmg_geo', percent(weaponPassiveTables.MappaMare.p1)),
                new StatTable('dmg_pyro', percent(weaponPassiveTables.MappaMare.p1)),
                new StatTable('dmg_electro', percent(weaponPassiveTables.MappaMare.p1)),
                new StatTable('dmg_hydro', percent(weaponPassiveTables.MappaMare.p1)),
                new StatTable('dmg_cryo', percent(weaponPassiveTables.MappaMare.p1)),
                new StatTable('dmg_dendro', percent(weaponPassiveTables.MappaMare.p1)),
            ],
        }),
    ]
});
