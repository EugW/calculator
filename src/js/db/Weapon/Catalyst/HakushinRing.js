import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const HakushinRing = new DbObjectWeapon({
    name: 'hakushin_ring',
    serializeId: 104,
    gameId: 14414,
    iconClass: "weapon-icon-catalyst-hakushin-ring",
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.HakushinRing,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_white_dragon_ring',
            serializeId: 1,
            receivers: RECEIVERS.TEAM,
            stack: 'white_dragon_ring',
            title: 'talent_name.weapon_white_dragon_ring',
            description: 'talent_descr.weapon_white_dragon_ring',
            stats: [
                new StatTable('dmg_own', percent(weaponPassiveTables.HakushinRing.p1)),
            ],
        }),
    ],
});
