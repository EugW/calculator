import { alhaithamA4Correction } from "./support/buffChains";
import { laumaAscendantGleam } from "../src/js/db/Char/Lauma";
import { characterConversionTests } from "./support/teamCharacterConversion";
import { recorded } from "./support/teamConversion";

/**
 * Zibai's Moonsign Benediction: Lunar-Crystallize base DMG +0.7% per 100 of
 * Zibai's DEF, up to 14%. The old party post-effect (PostEffectStatsDef
 * ignores `from`) read the receiver's DEF instead, so each recorded multi is
 * 0.7% of the receiver's DEF. With Zibai's recorded 2000 DEF it is the 14%
 * cap. Lunar reactions scale by (1 + multi), so each recorded
 * Lunar-Crystallize feature changes by (1 + 0.14) / (1 + recorded multi).
 */
function zibaiBenedictionCorrections() {
    const scenarios = recorded('party.json').scenarios;
    return Object.keys(scenarios).filter((id) => id.endsWith('__with_Zibai')).map((id) => {
        const scenario = scenarios[id];
        const factor = (1 + 0.14) / (1 + scenario.stats.lunarcrystallize_multi);
        const featureFactors = {};
        for (const name of Object.keys(scenario.features)) {
            if (name.includes('lunarcrystallize')) featureFactors[name] = factor;
        }
        return {scenarios: [id], stats: {lunarcrystallize_multi: 0.14}, featureFactors};
    });
}

/**
 * Batch 4a: Aino, Flins, Ineffa, Jahoda, Nefer, Zibai, Lauma (Moonsign characters).
 */
const CONVERTED = [
    {
        // C1 Mastery to herself and to other members while on-field; C6
        // reaction DMG of the on-field member, tiers by live Moonsign. The
        // recorded receivers are on-field. C1 "does not stack" is about the
        // same character's effects: no key.
        char: 'Aino',
        constellation: 6,
        on: {
            aino_the_theory_of_ashfield_equilibrium: true,
            aino_the_burden_of_creative_genius: true,
        },
    },
    {
        // Lunar-Charged base bonus from the source's live ATK; C6 elevates
        // Flins himself by 35 and other members by 10 at Ascendant Gleam.
        // A1 stays self-only (no party copy existed).
        char: 'Flins',
        constellation: 6,
        on: {flins_songs_and_dances_of_death: true},
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['flins_atk_total'],
    },
    {
        // Panoramic Permutation EM (Ineffa + active member, from live ATK),
        // Assemblage Hub base bonus and C1 Lunar-Charged DMG (whole team,
        // from live ATK). No Moonsign calc was modeled; none added.
        char: 'Ineffa',
        constellation: 6,
        on: {
            ineffa_panoramic_permutation_protocol: true,
            ineffa_rectifying_processor: true,
        },
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['ineffa_atk_total'],
        // Alhaitham's A4 counts Ineffa's A4 EM (md/buff_chains.md).
        corrections: [alhaithamA4Correction('party.json', 'Alhaitham__with_Ineffa')],
    },
    {
        // A4 Mastery (Jahoda + healed active member, HP assumed above 70%);
        // C6 CRIT tiers by live Moonsign for Moonsign (Nod-Krai) receivers.
        char: 'Jahoda',
        constellation: 6,
        on: {
            jahoda_a1_em_bonus: true,
            jahoda_c6_crit_bonus: true,
        },
    },
    {
        // Lunar-Bloom base bonus from the source's live Mastery. The old
        // party C6 copy gave teammates +15 Lunar-Bloom elevation, but the
        // game text only elevates Nefer's own Lunar-Bloom DMG, so receivers
        // get 0 ("Victory Flows from the Turning of Tides: ... Nefer's
        // Lunar-Bloom DMG is elevated by 15%.").
        char: 'Nefer',
        constellation: 6,
        on: {nefer_victory_flows_from_the_turning_of_tides: true},
        carrierTotals: {mastery_total: 800},
        ignoreStats: ['nefer_mastery_total'],
        corrections: [
            {
                scenarios: [
                    'Alhaitham__with_Nefer',
                    'Eula__with_Nefer',
                    'Hutao__with_Nefer',
                    'Itto__with_Nefer',
                    'Keqing__with_Nefer',
                    'Tartaglia__with_Nefer',
                    'Wanderer__with_Nefer',
                ],
                stats: {dmg_lunarbloom_special: 0},
            },
        ],
    },
    {
        // A1 crit tiers by live Moonsign (TEAM); RES shred from the live
        // skill level incl. source C5 (shared enemy); Pale Hymn + C2 reaction
        // bonuses from live Mastery/burst (TEAM). C2's +40% and C6's
        // elevation need Ascendant Gleam; the old party rows applied them in
        // this Nascent Gleam team, so the gate is open here as recorded and
        // checked directly in teamCharsBatch4aReview.
        char: 'Lauma',
        openConditions: [laumaAscendantGleam],
        constellation: 6,
        on: {
            lauma_light_for_the_frosty_night: true,
            lauma_res_shred: true,
            lauma_twine_warnings_and_tales_from_the_north: true,
            lauma_i_offer_blood_and_tears_to_the_moonlight: true,
            lauma_pale_hymn: true,
        },
        carrierTotals: {mastery_total: 800},
        ignoreStats: [
            'lauma_mastery_total',
            'lauma_char_skill_elemental',
            'lauma_char_skill_burst',
        ],
    },
    {
        // Benediction from Zibai's live DEF and C2's +30% Lunar-Crystallize
        // DMG for all nearby members in Lunar Phase Shift mode.
        char: 'Zibai',
        constellation: 2,
        on: {zibai_c2_party_lunar_crystallize: true},
        carrierTotals: {def_total: 2000},
        ignoreStats: ['zibai_def_total'],
        corrections: zibaiBenedictionCorrections(),
    },
];

characterConversionTests(CONVERTED);
