import { CalcSet } from "../src/js/classes/CalcSet";
import { isExtraStat } from "../src/js/classes/PostEffect/Channels";
import { Serializer } from "../src/js/classes/Serializer";
import { Team } from "../src/js/classes/Team";
import { computeScenarioResults, ensureTestGlobals, numbersClose } from "./support/baseline";
import { recorded } from "./support/teamConversion";

ensureTestGlobals();

// Every control of every released party row, one at a time, as a released
// link holds it and as the link loads here (Legacy/Team.loadLegacyTeam).
//
// test/baseline/party-controls.json is recorded by the released engine
// (54e1d63; the recorder is md/tools/party_controls_recorder.test.js): for
// every receiver and party character, a link of the row with its typed stats
// and talent levels only ("base"), and one of the row with each control on
// top of them, a dropdown once per value. The results are read from the
// link, so a control the released row did not save alone is not in it.
//
// What is compared is the effect of the control: what it changes against
// the base, in the receiver's final stats and as a factor of each feature.
// What differs without the control (a correction of the model, an effect
// that needs no control now) cancels out. The rows with every control on
// are compared whole in test/teamConversionChars*.test.js ("virtual: link").

/**
 * Controls whose effect alone is not the released one, by design. The
 * reason is the same for every control of a group.
 */
const BY_DESIGN = [
    // A counter of the released model, which nothing read without the
    // control it belonged to.
    ['Bennet', 'party.bennet_constellation_1'],
    // The released model kept the CRIT Rate against opponents affected by
    // Omen among the receiver's own.
    ['Mona', 'party.mona_prophecy_of_oblivion'],
    // Alhaitham's fourth ascension passive counts the Elemental Mastery a
    // teammate gives him (md/buff_chains.md): only he differs.
    ['Sucrose', 'party.sucrose_mollis_favonius'],
    ['Mizuki', 'party.mizuki_dreamdrifter'],
    ['Ineffa', 'party.ineffa_panoramic_permutation_protocol'],
    ['Nahida', 'party.nahida_compassion_illuminated'],

    // An ascension passive the row had a switch for. A virtual character is
    // fully ascended, so its control has the passive's part with it.
    ['Chongyun', 'party.chongyun_layered_frost'],
    ['TravelerElectro', 'party.traveler_abundance_amulet'],
    ['Gorou', 'party.gorou_generals_war_banner'],
    ['Shenhe', 'party.shenhe_spirit_field'],
    ['Candace', 'party.candace_prayer_of_the_crimson_crown'],
    // What the team's composition decides now, with or without the control.
    ['YunJin', 'party.yunjin_flag'],
    ['YunJin', 'party.yunjin_traditionalist'],
    ['Escoffier', 'party_escoffier_inspiration_immersed_seasoning'],
    ['Vesna', 'party.vesna_stellar_jubilee'],

    // A switch of a constellation means the character has it, and with it
    // what the lower ones give without a control: Nahida's C2 reaction
    // CRIT, Xilonen's Geo sample of C2, Columbina's elevations, Linnea's
    // Lunar-Crystallize of C1.
    ['Nahida', 'party.nahida_the_root_of_all_fullness_2'],
    ['Xilonen', 'party.xilonen_constellation_3'],
    ['Xilonen', 'party.xilonen_suchitls_trance'],
    ['Columbina', 'party.columbina_c2_dominant_lunar'],
    ['Columbina', 'party.columbina_c6_crit'],
    ['Linnea', 'party.linnea_tidings_of_joy_and_sorrow'],
    ['Linnea', 'party.linnea_expert_instinct'],
    ['Linnea', 'party.linnea_golden_beagles_dream'],

    // What the game asks of the team or of the field, which the released
    // row did not check and the link does not set: a Polestar Field (Cyno),
    // Ascendant Gleam (Lauma, Illuga).
    ['Cyno', 'party.cyno_together_we_rise'],
    ['Lauma', 'party.lauma_twine_warnings_and_tales_from_the_north'],
    ['Lauma', 'party.lauma_i_offer_blood_and_tears_to_the_moonlight'],
    ['Illuga', 'party.illuga_lightkeepers_oath'],
    // Her C6 is for the time of her Dreamdrifter state, which has its own
    // effects and is not switched on for it.
    ['Mizuki', 'party.mizuki_the_heart_lingers_long'],
    // The game elevates Nefer's own Lunar-Bloom only.
    ['Nefer', 'party.nefer_victory_flows_from_the_turning_of_tides'],
];

const scenarios = recorded('party-controls.json').scenarios;
const partyKeys = [...new Set(Object.keys(scenarios).map((id) => id.split('__')[1].replace(/^with_/, '')))];

const skipped = (key) => key == 'party_burst_energy_cost' || /^m\d+__/.test(key) || /^text_/.test(key) || isExtraStat(key);

function load(packed) {
    const member = Team.solo(CalcSet.deserialize(Serializer.unpack(packed)));
    return computeScenarioResults(member);
}

/**
 * @param {Object} old the released results with the control
 * @param {Object} oldBase the released results without it
 * @param {Object} now this version's results with the control
 * @param {Object} nowBase this version's results without it
 * @returns {string|null} the first thing the control changes differently
 */
function difference(old, oldBase, now, nowBase) {
    // The released model kept its typed inputs among the stats.
    const inputs = new Set(Object.keys(old.inputs.buffsSettings));
    const keys = new Set([old, oldBase, now, nowBase].flatMap((item) => Object.keys(item.stats)));
    for (const key of keys) {
        if (skipped(key) || inputs.has(key)) continue;
        const released = (old.stats[key] || 0) - (oldBase.stats[key] || 0);
        const loaded = (now.stats[key] || 0) - (nowBase.stats[key] || 0);
        if (!numbersClose(loaded, released) && Math.abs(loaded - released) > 1e-7) {
            return `stat ${key}: released ${released}, loaded ${loaded}`;
        }
    }
    for (const name of Object.keys(old.features)) {
        for (const field of ['normal', 'crit', 'average']) {
            const values = [old, oldBase, now, nowBase].map((item) => item.features[name]?.[field]);
            if (!values.every((value) => typeof value == 'number')) {
                // A feature the control adds or removes, in one version only.
                const [a, b, c, d] = values.map((value) => value == null);
                if (a != c && b == d) return `feature ${name}.${field}: released ${values[0]}, loaded ${values[2]}`;
                continue;
            }
            const [a, b, c, d] = values;
            const released = b ? a / b : (a ? Infinity : 1);
            const loaded = d ? c / d : (c ? Infinity : 1);
            if (Math.abs(released - loaded) > 1e-6 * Math.max(1, Math.abs(released))) {
                return `feature ${name}.${field}: released x${released}, loaded x${loaded}`;
            }
        }
    }
    return null;
}

test("the recording holds every party character", () => {
    expect(partyKeys.length).toBeGreaterThan(100);
    for (const [char, control] of BY_DESIGN) {
        const found = Object.keys(scenarios).some((id) => id.includes(`__with_${char}__only__${control}`));
        expect([char, control, found]).toEqual([char, control, true]);
    }
});

test.each(partyKeys)("%s: each control alone does what the released row did", (party) => {
    const bases = {};
    const differing = {};
    for (const [id, old] of Object.entries(scenarios)) {
        const match = /^(\w+)__with_(\w+)__only__(.+)$/.exec(id);
        if (!match || match[2] != party) continue;

        const [, receiver, , variant] = match;
        const oldBase = scenarios[`${receiver}__with_${party}__base`];
        // A control the released row did not save alone.
        if (old.packed == oldBase.packed) continue;

        bases[receiver] ||= load(oldBase.packed);
        const found = difference(old, oldBase, load(old.packed), bases[receiver]);
        if (found) differing[variant.split('=')[0]] ||= `${receiver}: ${found}`;
    }

    const expected = BY_DESIGN.filter(([char]) => char == party).map(([, control]) => control);
    const unexpected = Object.fromEntries(Object.entries(differing).filter(([control]) => !expected.includes(control)));
    expect(unexpected).toEqual({});
    // A listed control that does what the released row did is listed for nothing.
    expect(expected.filter((control) => !differing[control])).toEqual([]);
});
