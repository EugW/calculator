import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionBooleanCharElement } from "../../classes/Condition/Boolean/CharElement";
import { ConditionBooleanCharOrigin } from "../../classes/Condition/Boolean/CharOrigin";
import { ConditionBooleanTeamChoice } from "../../classes/Condition/Boolean/TeamChoice";
import { ConditionCalcMoonsign } from "../../classes/Condition/CalcMoonsign";
import { ConditionCustomBuffs } from "../../classes/Condition/CustomBuffs";
import { ConditionRetired } from "../../classes/Condition/Retired";
import { DbObjectBuff } from "../../classes/DbObject/Buff";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { PostEffectStatsDef } from "../../classes/PostEffect/Stats/Def";
import { PostEffectStatsHP } from "../../classes/PostEffect/Stats/HP";
import { PostEffectStatsMastery } from "../../classes/PostEffect/Stats/Mastery";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { ValueTable } from "../../classes/ValueTable";
import { condAscendantGleam } from "./ElementalResonance";
import { CHANNELS } from "../../classes/PostEffect/Channels";

// Ascendant Gleam is active and this member is not a Moonsign character.
const condAscendantGleamSource = new ConditionAnd([
    condAscendantGleam,
    new ConditionBooleanCharOrigin({origin: ['nodkrai'], invert: true}),
]);

/**
 * @param {Function} PostEffectClass reads one stat of the source
 * @param {Array.<string>} elements source elements using that stat
 * @param {number} percentPerPoint Lunar Reaction DMG % per point of the stat
 * @param {string} [reads] CHANNELS: premod by default
 * @returns {PostEffect}
 */
function ascendantGleamBonus(PostEffectClass, elements, percentPerPoint, reads) {
    return new PostEffectClass({
        receivers: RECEIVERS.TEAM,
        reads: reads,
        percent: new StatTable('dmg_reaction_lunar', [percentPerPoint]),
        statCap: new ValueTable([36]),
        condition: new ConditionAnd([
            // The team chose this member: there is one source at a time.
            new ConditionBooleanTeamChoice({setting: 'ascendant_gleam_source'}),
            condAscendantGleamSource,
            new ConditionBooleanCharElement({element: elements}),
        ]),
    });
}

/**
 * Every member's own buffs: custom buffs, its Moonsign count and the
 * Ascendant Gleam bonus it gives when the team chose it as the source.
 */
export const Member = new DbObjectBuff({
    name: 'member',
    invisible: true,
    conditions: [
        // Field state is derived from the team's one on-field character.
        new ConditionRetired({serializeId: 79, type: 'checkbox'}),
        new ConditionCustomBuffs({
            name: 'custom_buffs',
            serializeId: 24,
            isHidden: true,
        }),
        // 81 and 82 held a member's stat and set overrides before the
        // release. They are not read: never reuse them.
        // Calculate moonsign level from party composition
        new ConditionCalcMoonsign({}),
        // The typed-in non-Moonsign bonus is now each member's own control.
        new ConditionRetired({serializeId: 25, type: 'number'}),
    ],
    postEffects: [
        // Moonsign: Ascendant Gleam: after a non-Moonsign member uses an
        // Elemental Skill or Burst, the party's Lunar Reaction DMG increases
        // for 20s based on that member's stats, up to 36%. Pyro, Electro,
        // Cryo: 0.9% per 100 ATK; Hydro: 0.6% per 1,000 Max HP; Geo: 1% per
        // 100 DEF; Anemo, Dendro: 2.25% per 100 Elemental Mastery.
        // Game data: TeamAbility_MoonPhase /
        // UNIQUE_TeamAbility_MoonPhase_NotMoonAvatarBuff_PropCopy copies
        // FIGHT_PROP_NONEXTRA_ATTACK, _DEFENSE, _ELEMENT_MASTERY (premod, the
        // default) and FIGHT_PROP_MAX_HP (total). In-game test
        // (md/buff_chains.md): with Bennett as the source at 1,998 ATK a
        // Lunar-Charged hit did 41,791 whether or not he stood in his own
        // burst (extra ATK), and 40,338 with Fischl (1,273 ATK) as the source.
        ascendantGleamBonus(PostEffectStatsAtk, ['pyro', 'electro', 'cryo'], 0.009),
        ascendantGleamBonus(PostEffectStatsHP, ['hydro'], 0.0006, CHANNELS.TOTAL),
        ascendantGleamBonus(PostEffectStatsDef, ['geo'], 0.01),
        ascendantGleamBonus(PostEffectStatsMastery, ['anemo', 'dendro'], 0.0225),
    ],
});
