import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const FracturedHalo = new DbObjectWeapon({
    name: 'fractured_halo',
    serializeId: 222,
    gameId: 13515,
    iconClass: "weapon-icon-polearm-fractured-halo",
    rarity: 5,
    weapon: 'polearm',
    statTable: weaponStatTables.FracturedHalo,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_fractured_halo',
            serializeId: 1,
            title: 'talent_name.weapon_fractured_halo',
            description: 'talent_descr.weapon_fractured_halo_1',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.FracturedHalo.p1)),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_fractured_halo_2',
            serializeId: 2,
            receivers: RECEIVERS.TEAM,
            stack: 'fractured_halo',
            title: 'talent_name.weapon_fractured_halo',
            description: 'talent_descr.weapon_fractured_halo_2',
            stats: [
                new StatTable('dmg_reaction_lunarcharged', percent(weaponPassiveTables.FracturedHalo.p3)),
            ],
        }),
    ],
});
