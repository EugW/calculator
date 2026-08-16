import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const EchoesOfTheHeart = new DbObjectWeapon({
    name: 'echoes_of_the_heart',
    serializeId: 255,
    gameId: 14436,
    iconClass: 'weapon-icon-catalyst-echoes-of-the-heart',
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.EchoesOfTheHeart,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_echoes_of_the_heart_reaction',
            serializeId: 1,
            title: 'talent_name.weapon_echoes_of_the_heart',
            description: 'talent_descr.weapon_echoes_of_the_heart_1',
            stats: [
                new StatTable('mastery', [60, 75, 90, 105, 120]),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_echoes_of_the_heart_stellarglimmer',
            serializeId: 2,
            title: 'talent_name.weapon_echoes_of_the_heart',
            description: 'talent_descr.weapon_echoes_of_the_heart_2',
            stats: [
                new StatTable('dmg_stellarglimmer', [16, 20, 24, 28, 32]),
            ],
        }),
    ],
});
