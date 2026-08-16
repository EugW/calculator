import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const RainbowSerpentsRainBow = new DbObjectWeapon({
    name: 'rainbow_serpents_rain_bow',
    serializeId: 238,
    gameId: 15434,
    iconClass: "weapon-icon-bow-rainbow-serpents-rain-bow",
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.RainbowSerpentsRainBow,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_rainbow_serpents_rain_bow',
            serializeId: 1,
            title: 'talent_name.weapon_rainbow_serpents_rain_bow',
            description: 'talent_descr.weapon_rainbow_serpents_rain_bow',
            stats: [
                new StatTable('atk_percent', [28, 35, 42, 49, 56]),
            ],
        }),
    ],
});
