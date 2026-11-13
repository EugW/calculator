import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const FadingTwilight = new DbObjectWeapon({
    name: 'fading_twilight',
    serializeId: 123,
    gameId: 15411,
    iconClass: "weapon-icon-bow-fading-twilight",
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.FadingTwilight,
    settingsSets: [
        {
            name: 'fading_twilight_2',
            settings: {
                weapon_fading_twilight_1: 0,
                weapon_fading_twilight_2: 1,
                weapon_fading_twilight_3: 0,
            },
        },
    ],
    conditions: [
        new ConditionStatic({
            title: 'talent_name.fading_twilight',
            description: 'talent_descr.fading_twilight',
        }),
        new ConditionBooleanRefine({
            name: 'weapon_fading_twilight_1',
            serializeId: 1,
            title: 'talent_name.weapon_fading_twilight_1',
            description: 'talent_descr.weapon_fading_twilight_dmg',
            stats: [
                new StatTable('dmg_all', percent(weaponPassiveTables.FadingTwilight.p2)),
            ],
            subConditions: [
                new ConditionBooleanRefine({
                    name: 'weapon_fading_twilight_2',
                    invert: true,
                }),
                new ConditionBooleanRefine({
                    name: 'weapon_fading_twilight_3',
                    invert: true,
                }),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_fading_twilight_2',
            serializeId: 2,
            title: 'talent_name.weapon_fading_twilight_2',
            description: 'talent_descr.weapon_fading_twilight_dmg',
            stats: [
                new StatTable('dmg_all', percent(weaponPassiveTables.FadingTwilight.p3)),
            ],
            subConditions: [
                new ConditionBooleanRefine({
                    name: 'weapon_fading_twilight_1',
                    invert: true,
                }),
                new ConditionBooleanRefine({
                    name: 'weapon_fading_twilight_3',
                    invert: true,
                }),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_fading_twilight_3',
            serializeId: 3,
            title: 'talent_name.weapon_fading_twilight_3',
            description: 'talent_descr.weapon_fading_twilight_dmg',
            stats: [
                new StatTable('dmg_all', percent(weaponPassiveTables.FadingTwilight.p4)),
            ],
            subConditions: [
                new ConditionBooleanRefine({
                    name: 'weapon_fading_twilight_1',
                    invert: true,
                }),
                new ConditionBooleanRefine({
                    name: 'weapon_fading_twilight_2',
                    invert: true,
                }),
            ],
        }),
    ],
});
