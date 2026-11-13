/**
 * Serialize IDs of stack keys (see classes/Team/Stacking.js). A team stores
 * its chosen sources by these IDs. Every stack key used by
 * content must be listed here; an ID is never reused or changed.
 */
export const STACK_KEYS = {
    wolfs_gravestone: 1,
    millennial_movement_atk: 2,
    millennial_movement_mastery: 3,
    millennial_movement_atk_speed: 4,
    millennial_movement_attack_dmg: 5,
    noblesse_oblige_4: 6,
    instructor_4: 7,
    maiden_beloved_4: 8,
    tenacity_of_the_millelith_4: 9,
    deepwood_memories_4: 10,
    night_of_the_skys_unveiling_4: 11,
    silken_moons_serenade_4_mastery: 12,
    silken_moons_serenade_4_lunar: 13,
    heart_of_the_furnace_4: 14,
    archaic_petra_4: 15,
    viridescent_venerer_4_cryo: 16,
    viridescent_venerer_4_electro: 17,
    viridescent_venerer_4_hydro: 18,
    viridescent_venerer_4_pyro: 19,
    scroll_of_the_hero_of_cinder_city_4_1: 20,
    scroll_of_the_hero_of_cinder_city_4_2: 21,
    song_of_days_past_4: 22,
    celestial_gift_4: 23,
    white_dragon_ring: 24,
    forest_sanctuary: 25,
    stillwood_moonshadow: 26,
    cranes_echoing_call: 27,
    starcallers_watch: 28,
    symphonist_of_scents: 29,
    fractured_halo: 30,
    nightweavers_looking_glass: 31,
    golden_frostbound_oath: 32,
    breezeborne_refrain: 33,
    hymn_of_the_maelstrom: 34,
    peak_patrol_song: 35,
    athame_artis: 36,
    angelos_heptades: 37,
    thrilling_tales: 38,
    key_of_khaj_nisut: 39,
};

let keysById = {};
for (let [key, id] of Object.entries(STACK_KEYS)) {
    keysById[id] = key;
}

/**
 * @param {string} key
 * @returns {number}
 */
export function stackKeyId(key) {
    let id = STACK_KEYS[key];
    if (!id) {
        throw new Error(`Stack key "${key}" has no serialize ID in db/StackKeys.js`);
    }
    return id;
}

/**
 * @param {number} id
 * @returns {string|undefined}
 */
export function stackKeyById(id) {
    return keysById[id];
}
