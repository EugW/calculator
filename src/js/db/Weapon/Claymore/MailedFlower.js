import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const MailedFlower = new DbObjectWeapon({
    name: 'mailed_flower',
    serializeId: 142,
    gameId: 12418,
    iconClass: "weapon-icon-claymore-mailed-flower",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.MailedFlower,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_mailed_flower',
            serializeId: 1,
            title: 'talent_name.weapon_mailed_flower',
            description: 'talent_descr.weapon_mailed_flower',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.MailedFlower.p2)),
                new StatTable('mastery', weaponPassiveTables.MailedFlower.p3),
            ],
        }),
    ],
});
