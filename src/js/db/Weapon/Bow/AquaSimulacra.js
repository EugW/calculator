import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const AquaSimulacra = new DbObjectWeapon({
    name: 'aqua_simulacra',
    serializeId: 122,
    gameId: 15508,
    iconClass: "weapon-icon-bow-aqua-simulacra",
    rarity: 5,
    weapon: 'bow',
    statTable: weaponStatTables.AquaSimulacra,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.aqua_simulacra',
            description: 'talent_descr.aqua_simulacra_1',
            stats: [
                new StatTable('hp_percent', weaponPassiveTables.AquaSimulacra.hp_percent),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_aqua_simulacra',
            serializeId: 1,
            title: 'talent_name.aqua_simulacra',
            description: 'talent_descr.aqua_simulacra_2',
            stats: [
                new StatTable('dmg_all', percent(weaponPassiveTables.AquaSimulacra.p2)),
            ],
        }),
    ],
});
