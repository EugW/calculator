import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { CHANNELS } from "../../../classes/PostEffect/Channels";
import { PostEffectStatsDef } from "../../../classes/PostEffect/Stats/Def";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent, times } from "../../Params";

const elemBonus = percent(weaponPassiveTables.PeakPatrolSong.p4);
const elemBonus2 = percent(times(weaponPassiveTables.PeakPatrolSong.p6, 0.001));
const elemBonusCap = percent(times(weaponPassiveTables.PeakPatrolSong.p6, weaponPassiveTables.PeakPatrolSong.p8, 0.001));

// Halcyon Years Unending: at 2 stacks, "increase all nearby party members'
// All Elemental DMG Bonus" by the wielder's DEF. The old party row did not
// stack with a wielder's own copy: stack key.
// Game data: Weapon_Sword_XochitlsTube onAbilityStart computes Defence_InCalc
// from FIGHT_PROP_NONEXTRA_DEFENSE (premod, capped by MaxDefence/1000) into
// ElementDamageUp (Defence_InCalc x DefenceRatio3), applied by
// UNIQUE_Weapon_Sword_XochitlsTube_TeamBuff properties Actor_*AddHurtDelta
// without "Extra": a premod (non-extra) DMG% write. The default premod read
// is confirmed (no reads param); the write differs, so writes PREMOD.
// GO reads input.total.def (wrong per data) but writes the team buff under
// premod (right). KQM has snapshot/timing entries, no stat-interaction test.
const weaponPost = new PostEffectStatsDef({
    receivers: RECEIVERS.TEAM,
    stack: 'peak_patrol_song',
    levelSetting: 'weapon_refine',
    writes: CHANNELS.PREMOD,
    percent: [
        new StatTable('dmg_anemo', elemBonus2),
        new StatTable('dmg_electro', elemBonus2),
        new StatTable('dmg_pyro', elemBonus2),
        new StatTable('dmg_cryo', elemBonus2),
        new StatTable('dmg_hydro', elemBonus2),
        new StatTable('dmg_geo', elemBonus2),
        new StatTable('dmg_dendro', elemBonus2),
    ],
    statCap: new StatTable('', elemBonusCap),
    conditions: [
        new ConditionBoolean({name: 'weapon_peak_patrol_song_2'}),
    ],
});

export const PeakPatrolSong = new DbObjectWeapon({
    name: 'peak_patrol_song',
    serializeId: 185,
    gameId: 11516,
    iconClass: "weapon-icon-sword-peak-patrol-song",
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.PeakPatrolSong,
    conditions: [
        new ConditionStacks({
            name: 'weapon_peak_patrol_song',
            serializeId: 1,
            title: 'talent_name.weapon_peak_patrol_song',
            description: 'talent_descr.weapon_peak_patrol_song_1',
            maxStacks: 2,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('def_percent', percent(weaponPassiveTables.PeakPatrolSong.p1)),
                new StatTable('dmg_anemo', elemBonus),
                new StatTable('dmg_electro', elemBonus),
                new StatTable('dmg_pyro', elemBonus),
                new StatTable('dmg_cryo', elemBonus),
                new StatTable('dmg_hydro', elemBonus),
                new StatTable('dmg_geo', elemBonus),
                new StatTable('dmg_dendro', elemBonus),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_peak_patrol_song_2',
            serializeId: 2,
            title: 'talent_name.weapon_peak_patrol_song',
            description: 'talent_descr.weapon_peak_patrol_song_2',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.PeakPatrolSong.p6)),
                new StatTable('text_percent_max', elemBonusCap),
            ],
        }),
    ],
    postEffects: [
        weaponPost,
    ],
    features: [
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'elem_dmg_bonus',
            postEffect: weaponPost,
            format: 'percent',
        }),
    ],
});
