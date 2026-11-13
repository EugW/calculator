import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";
import { atkTables } from "../AtkTables";

export const TalkingStick = new DbObjectWeapon({
    name: 'talking_stick',
    serializeId: 149,
    gameId: 12424,
    iconClass: 'weapon-icon-claymore-talking-stick',
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.TalkingStick,
    settingsSets: [
        {
            name: 'unbuffed',
            settings: {
                "weapon_talking_stick_1": 0,
                "weapon_talking_stick_2": 0,
            },
        },
        {
            name: 'stick_pypo',
            settings: {
                "weapon_talking_stick_1": 1,
                "weapon_talking_stick_2": 0,
            },
        },
        {
            name: 'stick_other',
            settings: {
                "weapon_talking_stick_1": 0,
                "weapon_talking_stick_2": 1,
            },
        },
    ],
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_talking_stick_1',
            serializeId: 1,
            title: 'talent_name.weapon_talking_stick_1',
            description: 'talent_descr.weapon_talking_stick_1',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.TalkingStick.p5)),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_talking_stick_2',
            serializeId: 2,
            title: 'talent_name.weapon_talking_stick_2',
            description: 'talent_descr.weapon_talking_stick_2',
            stats: [
                new StatTable('dmg_anemo', percent(weaponPassiveTables.TalkingStick.p6)),
                new StatTable('dmg_geo', percent(weaponPassiveTables.TalkingStick.p6)),
                new StatTable('dmg_pyro', percent(weaponPassiveTables.TalkingStick.p6)),
                new StatTable('dmg_electro', percent(weaponPassiveTables.TalkingStick.p6)),
                new StatTable('dmg_hydro', percent(weaponPassiveTables.TalkingStick.p6)),
                new StatTable('dmg_cryo', percent(weaponPassiveTables.TalkingStick.p6)),
                new StatTable('dmg_dendro', percent(weaponPassiveTables.TalkingStick.p6)),
            ],
        }),
    ],
});
