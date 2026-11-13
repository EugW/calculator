import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { CHANNELS } from "../../../classes/PostEffect/Channels";
import { PostEffectStatsHP } from "../../../classes/PostEffect/Stats/HP";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

const weaponPost = new PostEffectStatsHP({
    // Game data: Weapon_Pole_Homa_MaxHpToAtk sets
    // UNIQUE_Pole_Homa_MaxHpToAtk_Buff as [FIGHT_PROP_MAX_HP,
    // MaxHptoAtk_Factor, MUL] (total; the low-HP branch adds
    // [FIGHT_PROP_MAX_HP, MaxHptoAtk_Extra_Factor, MUL]) and writes
    // Actor_AttackExtraDelta (extra, default). FIGHT_PROP_MAX_HP is the
    // total marker (md/buff_chains.md), as for Hu Tao's skill, Baizhu's A4,
    // Candace's A4 and Chevreuse's A4; the same number as premod while no
    // ability writes extra HP. Declared reads: TOTAL. GO reads
    // input.premod.hp here (supporting evidence only; the data says total).
    // KQM has no Staff of Homa buff-chain test. R1 rates from
    // EquipAffixExcelConfigData (affix 113501x): 0.8% base, +1% below 50% HP.
    reads: CHANNELS.TOTAL,
    levelSetting: 'weapon_refine',
    percent: new StatTable('atk', weaponPassiveTables.StaffofHoma.p2),
    percentBonusLevel: 'weapon_refine',
    percentBonus: new StatTable('atk', weaponPassiveTables.StaffofHoma.p3),
    bonusCondition: new ConditionBoolean({name: 'weapon_staff_of_homa'}),
});

export const StaffofHoma = new DbObjectWeapon({
    name: 'staff_of_homa',
    serializeId: 80,
    gameId: 13501,
    iconClass: "weapon-icon-polearm-staff-of-homa",
    rarity: 5,
    weapon: 'polearm',
    statTable: weaponStatTables.StaffofHoma,
    settingsSets: [
        {
            name: 'unbuffed',
            settings: {
                "weapon_staff_of_homa": 0,
            },
        },
        {
            name: 'buffed',
            settings: {
                "weapon_staff_of_homa": 1,
            },
        },
    ],
    conditions: [
        // HP% passive (EquipAffixExcelConfigData affix 113501x addProps
        // FIGHT_PROP_HP_PERCENT, 20-40%): a flat condition, always premod,
        // needs nothing. The ATK conversion above reads total HP, so it
        // counts this HP% (as the game does: Max HP includes the passive).
        new ConditionStaticRefine({
            title: 'talent_name.weapon_staff_of_homa',
            description: 'talent_descr.weapon_staff_of_homa_passive',
            stats: [
                new StatTable('hp_percent', weaponPassiveTables.StaffofHoma.hp_percent),
                new StatTable('text_percent', percent(weaponPassiveTables.StaffofHoma.p2)),
            ],
        }),
        // Below-50% HP gate (game: ByTargetHPRatio LesserOrEqual 0.5
        // switching between the Handler and Extra_Handler branches): an HP
        // ratio toggle, not a stat read; flat conditions are always premod
        // and need nothing.
        new ConditionBooleanRefine({
            name: 'weapon_staff_of_homa',
            serializeId: 1,
            title: 'talent_name.weapon_staff_of_homa',
            description: 'talent_descr.weapon_staff_of_homa',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.StaffofHoma.p3)),
            ],
        })
    ],
    postEffects: [
        weaponPost,
    ],
    features: [
        // ATK bonus display (FeaturePostEffectValue of weaponPost): reads the
        // post-effect's own value, not a stat channel; needs nothing.
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'atk_bonus',
            postEffect: weaponPost,
            digits: 1,
        }),
    ],
});

