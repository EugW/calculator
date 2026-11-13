/**
 * The released Buffs tab's weapon and set rows (decode shapes in
 * Legacy/BuffData.js) as entries of a team's legacy source (Team/Legacy):
 * which weapon or set a row was, and which of its own controls the row
 * switched on. The effects themselves are the weapon's and the set's:
 * nothing of the old rows is evaluated.
 */

/**
 * Weapon rows. `level` is the old level select (its value is the
 * refinement); rows the old tab could show more than once repeat with the
 * suffixes `_2` and `_3` (`copies`), their typed numbers too.
 * - `on`: the weapon's controls the row meant.
 * - `stated`: stat kind (Team/Overrides) -> the row's typed number.
 * - `receiver`: a control that selects the receiving member: the old row
 *   described the build's own character.
 * - `mode`: an old dropdown that chose the effect's variant; its values map
 *   to controls, null for a row that was off.
 */
export const LEGACY_WEAPON_ROWS = [
    {level: 'weapon.thrilling_tales', type: 'catalyst', weapon: 'ThrillingTales', on: {weapon_thrilling_tales: true}, receiver: 'weapon_thrilling_tales_receiver'},
    {level: 'weapon_other.weapon_wolfs_gravestone', type: 'claymore', weapon: 'WolfsGravestone', on: {weapon_wolfs_gravestone: true}},
    {level: 'weapon_other.weapon_elegy_for_the_end', type: 'bow', weapon: 'ElegyfortheEnd', on: {weapon_elegy_for_the_end: true}},
    {level: 'weapon_other.weapon_song_of_broken_pines', type: 'claymore', weapon: 'SongofBrokenPines', on: {weapon_song_of_broken_pines: true}},
    {level: 'weapon_other.weapon_freedom_sworn', type: 'sword', weapon: 'FreedomSworn', on: {weapon_freedom_sworn: true}},
    {level: 'weapon_other.weapon_white_dragon_ring', type: 'catalyst', weapon: 'HakushinRing', on: {weapon_white_dragon_ring: true}},
    // Sapwood Blade and Forest Regalia share the Leaf of Consciousness.
    {level: 'weapon_other.forest_sanctuary', type: 'sword', weapon: 'SapwoodBlade', on: {weapon_forest_sanctuary: true}},
    {level: 'weapon_other.stillwood_moonshadow', type: 'polearm', weapon: 'Moonpiercer', on: {weapon_stillwood_moonshadow: true}},
    {level: 'weapon.cranes_echoing_call', type: 'catalyst', weapon: 'CranesEchoingCall', on: {weapon_cranes_echoing_call: true}},
    {
        level: 'weapon_other.desert_pavilion', type: 'claymore', weapon: 'MakhairaAquamarine', copies: 3,
        on: {weapon_desert_pavilion: true}, stated: {mastery: 'desert_pavilion_mastery'},
    },
    {
        level: 'weapon_other.weapon_key_of_khaj_nisut', type: 'sword', weapon: 'KeyofKhajNisut', copies: 3,
        on: {weapon_key_of_khaj_nisut: 3}, stated: {hp: 'sunken_song_of_the_sands_hp'},
    },
    {
        level: 'weapon_other.whisper_of_the_jinn', type: 'sword', weapon: 'XiphosMoonlight', copies: 3,
        on: {whisper_of_the_jinn: true}, stated: {mastery: 'whisper_of_the_jinn_mastery'},
    },
    {
        level: 'weapon_other.weapon_thousand_floating_dreams', type: 'catalyst', weapon: 'ThousandFloatingDreams', copies: 3,
        on: {weapon_thousand_floating_dreams_party: true},
    },
    {
        level: 'weapon_other.weapon_peak_patrol_song', type: 'sword', weapon: 'PeakPatrolSong',
        on: {weapon_peak_patrol_song_2: true}, stated: {def: 'peak_patrol_song_def'},
    },
    {level: 'weapon_other.weapon_starcallers_watch', type: 'catalyst', weapon: 'StarcallersWatch', on: {weapon_starcallers_watch: true}},
    {
        // The old mode said who receives it (the active character, or an
        // off-field Hexerei one): that is the receiving member's state now.
        level: 'weapon_other.weapon_angelos_heptades', type: 'catalyst', weapon: 'AngelosHeptades',
        stated: {atk: 'angelos_heptades_atk'},
        mode: {
            name: 'weapon_other.weapon_angelos_heptades_mode',
            values: {
                '-': null,
                active: {weapon_angelos_heptades: true},
                off_field_hexerei: {weapon_angelos_heptades: true},
            },
        },
    },
    {level: 'weapon_other.weapon_symphonist_of_scents', type: 'polearm', weapon: 'SymphonistofScents', on: {symphonist_of_scents_3: true}},
    {level: 'weapon_other.weapon_fractured_halo', type: 'polearm', weapon: 'FracturedHalo', on: {weapon_fractured_halo_2: true}},
    {
        level: 'weapon_other.weapon_nightweavers_looking_glass', type: 'catalyst', weapon: 'NightweaversLookingGlass',
        on: {weapon_nightweavers_looking_glass_3: true},
    },
    {level: 'weapon_other.weapon_golden_frostbound_oath', type: 'bow', weapon: 'GoldenFrostboundOath', on: {weapon_golden_frostbound_oath: true}},
    {
        level: 'weapon_other.weapon_hymn_of_the_maelstrom', type: 'catalyst', weapon: 'HymnofTheMaelstrom',
        stated: {hp: 'weapon_hymn_of_the_maelstrom_holder_hp'},
        mode: {
            name: 'weapon_other.weapon_hymn_of_the_maelstrom_mode',
            values: {
                '-': null,
                hymn_1: {weapon_hymn_of_the_maelstrom_mode: 'hymn', weapon_hymn_of_the_maelstrom_stacks: 1},
                hymn_2: {weapon_hymn_of_the_maelstrom_mode: 'hymn', weapon_hymn_of_the_maelstrom_stacks: 2},
                hymn_3: {weapon_hymn_of_the_maelstrom_mode: 'hymn', weapon_hymn_of_the_maelstrom_stacks: 3},
                triumph_1: {weapon_hymn_of_the_maelstrom_mode: 'triumph', weapon_hymn_of_the_maelstrom_stacks: 1},
                triumph_2: {weapon_hymn_of_the_maelstrom_mode: 'triumph', weapon_hymn_of_the_maelstrom_stacks: 2},
                triumph_3: {weapon_hymn_of_the_maelstrom_mode: 'triumph', weapon_hymn_of_the_maelstrom_stacks: 3},
            },
        },
    },
    {level: 'weapon_other.weapon_breezeborne_refrain', type: 'bow', weapon: 'BreezeborneRefrain', on: {weapon_breezeborne_refrain_points: 3}},
    {level: 'weapon_other.weapon_athame_artis', type: 'sword', weapon: 'AthameArtis', on: {weapon_athame_artis: true}},
];

/**
 * Set rows, in the old tab's order: old control -> the set and its own
 * control, which takes the old value as it is. Rows of one set make one
 * entry. `element` marks the row whose value was the wearer's element.
 */
export const LEGACY_SET_ROWS = [
    {name: 'set_other.noblesse_oblige_4', set: 'NoblesseOblige', control: 'set.noblesse_oblige_4'},
    {name: 'set_other.viridescent_venerer_4', set: 'ViridescentVenerer', control: 'set.viridescent_venerer_4'},
    // The Stellar Swirl checkbox is gone: its shred is the Cryo choice of the
    // row above, which the user makes. The row is read and ignored.
    {name: 'set_other.viridescent_venerer_4_stellarswirl', set: 'ViridescentVenerer', control: null},
    {name: 'set_other.archaic_petra_4', set: 'ArchaicPetra', control: 'set_bonus.archaic_petra_4'},
    {name: 'set_other.instructor_4', set: 'Instructor', control: 'set.instructor_4'},
    {name: 'set_other.maiden_beloved_4', set: 'MaidenBeloved', control: 'set.maiden_beloved_4'},
    {name: 'set_other.tenacity_of_the_millelith_4', set: 'TenacityofMillelith', control: 'set.tenacity_of_the_millelith_4'},
    {name: 'set_other.deepwood_memories_4', set: 'DeepwoodMemories', control: 'set.deepwood_memories_4'},
    {name: 'party_days_past_healing_recorded', set: 'SongOfDaysPast', control: 'days_past_healing_recorded'},
    {name: 'set_other.song_of_days_past_4', set: 'SongOfDaysPast', control: 'set.song_of_days_past_4'},
    {name: 'set_other.scroll_of_the_hero_of_cinder_city_4_1', set: 'ScrollOfTheEmberedCitysHero', control: 'set.scroll_of_the_hero_of_cinder_city_4_1'},
    {name: 'set_other.scroll_of_the_hero_of_cinder_city_4_2', set: 'ScrollOfTheEmberedCitysHero', control: 'set.scroll_of_the_hero_of_cinder_city_4_2'},
    {name: 'set_other.silken_moons_serenade_4', set: 'SilkenMoonsSerenade', control: 'set.silken_moons_serenade_4'},
    {name: 'set_other.night_of_the_skys_unveiling_4', set: 'NightOfTheSkysUnveiling', control: 'set.night_of_the_skys_unveiling_4'},
    // The old rows chose the buffed elements: the wearer's for Light's
    // Guidance, and for Mortal Hymn the wearer's and the active member's,
    // which the team's Hexerei members and its on-field member decide now.
    {name: 'set_other.celestial_gift_4', set: 'CelestialGift', control: 'set.celestial_gift_4', element: true},
    {name: 'set_other.celestial_gift_4_hexerei', set: 'CelestialGift', control: 'set.celestial_gift_4', element: true},
    {name: 'set_other.heart_of_the_furnace_4', set: 'HeartOfTheFurnace', control: 'set.heart_of_the_furnace_4'},
];
