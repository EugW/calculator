import { columbinaAscendantGleam } from "../src/js/db/Char/Columbina";
import { illugaAscendantGleam } from "../src/js/db/Char/Illuga";
import { characterConversionTests } from "./support/teamCharacterConversion";

/**
 * Batch 5a: Columbina, Illuga, Linnea (Moonsign characters).
 */
const CONVERTED = [
    {
        // Lunar base bonuses from live HP and Lunar Domain from live burst
        // (TEAM); every constellation's elevation for the team. C2's ATK/EM/
        // DEF for the active character needs Ascendant Gleam, which the old
        // model did not check: the gate is open here as recorded and checked
        // directly in teamCharsBatch5aDelivery. C6 CRIT for the whole team;
        // the C4 flat stays self-only.
        char: 'Columbina',
        openConditions: [columbinaAscendantGleam],
        constellation: 6,
        on: {
            columbina_lunar_domain: true,
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'geo',
            columbina_c6_crit: 'hydro;electro;dendro;geo',
        },
        carrierTotals: {hp_total: 30000},
        ignoreStats: [
            'columbina_hp_total',
            'columbina_char_skill_burst',
        ],
        corrections: [
            {
                // C2's DEF is non-extra in the game (Avatar_Columbina_
                // Constellation_2_MoonCrystalBuff_OnLocal writes
                // Actor_DefenceDelta; md/buff_chains.md), so Itto's burst,
                // which scales on premod DEF, counts it. The recording read
                // his base DEF only (994.45 = 103.68% × 959.1555); with the
                // recorded 300 C2 DEF it scales by (959.1555 + 300) / 959.1555.
                scenarios: ['Itto__with_Columbina'],
                featureFactors: {'burst.atk_bonus': (959.1555042 + 300) / 959.1555042},
            },
        ],
    },
    {
        // Lightkeeper's Oath (C6 values) for the other members, EM at
        // Ascendant Gleam (gate open here as recorded); C4 DEF for the active
        // member and Nightingale/A4 flats for other active members from live
        // EM, burst level and Hydro/Geo count.
        char: 'Illuga',
        openConditions: [illugaAscendantGleam],
        constellation: 6,
        on: {
            illuga_lightkeepers_oath: true,
            illuga_lightkeepers_oath_c6: true,
            illuga_c4_def: true,
            illuga_nightingales_song: true,
            illuga_demonhunters_dusk: true,
        },
        carrierTotals: {mastery_total: 500},
        ignoreStats: [
            'illuga_mastery',
            'illuga_char_skill_burst',
        ],
    },
    {
        // A1 RES tiers by live Moonsign and C2 Hydro/Geo CRIT (TEAM);
        // Benediction + A4 EM from live DEF; C1/C6 generic Lunar-Crystallize
        // flats for other members (always at C1/C6); C4 DEF for other active
        // members; C6 elevation at Ascendant Gleam (closed here as recorded).
        // The recording's Hydro/Geo receivers get the C2 CRIT, others get 0.
        char: 'Linnea',
        constellation: 6,
        on: {
            linnea_field_observation_notes: true,
            linnea_universal_naturalist_archive: true,
            linnea_tidings_of_joy_and_sorrow: true,
            linnea_expert_instinct: true,
        },
        carrierTotals: {def_total: 2000},
        ignoreStats: [
            'linnea_def_total',
        ],
    },
];

characterConversionTests(CONVERTED);
