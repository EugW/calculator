import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { PostEffectPartyEnergy } from "../../../classes/PostEffect/Stats/PartyEnergy";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

// Watatsumi Wavewalker: Burst DMG from the party's combined maximum Energy.
// Game data: Weapon_Pole_Maria (ConfigAbility_Weapon_Pole.json,
// openConfig Weapon_Pole_Maria, EquipAffixExcelConfigData id 113416x:
// Ratio 0.12-0.24, Max 0.4-0.8) runs GetTeamTotalMaxEnergyToOverridemap
// into Pole_Maria_TeamEnergy, then Pole_Maria_TeamEnergy x Ratio / 100
// capped at Max_Value into Pole_Maria_BuffValue, applied by a
// ModifyDamageMixin for Elemental_Burst. No FIGHT_PROP_* read and no
// Actor_*Delta write (extra_scan lists no markers for it): the read is a
// static team property (CharTables burst_energy_cost), not an attribute
// with a premod/extra split, and the ModifyDamageMixin write has no Actor
// channel (as Emblem's Relic_ElementalBurstUpByChargeEfficiency and
// Furina's Fanfare bonus, both left at the default). dmg_burst itself has
// no extra lane (Channels SPLIT_STATS covers only elemental dmg_*), so the
// channels are irrelevant here. KQM weapons evidence has no Wavebreaker
// buff-chain test. GO (Polearm/WavebreakersFin) writes premod burst_dmg_,
// supporting evidence only (as for Emblem). Default channels confirmed:
// static read, extra write (default).
const weaponPost = new PostEffectPartyEnergy({
    percent: new StatTable('dmg_burst', weaponPassiveTables.WavebreakersFin.p1),
    levelSetting: 'weapon_refine',
    statCap: new StatTable('', percent(weaponPassiveTables.WavebreakersFin.p2)),
});

export const WavebreakersFin = new DbObjectWeapon({
    name: 'wavebreakers_fin',
    serializeId: 115,
    gameId: 13416,
    iconClass: "weapon-icon-polearm-wavebreakers-fin",
    rarity: 4,
    weapon: 'polearm',
    statTable: weaponStatTables.WavebreakersFin,
    conditions: [
        // Display text for the refine tables above (game text
        // talent_descr.weapon_watatsumi_wavewalker): flat conditions are
        // always premod and need nothing.
        new ConditionStaticRefine({
            title: 'talent_name.weapon_watatsumi_wavewalker',
            description: 'talent_descr.weapon_watatsumi_wavewalker',
            stats: [
                new StatTable('text_percent_bonus', weaponPassiveTables.WavebreakersFin.p1),
                new StatTable('text_percent_cap', percent(weaponPassiveTables.WavebreakersFin.p2)),
            ],
        }),
    ],
    postEffects: [
        weaponPost,
    ],
    features: [
        // Display value reading through weaponPost above; not a stat read,
        // no channels to declare.
        new FeaturePostEffectValue({
            name: 'burst_dmg_bonus',
            category: 'weapon',
            postEffect: weaponPost,
            format: 'percent',
        }),
    ],
});
