import { alhaithamA4Correction } from "./support/buffChains";
import { characterConversionTests } from "./support/teamCharacterConversion";

/**
 * Batch 3b: Qiqi, Razor, Sucrose, Venti, Xiangling, Xinyan, Zhongli, YunJin.
 * Same row fields as test/teamConversionChars.test.js.
 */
const CONVERTED = [
    {
        // Life-Prolonging Methods: incoming healing after a reaction under
        // Herald of Frost (A1); Radiance conduct/swirl reaction damage;
        // Rite of Resurrection Glimpse levels (C6) scale flat Stellar
        // Glimmer DMG off Qiqi's total ATK for other members.
        char: 'Qiqi',
        constellation: 6,
        on: {
            qiqi_life_prolonging_methods: true,
            qiqi_radiance_stellarconduct: true,
            qiqi_herald_of_frost_radiance: true,
            qiqi_radiance_stellarswirl: true,
            qiqi_glimpse_of_mystery: 4,
        },
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['qiqi_atk_total'],
    },
    {
        // Bite (C4): opponents hit lose 15% DEF.
        char: 'Razor',
        constellation: 4,
        on: {
            razor_bite: true,
            razor_witch_homework: true,
        },
    },
    {
        // Catalyst Conversion: 50 Mastery to matching-element members;
        // Mollis Favonius: 20% of Sucrose's Mastery to others; Chaotic
        // Entropy: absorbed-element DMG to the team. Small/Large Wind Spirit
        // stay off without Hexerei resonance, as recorded.
        char: 'Sucrose',
        constellation: 6,
        on: {
            sucrose_catalyst_conversion: 'cryo;electro;hydro;pyro',
            sucrose_mollis_favonius: true,
            sucrose_chaotic_entropy: 'pyro',
            sucrose_small_wind_spirit: true,
            sucrose_large_wind_spirit: true,
            sucrose_witch_homework: true,
        },
        carrierTotals: {mastery_total: 800},
        ignoreStats: ['sucrose_mastery'],
        // Alhaitham's A4 counts her A4's EM (md/buff_chains.md).
        corrections: [alhaithamA4Correction('party.json', 'Alhaitham__with_Sucrose')],
    },
    {
        // Breeze of Reminiscence (C2): Anemo/Physical shred; Hurricane of
        // Freedom (C4): Anemo DMG for Venti and active members; Storm of
        // Defiance (C6): Anemo + absorbed-element shred. The buffed C6
        // 100% CRIT DMG stays Venti's own, as recorded. Secret Rite stays
        // off without Hexerei resonance, as recorded.
        char: 'Venti',
        constellation: 6,
        on: (carrier, receiver) => ({
            venti_breeze: true,
            venti_breeze_2: true,
            venti_hurricane: true,
            venti_storm: true,
            venti_storm_element: 'pyro',
            venti_secret_rite_4s: true,
            venti_secret_rite_4s_receiver: String(receiver.char.getId()),
            venti_witch_homework: true,
        }),
    },
    {
        // Beware (A4): ATK from the chili pepper; Crispy Outside (C1):
        // Pyro shred; Condensed Pyronado (C6): Pyro DMG Bonus.
        char: 'Xiangling',
        constellation: 6,
        on: (carrier, receiver) => ({
            xiangling_beware: true,
            xiangling_beware_receiver: String(receiver.char.getId()),
            xiangling_crispy: true,
            xiangling_condensed_pyronado: true,
        }),
    },
    {
        // "...Now That's Rock 'N' Roll!" (A4): Physical DMG under the
        // shield; Wildfire Rhythm (C4): Physical shred.
        char: 'Xinyan',
        constellation: 4,
        on: {
            xinyan_now_thats_rock: true,
            xinyan_wildfire_rhythm: true,
        },
    },
    {
        // Jade Shield: all-element RES shred; Resonant Waves (A1): shield
        // strength stacks.
        char: 'Zhongli',
        constellation: 0,
        on: {
            zhongli_jade_shield: true,
            zhongli_resonant_waves: 5,
        },
    },
    {
        // Cliffbreaker's Banner: Normal Attack DMG from Yun Jin's DEF and
        // burst level, plus Breaking Conventions by team element count;
        // Myriad Mise-En-Scene (C2): Normal DMG; Decorous Harmony (C6):
        // Normal ATK SPD under the flag.
        char: 'YunJin',
        constellation: 6,
        on: {
            yunjin_flag: true,
            yunjin_myriad: true,
        },
        carrierTotals: {def_total: 2000},
        // Internal A4 element-count stat is source-owned; incoming damage is still compared.
        ignoreStats: ['yunjin_def_total', 'yunjin_char_skill_burst', 'yunjin_traditionalist_stacks'],
    },
];

characterConversionTests(CONVERTED);
