import { ConditionAnd } from "../../../classes/Condition/And";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionHexereiResonance } from "../../../classes/Condition/HexereiResonance";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const AthameArtis = new DbObjectWeapon({
    name: 'athame_artis',
    serializeId: 224,
    gameId: 11518,
    iconClass: "weapon-icon-sword-athame-artis",
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.AthameArtis,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_athame_artis',
            description: 'talent_descr.weapon_athame_artis_1',
            stats: [
                new StatTable('crit_dmg_burst', [16, 20, 24, 28, 32]),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_athame_artis',
            serializeId: 1,
            title: 'talent_name.weapon_athame_artis',
            description: 'talent_descr.weapon_athame_artis_2_full',
            stats: [
                new StatTable('atk_percent', [20, 25, 30, 35, 40]),
                new StatTable('text_percent', [20, 25, 30, 35, 40]),
                new StatTable('text_percent_2', [15, 18.75, 22.5, 26.25, 30]),
            ],
        }),
        // Hexerei: 75% amplification to ATK buffs - hidden, auto-applies with Hexerei resonance
        new ConditionStaticRefine({
            isHidden: true,
            stats: [
                new StatTable('atk_percent', [15, 18.75, 22.5, 26.25, 30]), // 75% of base ATK buff
            ],
            condition: new ConditionAnd([
                new ConditionBooleanRefine({name: 'weapon_athame_artis'}),
                new ConditionHexereiResonance({}),
            ]),
        }),
    ],
    partyConditions: [
        // Party ATK buff (Day King's Splendor Solis)
        new ConditionBooleanRefine({
            name: 'weapon_athame_artis_party',
            serializeId: 1,
            title: 'weapon_name.athame_artis',
            description: 'talent_descr.weapon_athame_artis_party_full',
            stats: [
                new StatTable('atk_percent', [16, 20, 24, 28, 32]),
                new StatTable('text_percent', [16, 20, 24, 28, 32]),
                new StatTable('text_percent_2', [12, 15, 18, 21, 24]),
            ],
        }),
        // Party Hexerei: 75% amplification - hidden, auto-applies with Hexerei resonance
        new ConditionStaticRefine({
            isHidden: true,
            stats: [
                new StatTable('atk_percent', [12, 15, 18, 21, 24]), // 75% of party ATK buff
            ],
            condition: new ConditionAnd([
                new ConditionBooleanRefine({name: 'weapon_athame_artis_party'}),
                new ConditionHexereiResonance({}),
            ]),
        }),
    ],
});
