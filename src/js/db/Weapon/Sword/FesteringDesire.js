import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const FesteringDesire = new DbObjectWeapon({
    name: 'festering_desire',
    serializeId: 8,
    gameId: 11413,
    iconClass: "weapon-icon-sword-festering-desire",
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.FesteringDesire,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_festering_desire',
            description: 'talent_descr.weapon_festering_desire',
            stats: [
                new StatTable('dmg_skill', percent(weaponPassiveTables.FesteringDesire.p1)),
                new StatTable('crit_rate_skill', percent(weaponPassiveTables.FesteringDesire.p2)),
            ],
        }),
    ],
});
