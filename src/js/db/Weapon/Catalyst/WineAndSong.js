import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const WineAndSong = new DbObjectWeapon({
    name: 'wine_and_song',
    serializeId: 46,
    gameId: 14410,
    iconClass: "weapon-icon-catalyst-wine-and-song",
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.WineandSong,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_wine_and_song',
            serializeId: 1,
            title: 'talent_name.weapon_wine_and_song',
            description: 'talent_descr.weapon_wine_and_song',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.WineandSong.p1)),
                new StatTable('text_percent', percent(weaponPassiveTables.WineandSong.p3)),
            ],
        }),
    ],
});
