import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { PostEffectPartyEnergy } from "../../../classes/PostEffect/Stats/PartyEnergy";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

const weaponPost = new PostEffectPartyEnergy({
    // Watatsumi Wavewalker: Burst DMG from the party's combined max Energy.
    // Game data: Weapon_Claymore_Maria (ConfigAbility_Weapon_Claymore.json,
    // openConfig of affix id 112416) sums the team's max Energy with
    // GetTeamTotalMaxEnergyToOverridemap (a static property: no FIGHT_PROP
    // read, so no premod/total split to choose; nothing writes max Energy),
    // scales it by Ratio (R1-R5 0.12-0.24, capped at Max_Value 40-80) and
    // writes a burst-tagged hit bonus with ModifyDamageMixin (attackTags
    // Elemental_Burst: no Actor_*Delta write; dmg_burst has no extra lane).
    // KQM has no chaining entry for it; GO (Claymore/Akuoumaru) writes
    // burst_dmg_ under premod, the same value here. Default channels
    // confirmed: no reads/writes params.
    percent: new StatTable('dmg_burst', weaponPassiveTables.Akuoumaru.p1),
    levelSetting: 'weapon_refine',
    statCap: new StatTable('', percent(weaponPassiveTables.Akuoumaru.p2)),
});

export const Akoumaru = new DbObjectWeapon({
    name: 'akuoumaru',
    serializeId: 113,
    gameId: 12416,
    iconClass: "weapon-icon-claymore-akuoumaru",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.Akuoumaru,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_watatsumi_wavewalker',
            description: 'talent_descr.weapon_watatsumi_wavewalker',
            stats: [
                new StatTable('text_percent_bonus', weaponPassiveTables.Akuoumaru.p1),
                new StatTable('text_percent_cap', percent(weaponPassiveTables.Akuoumaru.p2)),
            ],
        }),
    ],
    postEffects: [
        weaponPost,
    ],
    features: [
        // Display-only: reads the post-effect's value, not a stat.
        new FeaturePostEffectValue({
            name: 'burst_dmg_bonus',
            category: 'weapon',
            postEffect: weaponPost,
            format: 'percent',
        }),
    ],
});
