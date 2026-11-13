import { durinWhiteFlame } from "../src/js/db/Char/Durin";
import { characterConversionTests } from "./support/teamCharacterConversion";

/**
 * Batch 4c: Durin, Prune, Lohen, Varka, Odette, Sandrone, Vesna, TravelerCryo.
 * Typed-in teammate stats become the carrier's real totals (carrierTotals).
 */
const CONVERTED = [
    {
        // A1 (Dragon of White Flame) RES shred and C1 (Principle of Purity)
        // Cycle of Enlightenment belong to the Purity form. The old model
        // gated only their controls, so they applied in the recorded
        // Darkness scenario; openConditions reproduces that, and
        // teamCharsBatch4cReview checks the gate. C6's DEF shred was gated in
        // the old model too, so it stays off as recorded.
        char: 'Durin',
        constellation: 6,
        openConditions: [durinWhiteFlame],
        on: {
            durin_darkness_mode: true,
            durin_c1_cycle_party: true,
            durin_res_shred: 'pyro;dendro;electro;anemo;geo',
            durin_witch_homework: true,
            durin_c2_pyro_bonus: true,
            durin_c2_dmg_bonus: 'hydro;cryo;dendro;electro;anemo;geo',
            durin_c6_def_shred: true,
        },
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['durin_atk_total'],
    },
    {
        char: 'Prune',
        constellation: 6,
        on: {
            prune_tolling_synchronicity: true,
            prune_witch_homework: true,
            prune_witchseekers_vow_swirl: true,
            prune_and_thats_the_story_share_it_with_your_friends: true,
        },
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['prune_atk_total'],
    },
    {
        // Flippant Masterpiece (A4): "that character's ATK is increased by
        // 15%" for the member who triggered the Cryo reaction, chosen with
        // the selector. In Flight (C2): "other nearby party members" +200 EM.
        char: 'Lohen',
        constellation: 2,
        on: (carrier, receiver) => ({
            lohen_flippant_masterpiece: true,
            lohen_flippant_masterpiece_receiver: String(receiver.char.getId()),
            lohen_in_flight_i_strike_whatever_flies: true,
            lohen_witch_homework: true,
        }),
    },
    {
        // C4 Freedom of Song: "all nearby party members gain 20% Anemo +
        // corresponding element" (TEAM, manual Swirl assumption).
        char: 'Varka',
        constellation: 4,
        on: {
            varka_witch_homework: true,
            varka_freedom_of_song_element: 'cryo',
        },
    },
    {
        // The recorded 4 Marvelous Splendor stacks are the ones the other
        // members hold; Snow Swan's Dream (C4: 50% for the others) and C6's
        // elevation for everyone affected by Splendor. Radiance states stay
        // on the source (no Polestar Field in the recording).
        char: 'Odette',
        constellation: 6,
        on: {
            odette_solo_dance_double: true,
            odette_marvelous_splendor_others: 4,
            odette_snow_swans_dream: true,
            odette_radiance_stellarconduct: true,
            odette_radiance_stellarswirl: true,
            odette_all_party_marvelous_splendor: true,
        },
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['odette_atk_total', 'odette_char_skill_burst'],
    },
    {
        // C1 Morrow 30% stellar + lightBase ATK-scaled glimmer multi (TEAM).
        char: 'Sandrone',
        constellation: 1,
        on: {
            sandrone_morrow_after_the_golden_dusk: true,
        },
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['sandrone_atk_total'],
    },
    {
        // Stellar Jubilee unlock + ATK-scaled swirl multi (TEAM, always on).
        char: 'Vesna',
        constellation: 0,
        on: {},
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['vesna_atk_total'],
    },
    {
        // C2 Frostfall EM for the on-field member (the recorded receiver),
        // C6 Brumal Grimfrost for the others, and the Stellar Jubilee base.
        char: 'TravelerCryo',
        constellation: 6,
        on: {
            traveler_cryo_frostfall_reverberation: 2,
            traveler_cryo_brumal_grimfrost: 8,
        },
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['traveler_cryo_atk_total'],
    },
];

characterConversionTests(CONVERTED);
