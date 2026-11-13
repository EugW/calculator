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
export const ElegyfortheEnd = new DbObjectWeapon({
    name: 'elegy_for_the_end',
    serializeId: 27,
    gameId: 15503,
    iconClass: "weapon-icon-bow-elegy-for-the-end",
    rarity: 5,
    weapon: 'bow',
    statTable: weaponStatTables.ElegyfortheEnd,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_elegy_for_the_end_passive',
            description: 'talent_descr.weapon_elegy_for_the_end_passive',
            stats: [
                new StatTable('mastery', weaponPassiveTables.ElegyfortheEnd.mastery),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_elegy_for_the_end',
            serializeId: 1,
            title: 'talent_name.weapon_elegy_for_the_end',
            description: 'talent_descr.weapon_elegy_for_the_end',
            stats: [
                new StatTable('text_value', weaponPassiveTables.ElegyfortheEnd.p4),
                new StatTable('text_percent', percent(weaponPassiveTables.ElegyfortheEnd.p5)),
            ],
        }),
        new ConditionStaticRefine({
            isHidden: true,
            receivers: RECEIVERS.TEAM,
            stack: 'millennial_movement_atk',
            condition: new ConditionBoolean({name: 'weapon_elegy_for_the_end'}),
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.ElegyfortheEnd.p5)),
            ],
        }),
        new ConditionStaticRefine({
            isHidden: true,
            receivers: RECEIVERS.TEAM,
            stack: 'millennial_movement_mastery',
            condition: new ConditionBoolean({name: 'weapon_elegy_for_the_end'}),
            stats: [
                new StatTable('mastery', weaponPassiveTables.ElegyfortheEnd.p4),
            ],
        }),
    ],
});

