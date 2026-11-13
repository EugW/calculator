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
export const FreedomSworn = new DbObjectWeapon({
    name: 'freedom_sworn',
    serializeId: 97,
    gameId: 11503,
    iconClass: "weapon-icon-sword-freedom-sworn",
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.FreedomSworn,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_freedom_sworn_passive',
            description: 'talent_descr.weapon_freedom_sworn_passive',
            stats: [
                new StatTable('dmg_all', weaponPassiveTables.FreedomSworn.dmg_all),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_freedom_sworn',
            serializeId: 1,
            title: 'talent_name.weapon_freedom_sworn',
            description: 'talent_descr.weapon_freedom_sworn',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.FreedomSworn.p5)),
                new StatTable('text_percent_2', percent(weaponPassiveTables.FreedomSworn.p4)),
            ],
        }),
        new ConditionStaticRefine({
            isHidden: true,
            receivers: RECEIVERS.TEAM,
            stack: 'millennial_movement_atk',
            condition: new ConditionBoolean({name: 'weapon_freedom_sworn'}),
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.FreedomSworn.p5)),
            ],
        }),
        new ConditionStaticRefine({
            isHidden: true,
            receivers: RECEIVERS.TEAM,
            stack: 'millennial_movement_attack_dmg',
            condition: new ConditionBoolean({name: 'weapon_freedom_sworn'}),
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.FreedomSworn.p4)),
                new StatTable('dmg_charged', percent(weaponPassiveTables.FreedomSworn.p4)),
                new StatTable('dmg_plunge', percent(weaponPassiveTables.FreedomSworn.p4)),
            ],
        }),
    ],
});

