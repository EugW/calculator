import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent, plus, times } from "../../Params";

export const Slingshot = new DbObjectWeapon({
    name: 'slingshot',
    serializeId: 38,
    gameId: 15304,
    iconClass: "weapon-icon-bow-slingshot",
    rarity: 3,
    weapon: 'bow',
    statTable: weaponStatTables.Slingshot,
    refineTable: [
        new StatTable('dmg_normal', [percent(times(weaponPassiveTables.Slingshot.p3[0], -1))]),
        new StatTable('dmg_charged', [percent(times(weaponPassiveTables.Slingshot.p3[0], -1))]),
    ],
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_slingshot',
            serializeId: 1,
            title: 'talent_name.weapon_slingshot',
            description: 'talent_descr.weapon_slingshot',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.Slingshot.p2)),
                new StatTable('dmg_normal', percent(plus(weaponPassiveTables.Slingshot.p2, weaponPassiveTables.Slingshot.p3))),
                new StatTable('dmg_charged', percent(plus(weaponPassiveTables.Slingshot.p2, weaponPassiveTables.Slingshot.p3))),
            ],
        })
    ],
});
