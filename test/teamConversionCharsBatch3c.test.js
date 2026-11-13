import { characterConversionTests } from "./support/teamCharacterConversion";

/**
 * Batch 3c: Sara, Gorou, YaeMiko, Candace, Tighnari, Layla, Kirara.
 * RaidenShogun's engine support and conversion are covered separately by
 * teamReceiverStats.test.js and teamRaidenDelivery.test.js on teams.
 */
const CONVERTED = [
    {
        // Tengu Juurai ATK from Sara's base ATK; C6 Electro CRIT DMG for
        // characters with the ATK buff (game text). C5 talent bonus comes
        // from the source's own constellation.
        char: 'Sara',
        constellation: 6,
        on: {sara_tengu_juurai: true},
        carrierTotals: {atk_base: 900},
        ignoreStats: ['sara_atk_base', 'sara_char_skill_elemental'],
    },
    {
        // General's War Banner field (DEF flat, Geo DMG), A1 DEF, C6 Geo
        // CRIT DMG tiers by Geo count. C3 talent bonus and C6 are implicit
        // in the source's constellation; nearby radius is assumed.
        char: 'Gorou',
        constellation: 6,
        on: {
            gorou_generals_war_banner: true,
            gorou_heedless_of_the_wind_and_weather: true,
        },
        ignoreStats: ['gorou_char_skill_elemental'],
    },
    {
        // C1 Electro/StellarConduct DMG to nearby members; C2 Mastery to
        // Yae and the active character (recorded receivers are on-field);
        // C4 Electro DMG to nearby members (Yae keeps her Burst DMG).
        char: 'YaeMiko',
        constellation: 4,
        on: {
            yae_miko_yakan_offering_buff: true,
            yae_miko_sesshou_sakura_level: 4,
            miko_sakura_channeling: true,
        },
    },
    {
        // Prayer Normal DMG to all members plus HP-scaled A4 bonus (from the
        // source's real HP); Hydro infusion only for Sword/Claymore/Polearm.
        char: 'Candace',
        constellation: 0,
        on: {candace_prayer_of_the_crimson_crown: true},
        carrierTotals: {hp_total: 30000},
        ignoreStats: ['candace_hp_total'],
    },
    {
        // C4 Mastery: 60 on burst, another 60 on reaction (assumed by the
        // second toggle, gated by the first).
        char: 'Tighnari',
        constellation: 4,
        on: {
            tighnari_withering_glimpsed_in_the_leaves_1: true,
            tighnari_withering_glimpsed_in_the_leaves_2: true,
        },
    },
    {
        // A1 shield strength stacks; C4 Normal/Charged DMG from the source's
        // Max HP.
        char: 'Layla',
        constellation: 4,
        on: {
            layla_like_nascent_light: 4,
            layla_starry_illumination: true,
        },
        carrierTotals: {hp_total: 30000},
        ignoreStats: ['layla_max_hp'],
    },
    {
        // C6: all nearby party members gain 12% All Elemental DMG.
        char: 'Kirara',
        constellation: 6,
        on: {kirara_countless_sights_to_see: true},
    },
];

characterConversionTests(CONVERTED);
