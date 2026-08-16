import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const SongOfTheVigil = new DbObjectWeapon({
    name: 'song_of_the_vigil',
    serializeId: 253,
    gameId: 13436,
    iconClass: 'weapon-icon-polearm-song-of-the-vigil',
    rarity: 4,
    weapon: 'polearm',
    statTable: weaponStatTables.SongOfTheVigil,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_song_of_the_vigil',
            description: 'talent_descr.weapon_song_of_the_vigil_1',
            stats: [
                new StatTable('text_number_energy', [4, 5, 6, 7, 8]),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_song_of_the_vigil_stellarglimmer',
            serializeId: 1,
            title: 'talent_name.weapon_song_of_the_vigil',
            description: 'talent_descr.weapon_song_of_the_vigil_2',
            stats: [
                new StatTable('atk_percent', [20, 25, 30, 35, 40]),
            ],
        }),
    ],
});
