import { alhaithamA4Correction, totalReaders } from "./support/buffChains";
import { characterConversionTests } from "./support/teamCharacterConversion";
import { recorded } from "./support/teamConversion";

/**
 * Batch 5d: Alyosha, Mizuki, Vodyanitsa. Typed-in teammate stats become the
 * carrier's real totals (carrierTotals).
 */
const CONVERTED = [
    {
        // Hunter's Mark grants Hunter's Precision to all nearby members; the
        // listed ATK bonus applies while on the field (the recorded
        // receiver). C6 allows 2 stacks with +100 EM on the field. Into the
        // Fray adds Stellar-Conduct DMG on the field under a Polestar Field,
        // which the recording does not set.
        char: 'Alyosha',
        constellation: 6,
        on: {
            alyosha_hunters_precision: 1,
            alyosha_radiance_stellarconduct: true,
        },
        ignoreStats: ['alyosha_char_skill_elemental'],
    },
    {
        // Dreamdrifter shares (Swirl, Stellar Swirl, Vast 10% EM), the C1
        // reaction flats, the C2 element DMG with enemy RES, and the C6 Swirl
        // crit reach nearby members. Source talents and constellation replace
        // the typed inputs; C1's own extra hit stays on Mizuki.
        char: 'Mizuki',
        constellation: 6,
        on: (carrier, receiver, virtual) => {
            // Match the recorded 800 EM at the post-effect input stage.
            // Vast, Swirl and C2 all read this same stage. Vast remains
            // active on Mizuki too, so her final EM is 880 and C1 uses it.
            if (!virtual) {
                const stageZero = carrier.getBuildData().stats;
                carrier.modifyBuffsSettings({
                    'custom_buffs.mastery': 800 - stageZero.get('mastery_base') - stageZero.get('mastery'),
                });
            }
            return {mizuki_dreamdrifter: true, mizuki_in_mist_like_waters: true};
        },
        // A virtual Mizuki states the 800: it is final, as the typed value
        // was, so Vast adds nothing to it and C1 uses 800 as recorded.
        stated: {mastery: 800},
        virtualCorrections: [alhaithamA4Correction('party.json', 'Alhaitham__with_Mizuki')],
        ignoreStats: ['mizuki_mastery', 'mizuki_char_skill_elemental'],
        // Her Swirl bonuses read total EM now (Vast's own share included);
        // the recording read premod. buffChainsMizuki checks the total read.
        recordedPremodReads: () => totalReaders('Mizuki', ['dmg_reaction_swirl', 'dmg_stellarswirl']),
        corrections: [{
            scenarios: ['Wanderer__with_Mizuki'],
            // Vast: "Elemental Mastery of nearby party characters ... 10%"
            // includes Mizuki. C1 uses "1,100% ... of Mizuki's Elemental
            // Mastery", so the live 880 EM adds 11 * 80 = 880 flat damage
            // beyond the old typed 800. With the recorded 10% RES and C2's
            // -20% RES, each Swirl gains 880 * 1.05 noncritical damage.
            // The same ratio applies to its critical and average values.
            featureFactors: Object.fromEntries(['pyro', 'hydro', 'cryo', 'electro'].map((element) => {
                const name = 'reaction.swirl_' + element;
                const oldNormal = recorded('party.json').scenarios.Wanderer__with_Mizuki.features[name].normal;
                return [name, (oldNormal + 11 * 80 * 1.05) / oldNormal];
            })),
        },
        // Alhaitham's A4 counts Vast's EM (md/buff_chains.md).
        alhaithamA4Correction('party.json', 'Alhaitham__with_Mizuki')],
    },
    {
        // Song of Ages Past RES, the A1 Anemo shred, C1 ATK, C2 active CRIT
        // DMG (all members at C6) and C6 DMG reach the team. Lead Vocal feeds
        // the active member's hits, Chorus the other members' hits; the
        // Wandering Vortex switches both to Stellar Swirl.
        char: 'Vodyanitsa',
        constellation: 6,
        on: {
            vodyanitsa_song_of_ages_past: true,
            vodyanitsa_wandering_vortex: true,
            vodyanitsa_lead_vocal: 25,
            vodyanitsa_chorus: 10,
            vodyanitsa_c1_healing: true,
            vodyanitsa_c2_horn_hit: true,
        },
        carrierTotals: {hp_total: 30000},
        ignoreStats: ['vodyanitsa_hp_total', 'vodyanitsa_char_skill_elemental'],
    },
];

characterConversionTests(CONVERTED);
