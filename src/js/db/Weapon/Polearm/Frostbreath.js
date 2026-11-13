import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const Frostbreath = new DbObjectWeapon({
    name: 'frostbreath',
    serializeId: 252,
    gameId: 13435,
    iconClass: 'weapon-icon-polearm-frostbreath',
    rarity: 4,
    weapon: 'polearm',
    statTable: weaponStatTables.Frostbreath,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_frostbreath',
            serializeId: 1,
            title: 'talent_name.weapon_frostbreath',
            description: 'talent_descr.weapon_frostbreath',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.Frostbreath.p1)),
                new StatTable('text_number_energy', weaponPassiveTables.Frostbreath.p3),
            ],
        }),
    ],
});
