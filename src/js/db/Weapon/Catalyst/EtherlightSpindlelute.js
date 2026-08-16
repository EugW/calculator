import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const EtherlightSpindlelute = new DbObjectWeapon({
    name: 'etherlight_spindlelute',
    serializeId: 233,
    gameId: 14432,
    iconClass: "weapon-icon-catalyst-etherlight-spindlelute",
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.EtherlightSpindlelute,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_etherlight_spindlelute',
            serializeId: 1,
            title: 'talent_name.weapon_etherlight_spindlelute',
            description: 'talent_descr.weapon_etherlight_spindlelute',
            stats: [
                new StatTable('mastery', [100, 125, 150, 175, 200]),
            ],
        }),
    ],
});
