import { CHANNELS } from "../../src/js/classes/PostEffect/Channels";
import { recorded } from "./teamConversion";

// Corrections of recordings made before md/buff_chains.md, derived from the
// recorded stats and the game formula, never from the current engine.

const ALHAITHAM_SKILL_FEATURES = [
    'skill.alhaitham_mirror_1_dmg',
    'skill.alhaitham_mirror_2_dmg',
    'skill.alhaitham_mirror_2_total_dmg',
    'skill.alhaitham_mirror_3_dmg',
    'skill.alhaitham_mirror_3_total_dmg',
];
const ALHAITHAM_BURST_FEATURES = ['burst.alhaitham_single_instance_dmg'];

/**
 * Alhaitham's A4 reads his total EM (game data: Avatar_Alhatham_PermanentSkill_2
 * scales on FIGHT_PROP_ELEMENT_MASTERY). The old engine read the EM before
 * teammates' stat-scaled buffs, so a recording with an extra EM buff (Nahida's
 * A1, Sucrose's A4, Mizuki, Ineffa, Key of Khaj-Nisut) has a smaller bonus:
 * 0.1% of the recorded EM (mastery_base + mastery), capped at 100%, and his
 * hits using it scale by the ratio of their DMG bonus multipliers.
 *
 * @param {string} file recorded file ('party.json', 'buffs.json')
 * @param {string} id recorded scenario
 * @returns {{scenarios: Array.<string>, stats: Object, featureFactors: Object}}
 */
export function alhaithamA4Correction(file, id) {
    const stats = recorded(file).scenarios[id].stats;
    const get = (name) => stats[name] || 0;
    const a4 = Math.min(1, 0.001 * (get('mastery_base') + get('mastery')));
    const old = get('dmg_skill_alhaitham');
    const common = 1 + get('dmg_dendro_base') + get('dmg_dendro') + get('dmg_all');
    const factor = (bonus) => (common + bonus + a4) / (common + bonus + old);
    return {
        scenarios: [id],
        stats: {dmg_skill_alhaitham: a4, dmg_burst_alhaitham: a4},
        featureFactors: Object.fromEntries([
            ...ALHAITHAM_SKILL_FEATURES.map((name) => [name, factor(get('dmg_skill'))]),
            ...ALHAITHAM_BURST_FEATURES.map((name) => [name, factor(get('dmg_burst'))]),
        ]),
    };
}

/**
 * A character's post-effects that read a total value and write one of the
 * given stats. Recordings made before md/buff_chains.md read them premod;
 * `premodReadSpies` evaluates them that way to reproduce such a recording,
 * while the character's buffChains test checks the total read itself.
 *
 * @param {string} charKey
 * @param {Array.<string>} stats
 * @returns {Array.<PostEffect>}
 */
export function totalReaders(charKey, stats) {
    return DB.Chars.get(charKey).getPostEffects().filter((post) => post.getReads() === CHANNELS.TOTAL
        && post.getWriteStats().some((stat) => stats.includes(stat)));
}

/**
 * @param {Array.<PostEffect>} effects
 * @returns {Array} jest spies; restore them after the check
 */
export function premodReadSpies(effects) {
    return effects.map((post) => jest.spyOn(post, 'getReads').mockReturnValue(CHANNELS.PREMOD));
}

/**
 * Mona's C4 ("When any party member attacks an opponent affected by an Omen,
 * their CRIT Rate is increased by 15%") lowers the opponent's CRIT resistance
 * in the game (Actor_AntiCriticalDelta on the Omen), so it is CRIT Rate against
 * that opponent (crit_rate_enemy, as Blizzard Strayer's), not a stat of the
 * member. A recording holds it in crit_rate: the 15% moves to crit_rate_enemy
 * and the CRIT Rate row no longer shows it. Hits read both stats, so their
 * numbers do not change.
 *
 * @param {string} file recorded file ('party.json')
 * @param {string} id recorded scenario
 * @returns {{scenarios: Array.<string>, stats: Object, featureFactors: Object}}
 */
export function monaC4Correction(file, id) {
    const scenario = recorded(file).scenarios[id];
    const shown = scenario.features['stats.crit_rate'].normal;
    return {
        scenarios: [id],
        stats: {
            crit_rate: (scenario.stats.crit_rate || 0) - 0.15,
            crit_rate_enemy: (scenario.stats.crit_rate_enemy || 0) + 0.15,
        },
        featureFactors: {'stats.crit_rate': (shown - 15) / shown},
    };
}
