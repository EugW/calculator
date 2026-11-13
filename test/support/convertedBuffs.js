import { alhaithamA4Correction } from "./buffChains";

/**
 * Party weapon and set buffs of the old model, converted to effects the
 * weapon or set itself delivers. Each row names the recorded scenarios it
 * replaces (`weapon_other.*`, `set_other.*` in test/baseline/buffs.json) and
 * how the converted effect is switched on. The same rows are checked with a
 * carrier teammate holding the item (teamConversionWeapons, teamConversionSets)
 * and with the item as a floating entry of the team's legacy source
 * (teamLegacyFloating). Row fields: md/team_content_guide.md.
 */
export const CONVERTED_WEAPONS = [
    {
        condition: 'weapon_other.weapon_athame_artis',
        type: 'sword',
        weapon: 'AthameArtis',
        refine: 5,
        on: {weapon_athame_artis: true},
    },
    {
        condition: 'angelos_heptades_atk',
        ignoreStats: ['angelos_heptades_atk'],
        type: 'catalyst',
        weapon: 'AngelosHeptades',
        refine: 5,
        // This recording set the typed ATK but left the old mode disabled.
        // The live, enabled effect is covered in teamHexereiWeapons.test.js.
        on: {},
        carrierTotals: {atk_total: 20000},
    },
    {
        condition: 'weapon_other.weapon_wolfs_gravestone',
        type: 'claymore',
        weapon: 'WolfsGravestone',
        refine: 5,
        on: {weapon_wolfs_gravestone: true},
    },
    {
        condition: 'weapon_other.weapon_elegy_for_the_end',
        type: 'bow',
        weapon: 'ElegyfortheEnd',
        refine: 5,
        on: {weapon_elegy_for_the_end: true},
    },
    {
        condition: 'weapon_other.weapon_song_of_broken_pines',
        type: 'claymore',
        weapon: 'SongofBrokenPines',
        refine: 5,
        on: {weapon_song_of_broken_pines: true},
    },
    {
        condition: 'weapon_other.weapon_freedom_sworn',
        type: 'sword',
        weapon: 'FreedomSworn',
        refine: 5,
        on: {weapon_freedom_sworn: true},
    },
    {
        condition: 'weapon.thrilling_tales',
        type: 'catalyst',
        weapon: 'ThrillingTales',
        refine: 5,
        on: {weapon_thrilling_tales: true},
        receiverSetting: 'weapon_thrilling_tales_receiver',
    },
    {
        condition: 'weapon_other.weapon_white_dragon_ring',
        type: 'catalyst',
        weapon: 'HakushinRing',
        refine: 5,
        on: {weapon_white_dragon_ring: true},
    },
    {
        condition: 'weapon_other.forest_sanctuary',
        type: 'sword',
        weapon: 'SapwoodBlade',
        refine: 5,
        on: {weapon_forest_sanctuary: true},
    },
    {
        condition: 'weapon_other.stillwood_moonshadow',
        type: 'polearm',
        weapon: 'Moonpiercer',
        refine: 5,
        on: {weapon_stillwood_moonshadow: true},
    },
    {
        condition: 'weapon.cranes_echoing_call',
        type: 'catalyst',
        weapon: 'CranesEchoingCall',
        refine: 5,
        on: {weapon_cranes_echoing_call: true},
    },
    {
        condition: 'weapon_other.weapon_thousand_floating_dreams',
        type: 'catalyst',
        weapon: 'ThousandFloatingDreams',
        refine: 5,
        on: {weapon_thousand_floating_dreams_party: true},
    },
    {
        condition: 'weapon_other.weapon_starcallers_watch',
        type: 'catalyst',
        weapon: 'StarcallersWatch',
        refine: 5,
        on: {weapon_starcallers_watch: true},
    },
    {
        condition: 'weapon_other.weapon_symphonist_of_scents',
        type: 'polearm',
        weapon: 'SymphonistofScents',
        refine: 5,
        on: {symphonist_of_scents_3: true},
    },
    {
        condition: 'weapon_other.weapon_fractured_halo',
        type: 'polearm',
        weapon: 'FracturedHalo',
        refine: 5,
        on: {weapon_fractured_halo_2: true},
    },
    {
        condition: 'weapon_other.weapon_nightweavers_looking_glass',
        type: 'catalyst',
        weapon: 'NightweaversLookingGlass',
        refine: 5,
        on: {weapon_nightweavers_looking_glass_3: true},
    },
    {
        condition: 'weapon_other.weapon_golden_frostbound_oath',
        type: 'bow',
        weapon: 'GoldenFrostboundOath',
        refine: 5,
        on: {weapon_golden_frostbound_oath: true},
    },
    {
        condition: 'weapon_other.weapon_breezeborne_refrain',
        type: 'bow',
        weapon: 'BreezeborneRefrain',
        refine: 5,
        on: {weapon_breezeborne_refrain_points: 3},
    },
    {
        condition: 'desert_pavilion_mastery',
        ignoreStats: ['desert_pavilion_mastery'],
        type: 'claymore',
        weapon: 'MakhairaAquamarine',
        refine: 5,
        on: {weapon_desert_pavilion: true},
        carrierTotals: {mastery_total: 10000},
    },
    {
        condition: 'whisper_of_the_jinn_mastery',
        ignoreStats: ['whisper_of_the_jinn_mastery'],
        type: 'sword',
        weapon: 'XiphosMoonlight',
        refine: 5,
        on: {whisper_of_the_jinn: true},
        carrierTotals: {mastery_total: 10000},
    },
    {
        condition: 'sunken_song_of_the_sands_hp',
        ignoreStats: ['sunken_song_of_the_sands_hp'],
        type: 'sword',
        weapon: 'KeyofKhajNisut',
        refine: 5,
        on: {weapon_key_of_khaj_nisut: 3},
        carrierTotals: {hp_total: 150000},
        // Alhaitham's A4 counts the Key's party EM (md/buff_chains.md).
        corrections: [alhaithamA4Correction('buffs.json', 'Alhaitham::sunken_song_of_the_sands_hp')],
    },
    {
        condition: 'peak_patrol_song_def',
        ignoreStats: ['peak_patrol_song_def'],
        type: 'sword',
        weapon: 'PeakPatrolSong',
        refine: 5,
        on: {weapon_peak_patrol_song_2: true},
        carrierTotals: {def_total: 20000},
    },
    {
        condition: 'weapon_hymn_of_the_maelstrom_holder_hp',
        ignoreStats: ['weapon_hymn_of_the_maelstrom_holder_hp'],
        type: 'catalyst',
        weapon: 'HymnofTheMaelstrom',
        refine: 5,
        on: {},
        carrierTotals: {hp_total: 150000},
    },
];

const anemo = (char) => char.element == 'anemo';
const natlan = (char) => char.origin == 'natlan';

export const CONVERTED_SETS = [
    {condition: 'set_other.noblesse_oblige_4', set: 'NoblesseOblige', on: {'set.noblesse_oblige_4': true}},
    {condition: 'set_other.instructor_4', set: 'Instructor', on: {'set.instructor_4': true}},
    {condition: 'set_other.maiden_beloved_4', set: 'MaidenBeloved', on: {'set.maiden_beloved_4': true}},
    {condition: 'set_other.tenacity_of_the_millelith_4', set: 'TenacityofMillelith', on: {'set.tenacity_of_the_millelith_4': true}},
    {condition: 'set_other.deepwood_memories_4', set: 'DeepwoodMemories', on: {'set.deepwood_memories_4': true}},
    {condition: 'set_other.night_of_the_skys_unveiling_4', set: 'NightOfTheSkysUnveiling', on: {'set.night_of_the_skys_unveiling_4': true}},
    {condition: 'set_other.silken_moons_serenade_4', set: 'SilkenMoonsSerenade', on: {'set.silken_moons_serenade_4': true}},
    {condition: 'set_other.heart_of_the_furnace_4', set: 'HeartOfTheFurnace', on: {'set.heart_of_the_furnace_4': true}},
    {condition: 'set_other.archaic_petra_4', set: 'ArchaicPetra', on: {'set_bonus.archaic_petra_4': 'pyro'}},
    {
        condition: 'set_other.viridescent_venerer_4',
        set: 'ViridescentVenerer',
        on: {'set.viridescent_venerer_4': 'cryo;electro;hydro;pyro'},
        carrierFilter: anemo,
    },
    {
        condition: 'set_other.viridescent_venerer_4_stellarswirl',
        set: 'ViridescentVenerer',
        // The Stellar Swirl checkbox is gone: the recorded shred is the Cryo choice.
        on: {'set.viridescent_venerer_4': 'cryo'},
        carrierFilter: anemo,
    },
    {
        condition: 'set_other.scroll_of_the_hero_of_cinder_city_4_1',
        set: 'ScrollOfTheEmberedCitysHero',
        on: {'set.scroll_of_the_hero_of_cinder_city_4_1': true},
    },
    {
        condition: 'set_other.scroll_of_the_hero_of_cinder_city_4_2',
        set: 'ScrollOfTheEmberedCitysHero',
        on: {'set.scroll_of_the_hero_of_cinder_city_4_2': true},
        carrierFilter: natlan,
    },
    {
        condition: 'set_other.song_of_days_past_4',
        set: 'SongOfDaysPast',
        on: {'set.song_of_days_past_4': true},
    },
];
