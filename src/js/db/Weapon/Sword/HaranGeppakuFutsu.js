import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const HaranGeppakuFutsu = new DbObjectWeapon({
    name: 'haran_geppaku_futsu',
    serializeId: 121,
    gameId: 11510,
    iconClass: "weapon-icon-sword-haran-geppaku-futsu",
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.HaranGeppakuFutsu,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.haran_geppaku_futsu',
            description: 'talent_descr.haran_geppaku_futsu_1',
            stats: [
                new StatTable('dmg_anemo', percent(weaponPassiveTables.HaranGeppakuFutsu.p1)),
                new StatTable('dmg_geo', percent(weaponPassiveTables.HaranGeppakuFutsu.p1)),
                new StatTable('dmg_pyro', percent(weaponPassiveTables.HaranGeppakuFutsu.p1)),
                new StatTable('dmg_electro', percent(weaponPassiveTables.HaranGeppakuFutsu.p1)),
                new StatTable('dmg_hydro', percent(weaponPassiveTables.HaranGeppakuFutsu.p1)),
                new StatTable('dmg_cryo', percent(weaponPassiveTables.HaranGeppakuFutsu.p1)),
                new StatTable('dmg_dendro', percent(weaponPassiveTables.HaranGeppakuFutsu.p1)),
            ],
        }),
        new ConditionStacks({
            name: 'haran_geppaku_futsu',
            serializeId: 1,
            title: 'talent_name.haran_geppaku_futsu_2',
            description: 'talent_descr.haran_geppaku_futsu_2',
            maxStacks: weaponPassiveTables.HaranGeppakuFutsu.p2[0],
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.HaranGeppakuFutsu.p4)),
            ],
        }),
    ],
});

