import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { PostEffectPartyEnergy } from "../../../classes/PostEffect/Stats/PartyEnergy";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

const weaponPost = new PostEffectPartyEnergy({
    // Game data: Weapon_Bow_Maria (ConfigAbility_Weapon_Bow.json) sums the
    // party's max Energy with GetTeamTotalMaxEnergyToOverridemap (no
    // FIGHT_PROP read: energy costs are a static property nothing writes),
    // scales it by Ratio/100 capped at Max_Value (affix 115416: R1-R5
    // 0.12-0.24, cap 40-80), and grants it as a hit-level Burst bonus
    // (ModifyDamageMixin on Elemental_Burst; no Actor_*Delta write, so no
    // premod/extra channel applies). KQM has no Wavewalker chain test, as
    // expected for a static input. GO writes premod burst_dmg_; our engine
    // keeps no extra lane for dmg_burst, so the default channels hold.
    percent: new StatTable('dmg_burst', weaponPassiveTables.MouunsMoon.p1),
    levelSetting: 'weapon_refine',
    statCap: new StatTable('', percent(weaponPassiveTables.MouunsMoon.p2)),
});

export const MouunsMoon = new DbObjectWeapon({
    name: 'mouuns_moon',
    serializeId: 114,
    gameId: 15416,
    iconClass: "weapon-icon-bow-mouuns-moon",
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.MouunsMoon,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_watatsumi_wavewalker',
            description: 'talent_descr.weapon_watatsumi_wavewalker',
            stats: [
                new StatTable('text_percent_bonus', weaponPassiveTables.MouunsMoon.p1),
                new StatTable('text_percent_cap', percent(weaponPassiveTables.MouunsMoon.p2)),
            ],
        }),
    ],
    postEffects: [
        weaponPost,
    ],
    features: [
        // Display value reads through the post-effect above (same static
        // team-energy input). No channels to declare.
        new FeaturePostEffectValue({
            name: 'burst_dmg_bonus',
            category: 'weapon',
            postEffect: weaponPost,
            format: 'percent',
        }),
    ],
});
