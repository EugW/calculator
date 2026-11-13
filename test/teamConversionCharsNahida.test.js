import { alhaithamA4Correction } from "./support/buffChains";
import { characterConversionTests } from "./support/teamCharacterConversion";

/**
 * Nahida, converted by the parent: her A1 reads the team's highest
 * Elemental Mastery, which the old party row typed in.
 */
const CONVERTED = [
    {
        // Compassion Illuminated: the on-field member gains 25% of the
        // highest Elemental Mastery in the team (the recorded 5000 is
        // Nahida's); The Root of All Fullness (C2): reaction CRIT on
        // opponents marked by her and their DEF shred, for the whole team.
        char: 'Nahida',
        constellation: 2,
        on: {
            nahida_illusory_heart: true,
            nahida_compassion_illuminated: true,
            nahida_the_root_of_all_fullness: true,
        },
        carrierTotals: {mastery_total: 5000},
        ignoreStats: ['party_max_mastery'],
        // Alhaitham's A4 counts her A1's EM (md/buff_chains.md).
        corrections: [alhaithamA4Correction('party.json', 'Alhaitham__with_Nahida')],
    },
];

characterConversionTests(CONVERTED);
