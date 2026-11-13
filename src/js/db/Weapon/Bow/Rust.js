import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent, times } from "../../Params";

export const Rust = new DbObjectWeapon({
    name: 'rust',
    serializeId: 34,
    gameId: 15405,
    iconClass: "weapon-icon-bow-rust",
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.Rust,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_rust_passive',
            description: 'talent_descr.weapon_rust_passive',
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.Rust.p1)),
                new StatTable('dmg_charged', [percent(times(weaponPassiveTables.Rust.p2[0], -1))]),
                new StatTable('text_percent', [percent(weaponPassiveTables.Rust.p2[0])]),
            ],
        }),
    ],
});

