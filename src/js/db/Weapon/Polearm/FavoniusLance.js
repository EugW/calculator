import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const FavoniusLance = new DbObjectWeapon({
    name: 'favonius_lance',
    serializeId: 90,
    gameId: 13407,
    iconClass: "weapon-icon-polearm-favonius-lance",
    rarity: 4,
    weapon: 'polearm',
    statTable: weaponStatTables.FavoniusLance,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_favonoius_passive',
            description: 'talent_descr.weapon_favonoius_passive',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.FavoniusLance.p1)),
                new StatTable('text_cooldown', weaponPassiveTables.FavoniusLance.p2),
            ],
        }),
    ],
});
