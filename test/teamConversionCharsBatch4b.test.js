import { characterConversionTests } from "./support/teamCharacterConversion";

/**
 * Batch 4b: Citlali, Iansan, Mavuika, Ifa, Varesa, Xilonen, Xianyun.
 */
const CONVERTED = [
    {
        // Mamaloaco's Frigid Rain: enemy Pyro/Hydro RES shred (TEAM). C1
        // Stellar Blade: 200% of live Mastery as flat DMG to another active
        // character's Normal/Charged/Plunge/Skill/Burst. C2: 125 Mastery
        // self, 250 to others, and 20% more shred. C6: 1.5% Pyro/Hydro DMG
        // per live point to others.
        char: 'Citlali',
        constellation: 6,
        on: {
            citlali_mamaloacos_frigid_rain: true,
            citlali_radiant_blades_of_centzon_mimixcoah: true,
            citlali_heart_devourers_travail: true,
            citlali_points: 40,
        },
        carrierTotals: {mastery_total: 800},
        ignoreStats: ['citlali_mastery_total', 'party_citlali_points'],
    },
    {
        // Kinetic Energy Scale ATK from live ATK and burst level, for the
        // current active member (TEAM plus active check). C2: 30% ATK to
        // the active member while Precise Movement is assumed. C6: 25% DMG
        // to the active member; Iansan keeps her own copy.
        char: 'Iansan',
        constellation: 6,
        on: {
            iansan_points: 42,
            iansan_enhanced_resistance_training: true,
            iansan_teachings_of_the_collective_of_plenty: true,
        },
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['iansan_atk_total', 'iansan_char_skill_burst', 'party_iansan_points'],
    },
    {
        // Kiongozi: the saved Fighting Spirit assumption reaches the active
        // member; C4 adds 10% the same way. C2/C6 DEF shred is an enemy
        // debuff (TEAM). C2/C6 self ATK and Flamestrider damage stay on
        // Mavuika.
        char: 'Mavuika',
        constellation: 6,
        on: {
            mavuika_kiongozi: 40,
            mavuika_the_ashen_price: true,
            mavuika_humanitys_name_unfettered: true,
        },
        ignoreStats: ['party_mavuika_kiongozi'],
    },
    {
        // Field Medic's Vision: Rescue Essentials raise nearby members'
        // Swirl, Electro-Charged, Lunar-Charged and Stellar Swirl DMG from
        // live points while Ifa holds Nightsoul's Blessing.
        char: 'Ifa',
        constellation: 6,
        on: {
            'common.nightsoul_blessing_state': true,
            ifa_field_medics_vision: 200,
        },
        ignoreStats: ['party_ifa_field_medics_vision'],
    },
    {
        // No party content to convert: the scenarios only carry the
        // carrier's burst energy cost.
        char: 'Varesa',
        constellation: 6,
        on: {},
    },
    {
        // Source Samples come from the real team elements; active samplers
        // lower the matching enemy RES (TEAM). C2 Chiucue Mix reaches
        // matching teammates by element. C4 Blooming Blessing raises team
        // Normal/Charged/Plunging DMG from live DEF.
        char: 'Xilonen',
        constellation: 6,
        on: {
            'common.nightsoul_blessing_state': true,
            xilonen_samplers: true,
            xilonen_suchitls_trance: true,
        },
        carrierTotals: {def_total: 2000},
        ignoreStats: ['xilonen_def_total', 'xilonen_char_skill_elemental'],
    },
    {
        // Galefeather Pursuit: Plunging CRIT Rate for all nearby members.
        // Consider, the Adeptus in Her Realm: Plunging shockwave DMG from
        // live ATK for active members; the C2 second level comes from the
        // source's constellation.
        char: 'Xianyun',
        constellation: 6,
        on: {
            xianyun_galefeather_pursuit: 4,
            xianyun_consider_the_adeptus_in_her_realm: true,
        },
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['xianyun_atk_total'],
    },
];

characterConversionTests(CONVERTED);
