import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const Hamayumi = new DbObjectWeapon({
    name: 'hamayumi',
    serializeId: 106,
    gameId: 15414,
    iconClass: "weapon-icon-bow-hamayumi",
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.Hamayumi,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_demon_slayer_bow',
            description: 'talent_descr.weapon_demon_slayer_bow_1',
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.Hamayumi.p1)),
                new StatTable('dmg_charged', percent(weaponPassiveTables.Hamayumi.p2)),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_demon_slayer_bow',
            serializeId: 1,
            title: 'talent_name.weapon_demon_slayer_bow',
            description: 'talent_descr.weapon_demon_slayer_bow_2',
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.Hamayumi.p1)),
                new StatTable('dmg_charged', percent(weaponPassiveTables.Hamayumi.p2)),
            ],
        }),
    ],
});
