import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const SymphonistofScents = new DbObjectWeapon({
    name: 'symphonist_of_scents',
    serializeId: 199,
    gameId: 13514,
    iconClass: "weapon-icon-polearm-symphonist-of-scents",
    rarity: 5,
    weapon: 'polearm',
    statTable: weaponStatTables.SymphonistofScents,
    settingsSets: [
        {
            name: 'no_heal',
            settings: {
                "symphonist_of_scents_2": 1,
                "symphonist_of_scents_3": 0,
            },
        },
        {
            name: 'with_heal',
            settings: {
                "symphonist_of_scents_2": 1,
                "symphonist_of_scents_3": 1,
            },
        },
    ],
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_symphonist_of_scents',
            description: 'talent_descr.weapon_symphonist_of_scents_1',
            stats: [
                new StatTable('atk_percent', weaponPassiveTables.SymphonistofScents.atk_percent),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'symphonist_of_scents_2',
            serializeId: 1,
            title: 'talent_name.weapon_symphonist_of_scents',
            description: 'talent_descr.weapon_symphonist_of_scents_2',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.SymphonistofScents.p2)),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'symphonist_of_scents_3',
            serializeId: 2,
            receivers: RECEIVERS.TEAM,
            stack: 'symphonist_of_scents',
            title: 'talent_name.weapon_symphonist_of_scents',
            description: 'talent_descr.weapon_symphonist_of_scents_3',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.SymphonistofScents.p3)),
            ],
        }),
    ],
});

