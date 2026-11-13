import { monaC4Correction } from "./support/buffChains";
import { characterConversionTests } from "./support/teamCharacterConversion";
import { recorded } from "./support/teamConversion";

/**
 * Batch 3a character conversions (Albedo, Aloy, Ayaka, Fischl, Hutao,
 * Jean, Klee, Mona). Same row fields as test/teamConversionChars.test.js.
 */
const CONVERTED = [
    {
        // Combat Override: Aloy keeps 16% ATK, nearby party members gain 8%.
        char: 'Aloy',
        constellation: 0,
        on: {aloy_combat_override: true},
    },
    {
        // Ebb and Flow: opponents hit lose 30% DEF.
        char: 'Ayaka',
        constellation: 4,
        on: {ayaka_eikyo_ryuuhan: true},
    },
    {
        // People's Aegis: all party members gain ATK SPD and Movement SPD;
        // Lands of Dandelion: opponents in the field lose 40% Anemo RES.
        char: 'Jean',
        constellation: 4,
        on: {jean_peoples_aegis: true, jean_lands_of_dandelion: true},
    },
    {
        // Flutter By (A1) and Garden of Eternal Rest (C4) each grant
        // 12% CRIT Rate to allies other than Hu Tao herself.
        char: 'Hutao',
        constellation: 4,
        on: {hu_tao_flutter_by: true, hu_tao_garden_of_eternal_rest: true},
    },
    {
        // Explosive Frags: opponents hit lose 23% DEF. Blazing Delight:
        // other party members gain 10% Pyro DMG (Klee herself gains
        // 10%/50% from her own toggles under Hexerei).
        char: 'Klee',
        constellation: 6,
        on: {
            klee_witch_homework: true,
            klee_explosive_frags: true,
            klee_blazing_delight: true,
        },
    },
    {
        // Phantasmal Nocturne: with Oz on the field, nearby active party
        // members share Fischl's ATK/Mastery (doubled by C6 Evernight
        // Raven). Recorded teams have a single Hexerei member, so the
        // resonance-gated effects stay off, as in the recording.
        char: 'Fischl',
        constellation: 6,
        on: {
            fischl_witch_homework: true,
            fischl_overloaded_buff: true,
            fischl_electrocharged_buff: true,
            fischl_evernight_raven: true,
        },
    },
    {
        // Omen (burst-scaled), C1 reaction bonuses (+off-field extra),
        // C2 Mastery, C4 CRIT Rate and Hexerei
        // Astral Glow. Burst level comes from Mona's own talents (+C5).
        char: 'Mona',
        constellation: 5,
        on: {
            mona_witch_homework: true,
            mona_omen: true,
            mona_prophecy_of_submersion: true,
            mona_prophecy_of_submersion_off_field: true,
            mona_lunar_chain_buff: true,
            mona_prophecy_of_oblivion: true,
            mona_astral_glow: 3,
        },
        ignoreStats: ['mona_char_skill_burst'],
        // C4's CRIT Rate is against the Omen's opponent, not a member's stat.
        corrections: Object.keys(recorded('party.json').scenarios)
            .filter((id) => id.endsWith('__with_Mona'))
            .map((id) => monaC4Correction('party.json', id)),
    },
    {
        // Solar/Silver Isotoma DMG (DEF-scaled, Hexerei-gated, off in the
        // recorded 1-Hexerei teams), Homuncular Mastery, C2 off-field Mastery
        // (independent lasting buff), C4 Plunge (active receivers) and
        // C6 DMG (active receivers).
        char: 'Albedo',
        constellation: 6,
        on: {
            albedo_witch_homework: true,
            albedo_solar_isotoma_buff: true,
            albedo_silver_isotoma_buff: true,
            albedo_homuncular_nature: true,
            albedo_opening_of_hanerozoic: 4,
            albedo_opening_of_hanerozoic_buff: true,
            albedo_descent_of_divinity: true,
            albedo_descent_of_divinity_3s: true,
            albedo_dust_of_purification: true,
        },
        carrierTotals: {def_total: 2000},
        ignoreStats: ['albedo_def_total'],
    },
];

characterConversionTests(CONVERTED);
