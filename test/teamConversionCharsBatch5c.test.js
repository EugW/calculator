import { characterConversionTests } from "./support/teamCharacterConversion";

/**
 * Batch 5c: Chevreuse, Escoffier, Furina, Sigewinne,
 * TravelerAnemo, TravelerDendro, TravelerElectro, TravelerPyro.
 */
const CONVERTED = [
    {
        // Vanguard's Coordinated Tactics: enemy Pyro/Electro RES shred when the
        // Pyro/Electro-only composition holds (hidden TEAM, gate on delivery).
        // Vertical Force Coordination: nearby Pyro/Electro gain ATK from live HP
        // (TEAM + receiver element). C6 In Pursuit: all nearby gain Pyro/Electro
        // DMG (TEAM, Chevreuse included).
        char: 'Chevreuse',
        constellation: 6,
        on: {
            chevreuse_tactics: true,
            chevreuse_force_coordination: true,
            chevreuse_in_pursuit: 3,
        },
        carrierTotals: {hp_total: 30000},
        ignoreStats: ['chevreuse_hp_total'],
    },
    {
        // Inspiration-Immersed Seasoning: Hydro/Cryo RES shred by live Hydro/Cryo
        // count (TEAM, source scope). Pre-Dinner: Cryo CRIT DMG when 4 Hydro/Cryo
        // (TEAM, ascension-gated delivery). Fresh Fragrant Stew: Cryo N/C/P/skill/
        // burst from live ATK for other active members (OTHERS + active).
        char: 'Escoffier',
        constellation: 6,
        on: {escoffier_fresh_fragrant_stew_is_an_art: true},
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['escoffier_atk_total'],
    },
    {
        // Let the People Rejoice: DMG and Incoming Healing for all nearby members
        // from live Fanfare stacks and burst level (TEAM, source included).
        // Constellation 6 keeps the C3 burst bonus (+3, total 13) matching the
        // recorded 124% DMG / 52% healing (old capped base 10 then +3).
        char: 'Furina',
        constellation: 6,
        on: {furina_fanfare_stacks: 400},
        ignoreStats: ['furina_char_skill_burst', 'party_furina_fanfare_stacks'],
    },
    {
        // Requires Appropriate Rest: off-field others' skill flat DMG from live HP
        // above 30000 (OTHERS + off-field; recorded HP 30000 gives 0 either way).
        // C2 Hydro RES shred (TEAM). C2 toggle renamed from party.* to own scope.
        char: 'Sigewinne',
        constellation: 6,
        on: {
            sigewinne_requires_appropriate_rest: true,
            sigewinne_spirits_defeat_its_foes: true,
        },
        carrierTotals: {hp_total: 30000},
        ignoreStats: ['sigewinne_hp_total'],
    },
    {
        // Intertwined Winds: Gust Surge Anemo RES shred + absorbed element RES
        // shred (TEAM enemy debuffs).
        char: 'TravelerAnemo',
        constellation: 6,
        on: {
            traveler_intertwined_winds: true,
            traveler_intertwined_winds_element: 'pyro',
        },
    },
    {
        // Verdant Overgrowth: active character(s) in Lamp AoE gain 6 EM/stack
        // (TEAM + active via hidden Levels). Withering Aggregation: Dendro +12%
        // and transfigured element +12% for the active Lotuslight holder
        // (TEAM + active).
        char: 'TravelerDendro',
        constellation: 6,
        on: {
            traveler_verdant_overgrowth: 10,
            traveler_withering_aggregation_1: true,
            traveler_withering_aggregation_2: 'hydro',
        },
    },
    {
        // Abundance Amulet recharge from live recharge, for the member who
        // picked it up (the recorded receiver, chosen). Violet Vehemence
        // Electro RES shred (TEAM). Resounding Roar is ascension-gated in the new
        // model (no toggle). The typed 200 recharge is matched by giving the
        // carrier 200% live recharge via custom buffs (harness has no
        // recharge_total support; reported for parent).
        char: 'TravelerElectro',
        constellation: 6,
        on: (carrier, receiver, virtual) => {
            if (!virtual) {
                const data = carrier.getBuildData();
                const cur = data.stats.get('recharge_base') + data.stats.get('recharge');
                carrier.modifyBuffsSettings({'custom_buffs.recharge': 200 - cur * 100});
            }
            return {
                traveler_abundance_amulet: true,
                traveler_abundance_amulet_receiver: String(receiver.char.getId()),
                traveler_violet_vehemence: true,
            };
        },
        // A virtual Traveler states the typed Energy Recharge.
        stated: {recharge: 200},
        ignoreStats: ['traveler_recharge'],
    },
    {
        // Starfire's Flowing Light: active character +6% DMG while Threshold
        // active (TEAM + active); +9% more when that active character is in
        // Nightsoul's Blessing (TEAM + active + receiver blessing). Recorded
        // receivers are unblessed, so the second part is 0 as recorded.
        char: 'TravelerPyro',
        constellation: 6,
        on: {traveler_pyro_starfires_flowing_light: true},
    },
];

characterConversionTests(CONVERTED);
