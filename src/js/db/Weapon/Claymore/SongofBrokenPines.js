import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

// Millennial Movement: buffs of the same type do not stack. The ATK% part is
// one type shared by Elegy for the End, Song of Broken Pines and
// Freedom-Sworn; each weapon's other part is a type of its own.
export const SongofBrokenPines = new DbObjectWeapon({
    name: 'song_of_broken_pines',
    serializeId: 96,
    gameId: 12503,
    iconClass: "weapon-icon-claymore-song-of-broken-pines",
    rarity: 5,
    weapon: 'claymore',
    statTable: weaponStatTables.SongofBrokenPines,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_song_of_broken_pines_passive',
            description: 'talent_descr.weapon_song_of_broken_pines_passive',
            stats: [
                new StatTable('atk_percent', weaponPassiveTables.SongofBrokenPines.atk_percent),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_song_of_broken_pines',
            serializeId: 1,
            title: 'talent_name.weapon_song_of_broken_pines',
            description: 'talent_descr.weapon_song_of_broken_pines',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.SongofBrokenPines.p5)),
                new StatTable('text_percent_2', percent(weaponPassiveTables.SongofBrokenPines.p4)),
            ],
        }),
        new ConditionStaticRefine({
            isHidden: true,
            receivers: RECEIVERS.TEAM,
            stack: 'millennial_movement_atk',
            condition: new ConditionBoolean({name: 'weapon_song_of_broken_pines'}),
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.SongofBrokenPines.p5)),
            ],
        }),
        new ConditionStaticRefine({
            isHidden: true,
            receivers: RECEIVERS.TEAM,
            stack: 'millennial_movement_atk_speed',
            condition: new ConditionBoolean({name: 'weapon_song_of_broken_pines'}),
            stats: [
                new StatTable('atk_speed_normal', percent(weaponPassiveTables.SongofBrokenPines.p4)),
            ],
        }),
    ],
});

