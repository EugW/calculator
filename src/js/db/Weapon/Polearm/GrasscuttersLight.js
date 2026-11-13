import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { PostEffectStatsExceedRecharge } from "../../../classes/PostEffect/Stats/ExceedRecharge";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

// Game data: Weapon_Pole_Narukami / UNIQUE_Pole_Narukami_ChargeToAtk_Refresh
// computes AttackRatio = ChargetoAtk_Factor x (FIGHT_PROP_NONEXTRA_CHARGE_EFFICIENCY - 1)
// (premod ER above 100%, cap MaxAttackRatio; affix 113509: 28%/80% .. 56%/120%)
// into Actor_AttackExtraDelta (extra) via UNIQUE_Pole_Narukami_ChargeToAtk_Buff
// (= base ATK x ratio; our atk_percent extra write is the same number). KQM
// (Electro Traveler evidence): the amulet ER does not move Engulfing's ATK. GO
// reads input.premod.enerRech_ (agrees) but writes premod.atk_ (disagrees: the
// game writes extra, so premod ATK readers such as Flins's A4 must not see it).
// The default channels hold.
const weaponPost = new PostEffectStatsExceedRecharge({
    levelSetting: 'weapon_refine',
    percent: new StatTable('atk_percent', percent(weaponPassiveTables.GrasscuttersLight.p1)),
    statCap: new StatTable('', percent(weaponPassiveTables.GrasscuttersLight.p2)),
});

export const GrasscuttersLight = new DbObjectWeapon({
    name: 'engulfing_lightning',
    serializeId: 107,
    gameId: 13509,
    iconClass: "weapon-icon-polearm-engulfing-lightning",
    rarity: 5,
    weapon: 'polearm',
    statTable: weaponStatTables.GrasscuttersLight,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_grasscutters_light',
            description: 'talent_descr.weapon_grasscutters_light_1',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.GrasscuttersLight.p1)),
                new StatTable('text_percent_max', percent(weaponPassiveTables.GrasscuttersLight.p2)),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_grasscutters_light',
            serializeId: 1,
            title: 'talent_name.weapon_grasscutters_light',
            description: 'talent_descr.weapon_grasscutters_light_2',
            // Game data: UNIQUE_Weapon_Pole_Narukami_ChargeUp (on burst) writes
            // Actor_ChargeEfficiencyDelta (no "Extra": premod; affix 113509:
            // 30% .. 50% for 12s). Conditions are always premod: the default
            // holds (GO writes premod.enerRech_ too). Being premod, it counts
            // for the weapon's own ATK conversion above.
            stats: [
                new StatTable('recharge', percent(weaponPassiveTables.GrasscuttersLight.p3)),
            ],
        }),
    ],
    postEffects: [
        weaponPost,
    ],
    features: [
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'atk_bonus',
            postEffect: weaponPost,
            format: 'percent',
        }),
    ],
});
