import { ConditionAnd } from "../../../classes/Condition/And";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionOnField } from "../../../classes/Condition/Field";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionHexereiResonance } from "../../../classes/Condition/HexereiResonance";
import { ConditionReceiver } from "../../../classes/Condition/Receiver";
import { ConditionRetired } from "../../../classes/Condition/Retired";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { ConditionWitchHomework } from "../../../classes/Condition/WitchHomework";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { PostEffectStatsAtk } from "../../../classes/PostEffect/Stats/Atk";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent, times } from "../../Params";

const activeCondition = new ConditionAnd([
    new ConditionBoolean({name: 'weapon_angelos_heptades'}),
    new ConditionReceiver({condition: new ConditionOnField()}),
]);

const offFieldCondition = new ConditionAnd([
    new ConditionBoolean({name: 'weapon_angelos_heptades'}),
    new ConditionHexereiResonance({}),
    new ConditionReceiver({condition: new ConditionAnd([
        new ConditionOnField({invert: true}),
        new ConditionWitchHomework({}),
    ])}),
]);

// Pathfinder's Light (active recipient): team DMG% from the holder's ATK.
// Game data (Weapon_Catalyst_Nicole, openConfig of affix 114523 for icon
// UI_EquipIcon_Catalyst_FairyGarden): UNIQUE_Weapon_Catalyst_Nicole_Buff_Driver
// computes BuffRatio from FIGHT_PROP_NONEXTRA_ATTACK (premod) times
// BuffTransRatio per PerAttack, capped at BuffRatioMax, and
// Weapon_Catalyst_Nicole_Buff applies it as a hit-level ModifyDamageMixin
// (no Actor_ write, so no premod/extra marker on the write side; dmg_all has
// no extra lane, md/buff_chains.md). GO reads input.premod.atk for the same
// value. KQM has no buff-chain test for this weapon. Default confirmed
// (premod read, extra write side is a no-op for dmg_all): no params.
// The old party row excluded the wielder's own Pathfinder's Light. Both
// recipient variants belong to the same non-stacking effect.
const activePathfindersLight = new PostEffectStatsAtk({
    receivers: RECEIVERS.TEAM,
    stack: 'angelos_heptades',
    levelSetting: 'weapon_refine',
    percent: new StatTable('dmg_all', percent(times(weaponPassiveTables.AngelosHeptades.p3, 0.001))),
    statCap: new StatTable('', percent(weaponPassiveTables.AngelosHeptades.p4)),
    conditions: [activeCondition],
});

// Hexerei Secret Rite (off-field Hexerei recipient): half of Pathfinder's
// Light. Game data (UNIQUE_Weapon_Catalyst_Nicole_Hexenzirkel_Driver):
// BuffRatio_Hexenzirkel is Hexenzirkel_Ratio (0.5, affix 114523) times the
// same FIGHT_PROP_NONEXTRA_ATTACK (premod) computation, capped at half the
// BuffRatioMax, applied by UNIQUE_Weapon_Catalyst_Nicole_Buff_Hexenzirkel_Buff
// (ModifyDamageMixin, no Actor_ write). Same evidence as the active variant:
// default confirmed, no params.
const offFieldHexereiPathfindersLight = new PostEffectStatsAtk({
    receivers: RECEIVERS.TEAM,
    stack: 'angelos_heptades',
    levelSetting: 'weapon_refine',
    percent: new StatTable('dmg_all', percent(times(weaponPassiveTables.AngelosHeptades.p3, weaponPassiveTables.AngelosHeptades.p8, 0.001))),
    statCap: new StatTable('', percent(times(weaponPassiveTables.AngelosHeptades.p4, weaponPassiveTables.AngelosHeptades.p8))),
    conditions: [offFieldCondition],
});

export const AngelosHeptades = new DbObjectWeapon({
    name: 'angelos_heptades',
    serializeId: 244,
    gameId: 14523,
    iconClass: "weapon-icon-catalyst-angelos-heptades",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.AngelosHeptades,
    conditions: [
        // ATK% on the holder (affix 114523 addProps FIGHT_PROP_ATTACK_PERCENT,
        // R1 12%): a flat toggle, premod by construction, no stat read.
        new ConditionStaticRefine({
            title: 'talent_name.weapon_angelos_heptades',
            description: 'talent_descr.weapon_angelos_heptades_calc',
            stats: [
                new StatTable('atk_percent', weaponPassiveTables.AngelosHeptades.atk_percent),
                new StatTable('text_percent', percent(weaponPassiveTables.AngelosHeptades.p3)),
                new StatTable('text_percent_max', percent(weaponPassiveTables.AngelosHeptades.p4)),
                new StatTable('text_energy', weaponPassiveTables.AngelosHeptades.p6),
                new StatTable('text_percent_hexerei', percent(times(weaponPassiveTables.AngelosHeptades.p3, weaponPassiveTables.AngelosHeptades.p8))),
                new StatTable('text_percent_max_hexerei', percent(times(weaponPassiveTables.AngelosHeptades.p4, weaponPassiveTables.AngelosHeptades.p8))),
            ],
        }),
        // Field state is now per recipient. Consume the old local mode's
        // dropdown ID without reusing it for the activation checkbox.
        new ConditionRetired({serializeId: 1, type: 'dropdown'}),
        new ConditionBooleanRefine({
            name: 'weapon_angelos_heptades',
            serializeId: 2,
            title: 'talent_name.weapon_angelos_heptades_2',
            description: 'talent_descr.weapon_angelos_heptades_mode',
            stats: [
                new StatTable('text_percent_max', percent(weaponPassiveTables.AngelosHeptades.p4)),
                new StatTable('text_percent_max_hexerei', percent(times(weaponPassiveTables.AngelosHeptades.p4, weaponPassiveTables.AngelosHeptades.p8))),
            ],
        }),
    ],
    postEffects: [activePathfindersLight, offFieldHexereiPathfindersLight],
    features: [
        // Displays of the classified post-effects above: they show the
        // post-effect's value and read no stat of their own.
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'dmg_bonus',
            postEffect: activePathfindersLight,
            condition: activeCondition,
            format: 'percent',
        }),
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'dmg_bonus',
            postEffect: offFieldHexereiPathfindersLight,
            condition: offFieldCondition,
            format: 'percent',
        }),
    ],
});
