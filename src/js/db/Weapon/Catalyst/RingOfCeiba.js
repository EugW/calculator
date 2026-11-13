import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { CHANNELS } from "../../../classes/PostEffect/Channels";
import { PostEffectStatsHP } from "../../../classes/PostEffect/Stats/HP";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent, times } from "../../Params";

let weaponBuff = new PostEffectStatsHP({
    // Game data: Weapon_Catalyst_Isikhulu (UNIQUE_Catalyst_Isikhulu_NormalAttackUp,
    // ModifyDamageMixin) scales on FIGHT_PROP_MAX_HP, the total marker
    // (md/buff_chains.md), as for Homa, Jade Cutter, Hu Tao's skill, Baizhu's
    // A4, Candace's A4 and Chevreuse's A4; the damagePercentageRatio is
    // [FIGHT_PROP_MAX_HP, HP2DmgUpRatio, MUL, 1000, DIV] capped by
    // Catalyst_Isikhulu_MaxDmgUp (EquipAffixExcelConfigData id 114431, R1
    // 0.006/0.16/10s). The write is a hit-level Normal Attack DMG bonus with
    // no Actor channel, so there is no premod/extra choice on the write
    // (dmg_normal has no extra lane); the same number as a premod read while
    // no ability writes extra HP. Declared reads: TOTAL. GO reads
    // input.total.hp here (supporting evidence). KQM has no Ring Of Ceiba
    // buff-chain test. R1 rates: HP x 0.6%/1000, cap 16%.
    reads: CHANNELS.TOTAL,
    levelSetting: 'weapon_refine',
    percent: new StatTable('dmg_normal', percent(times(weaponPassiveTables.RingOfCeiba.p1, 0.001))),
    statCap: new StatTable('', percent(weaponPassiveTables.RingOfCeiba.p2)),
    conditions: [
        new ConditionBoolean({name: 'weapon_ring_of_ceiba'}),
    ],
});

export const RingOfCeiba = new DbObjectWeapon({
    name: 'ring_of_ceiba',
    serializeId: 180,
    gameId: 14431,
    iconClass: "weapon-icon-catalyst-ring-of-yaxche",
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.RingOfCeiba,
    conditions: [
        // Skill-trigger toggle (game: OnAvatarUseSkillMixin attaches
        // UNIQUE_Catalyst_Isikhulu_NormalAttackUp for Duration 10s) and the
        // text_percent display numbers: flat conditions are always premod,
        // which is right for ordinary toggles and text; needs nothing.
        new ConditionBooleanRefine({
            name: 'weapon_ring_of_ceiba',
            serializeId: 1,
            title: 'talent_name.weapon_ring_of_ceiba',
            description: 'talent_descr.weapon_ring_of_ceiba',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.RingOfCeiba.p1)),
                new StatTable('text_percent_max', percent(weaponPassiveTables.RingOfCeiba.p2)),
            ],
        }),
    ],
    postEffects: [weaponBuff],
    features: [
        // Displays weaponBuff's value; reads no stat itself and needs nothing.
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'normal_dmg_bonus',
            postEffect: weaponBuff,
            format: 'percent',
        }),
    ],
});
