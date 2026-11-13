import { ConditionAnd } from "../../../classes/Condition/And";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionOnField } from "../../../classes/Condition/Field";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionHexereiResonance } from "../../../classes/Condition/HexereiResonance";
import { ConditionReceiver } from "../../../classes/Condition/Receiver";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent, times } from "../../Params";

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
                new StatTable('crit_dmg_burst', percent(weaponPassiveTables.AthameArtis.p1)),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_athame_artis',
            serializeId: 1,
            title: 'talent_name.weapon_athame_artis',
            description: 'talent_descr.weapon_athame_artis_2',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.AthameArtis.p3)),
                new StatTable('text_percent_atk', percent(weaponPassiveTables.AthameArtis.p3)),
                new StatTable('text_percent_atk_party', percent(weaponPassiveTables.AthameArtis.p4)),
            ],
        }),
        // Hexerei: 75% amplification to ATK buffs - hidden, auto-applies with Hexerei resonance
        new ConditionStaticRefine({
            isHidden: true,
            stats: [
                new StatTable('atk_percent', percent(times(weaponPassiveTables.AthameArtis.p3, weaponPassiveTables.AthameArtis.p5))), // share of the base ATK buff
            ],
            condition: new ConditionAnd([
                new ConditionBooleanRefine({name: 'weapon_athame_artis'}),
                new ConditionHexereiResonance({}),
            ]),
        }),
        // Nearby active party members other than the equipping character.
        // The old party condition excluded another copy of this party buff.
        new ConditionStaticRefine({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            stack: 'athame_artis',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.AthameArtis.p4)),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'weapon_athame_artis'}),
                new ConditionReceiver({condition: new ConditionOnField()}),
            ]),
        }),
        // Party Hexerei: 75% amplification - hidden, auto-applies with Hexerei resonance
        new ConditionStaticRefine({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            stack: 'athame_artis',
            stats: [
                new StatTable('atk_percent', percent(times(weaponPassiveTables.AthameArtis.p4, weaponPassiveTables.AthameArtis.p5))), // share of the party ATK buff
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'weapon_athame_artis'}),
                new ConditionHexereiResonance({}),
                new ConditionReceiver({condition: new ConditionOnField()}),
            ]),
        }),
    ],
});
