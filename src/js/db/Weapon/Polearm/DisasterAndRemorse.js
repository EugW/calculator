import { ConditionAnd } from "../../../classes/Condition/And";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionHexereiResonance } from "../../../classes/Condition/HexereiResonance";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

const dmgBonus = [40, 50, 60, 70, 80];
const hexereiBonus = [30, 37.5, 45, 52.5, 60];

export const DisasterAndRemorse = new DbObjectWeapon({
    name: 'disaster_and_remorse',
    serializeId: 243,
    gameId: 13517,
    iconClass: "weapon-icon-polearm-disaster-and-remorse",
    rarity: 5,
    weapon: 'polearm',
    statTable: weaponStatTables.DisasterAndRemorse,
    settingsSets: [
        {
            name: 'unforgivable',
            settings: { "weapon_disaster_and_remorse_unforgivable": true },
        },
        {
            name: 'irreparable',
            settings: { "weapon_disaster_and_remorse_irreparable": true },
        },
        {
            name: 'both',
            settings: {
                "weapon_disaster_and_remorse_unforgivable": true,
                "weapon_disaster_and_remorse_irreparable": true,
            },
        },
    ],
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_disaster_and_remorse',
            description: 'talent_descr.weapon_disaster_and_remorse_calc',
            stats: [
                new StatTable('text_percent_unforgivable', dmgBonus),
                new StatTable('text_percent_irreparable', dmgBonus),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_disaster_and_remorse_unforgivable',
            serializeId: 1,
            title: 'talent_name.weapon_disaster_and_remorse_unforgivable',
            stats: [
                new StatTable('dmg_normal', dmgBonus),
                new StatTable('dmg_charged', dmgBonus),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_disaster_and_remorse_irreparable',
            serializeId: 2,
            title: 'talent_name.weapon_disaster_and_remorse_irreparable',
            stats: [
                new StatTable('dmg_skill', dmgBonus),
                new StatTable('dmg_burst', dmgBonus),
            ],
        }),
        new ConditionStaticRefine({
            isHidden: true,
            stats: [
                new StatTable('dmg_normal', hexereiBonus),
                new StatTable('dmg_charged', hexereiBonus),
            ],
            condition: new ConditionAnd([
                new ConditionBooleanRefine({name: 'weapon_disaster_and_remorse_unforgivable'}),
                new ConditionHexereiResonance({}),
            ]),
        }),
        new ConditionStaticRefine({
            isHidden: true,
            stats: [
                new StatTable('dmg_skill', hexereiBonus),
                new StatTable('dmg_burst', hexereiBonus),
            ],
            condition: new ConditionAnd([
                new ConditionBooleanRefine({name: 'weapon_disaster_and_remorse_irreparable'}),
                new ConditionHexereiResonance({}),
            ]),
        }),
    ],
});
