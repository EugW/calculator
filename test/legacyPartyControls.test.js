import { loadLegacyTeam } from "../src/js/classes/Legacy/Team";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { enemyChange, finalStats, makeBuild, totalMastery } from "./support/team";

global.DB = DB;
global.UI ||= {Lang: {get: () => ''}};

// Party rows of a released link whose controls are laid out differently now
// (Legacy/Team.loadCharacter): a control that was renamed or split, a state
// the old row took for granted, a constellation the row had no switch for.
// The numbers are the released engine's for the same row (54e1d63, one
// control at a time); every recorded row with all its controls on is checked
// in test/teamConversionChars*.test.js ("virtual: link").

const charId = (key) => DB.Chars.get(key).getId();

/**
 * @param {string} receiverKey the link's character
 * @param {string} charKey the party row's character
 * @param {Object} row the row's controls, by their released names
 * @param {Object} [teamSettings] the link's team toggles
 * @returns {{receiver: CalcSet, entry: VirtualCharacter, settings: Object, report: Object}}
 */
function load(receiverKey, charKey, row, teamSettings = {}) {
    const receiver = makeBuild(receiverKey);
    const team = Team.fromMember(receiver);
    const report = loadLegacyTeam(team, {
        party: [{charId: charId(charKey), settings: row}],
        buffs: {},
        settings: teamSettings,
        dropped: [],
    });
    const entry = team.legacy.getBySourceId(charId(charKey));
    return {receiver, entry, settings: entry.char.getSettings(), report};
}

/**
 * What a row's controls give the link's character: its final stats with the
 * row against the same row without them.
 *
 * @param {Object} typed the row's typed stats and talent levels
 * @param {Object} controls the row's controls
 * @returns {function(string): number} the change of a stat
 */
function effect(receiverKey, charKey, typed, controls, teamSettings) {
    const off = finalStats(load(receiverKey, charKey, typed, teamSettings).receiver);
    const loaded = load(receiverKey, charKey, Object.assign({}, typed, controls), teamSettings);
    const on = finalStats(loaded.receiver);
    const change = (stat) => on.get(stat) - off.get(stat);
    change.enemy = (stat) => enemyChange(loaded.receiver, stat, on);
    change.mastery = () => totalMastery(on) - totalMastery(off);
    return change;
}

describe("a control that was renamed or split", () => {
    test("Odette: the row's Marvelous Splendor stacks were the party's", () => {
        const row = {'party.odette_marvelous_splendor': 4};
        const {settings, entry} = load('Sandrone', 'Odette', row);
        expect(settings.odette_marvelous_splendor_others).toBe(4);
        expect(settings.odette_marvelous_splendor).toBeUndefined();
        expect(entry.getConstellation()).toBe(0);
        expect(effect('Sandrone', 'Odette', {}, row)('dmg_stellarglimmer')).toBeCloseTo(0.6, 10);
    });

    test("Iansan: her C2 switch is her C2 and her Precise Movement", () => {
        const row = {'party.iansan_laziness_is_the_enemy': true};
        const {settings, entry, report} = load('Hutao', 'Iansan', row);
        expect(entry.getConstellation()).toBe(2);
        expect(settings.iansan_enhanced_resistance_training).toBe(true);
        expect(report.dropped).toEqual([]);
        expect(effect('Hutao', 'Iansan', {}, row)('atk_percent')).toBeCloseTo(0.3, 10);
    });

    test("Xilonen: her Nightsoul's Blessing kept the Geo sample only", () => {
        const typed = {xilonen_char_skill_elemental: 10};
        const blessing = load('Hutao', 'Xilonen', Object.assign({'party.xilonen_blessing_state': true}, typed));
        expect(blessing.settings['common.nightsoul_blessing_state']).toBe(true);
        expect(blessing.settings.xilonen_samplers).toBeUndefined();

        const change = effect('Hutao', 'Xilonen', typed, {'party.xilonen_blessing_state': true});
        expect(change.enemy('enemy_res_geo')).toBeCloseTo(-0.36, 10);
        expect(change.enemy('enemy_res_pyro')).toBeCloseTo(0, 10);

        // All the samples are the other control, as before.
        const samplers = effect('Hutao', 'Xilonen', typed, {'party.xilonen_samplers': true});
        expect(samplers.enemy('enemy_res_geo')).toBeCloseTo(-0.36, 10);
    });

    test("Durin: the Pyro of his C2 bonus is a switch of its own", () => {
        const all = load('Hutao', 'Durin', {'party.durin_c2_dmg_bonus': 'pyro;hydro;cryo'});
        expect(all.settings.durin_c2_pyro_bonus).toBe(true);
        expect(all.settings.durin_c2_dmg_bonus).toBe('hydro;cryo');
        expect(all.entry.getConstellation()).toBe(2);

        const pyro = load('Hutao', 'Durin', {'party.durin_c2_dmg_bonus': 'pyro'});
        expect(pyro.settings.durin_c2_pyro_bonus).toBe(true);
        expect(pyro.settings.durin_c2_dmg_bonus).toBeFalsy();
        expect(effect('Hutao', 'Durin', {}, {'party.durin_c2_dmg_bonus': 'pyro'})('dmg_pyro')).toBeCloseTo(0.5, 10);

        const others = load('Hutao', 'Durin', {'party.durin_c2_dmg_bonus': 'hydro;geo'});
        expect(others.settings.durin_c2_pyro_bonus).toBeFalsy();
        expect(others.settings.durin_c2_dmg_bonus).toBe('hydro;geo');
    });

    test("Diona: the healing mode of her C6 applied only without the Elemental Mastery one", () => {
        const both = load('Hutao', 'Diona', {'party.diona_cats_tail_1': true, 'party.diona_cats_tail_2': true});
        expect(both.settings.diona_cats_tail_mastery).toBe(true);
        expect(both.settings.diona_cats_tail).toBeFalsy();
        const change = effect('Hutao', 'Diona', {}, {'party.diona_cats_tail_1': true, 'party.diona_cats_tail_2': true});
        expect(change.mastery()).toBeCloseTo(200, 10);
        expect(change('healing_recv')).toBeCloseTo(0, 10);

        const healing = load('Hutao', 'Diona', {'party.diona_cats_tail_2': true});
        expect(healing.settings.diona_cats_tail).toBe(true);
        expect(effect('Hutao', 'Diona', {}, {'party.diona_cats_tail_2': true})('healing_recv')).toBeCloseTo(0.3, 10);
    });

    test("Electro Traveler: the ascension passive alone is not the Abundance Amulet", () => {
        const typed = {traveler_recharge: 200};
        const roar = load('Hutao', 'TravelerElectro', Object.assign({'party.traveler_resounding_roar': true}, typed));
        expect(roar.settings.traveler_abundance_amulet).toBeFalsy();
        expect(roar.report.dropped).toEqual([]);
        expect(effect('Hutao', 'TravelerElectro', typed, {'party.traveler_resounding_roar': true})('recharge')).toBeCloseTo(0, 10);

        const amulet = load('Hutao', 'TravelerElectro', Object.assign({'party.traveler_abundance_amulet': true}, typed));
        expect(amulet.settings.traveler_abundance_amulet).toBe(true);
    });
});

describe("a state the old row took for granted", () => {
    test("Odette: her C6 switch reached the party holding Marvelous Splendor", () => {
        const row = {'party.odette_c6_splendor': true};
        const {settings, entry} = load('Sandrone', 'Odette', row);
        expect(entry.getConstellation()).toBe(6);
        expect(settings.odette_all_party_marvelous_splendor).toBe(true);
        expect(effect('Sandrone', 'Odette', {}, row)('dmg_stellarglimmer_special')).toBeCloseTo(0.25, 10);
    });

    test("Nahida: Compassion Illuminated is inside her Shrine of Maya", () => {
        const typed = {party_max_mastery: 5000};
        const row = {'party.nahida_compassion_illuminated': true};
        const {settings} = load('Hutao', 'Nahida', Object.assign({}, typed, row));
        expect(settings.nahida_illusory_heart).toBe(true);
        expect(settings.nahida_compassion_illuminated).toBe(true);
        expect(effect('Hutao', 'Nahida', typed, row).mastery()).toBeCloseTo(250, 10);
    });

    test("Ifa: Field Medic's Vision is in his Nightsoul's Blessing", () => {
        const row = {party_ifa_field_medics_vision: 200};
        const {settings} = load('Hutao', 'Ifa', row);
        expect(settings['common.nightsoul_blessing_state']).toBe(true);
        expect(settings.ifa_field_medics_vision).toBe(200);

        const change = effect('Hutao', 'Ifa', {}, row);
        expect(change('dmg_reaction_swirl')).toBeCloseTo(3, 10);
        expect(change('dmg_reaction_electrocharged')).toBeCloseTo(3, 10);
        expect(change('dmg_reaction_lunarcharged')).toBeCloseTo(0.4, 10);
        expect(change('dmg_stellarswirl')).toBeCloseTo(0.48, 10);
    });

    test("Cyno: his C1 and C2 are in Radiance: Stellar-Conduct, in a Polestar Field", () => {
        const row = {'party.cyno_together_we_rise': true};
        const {settings, entry} = load('Hutao', 'Cyno', row);
        expect(entry.getConstellation()).toBe(1);
        expect(settings.cyno_radiance_stellarconduct).toBe(true);
        expect(load('Hutao', 'Cyno', {'party.cyno_homecoming_of_spirits_stellarconduct': 5, 'party.cyno_together_we_rise': true})
            .settings.cyno_radiance_stellarconduct).toBe(true);

        // The field is the team's and is not set for the link: the released
        // row applied without one.
        expect(effect('Hutao', 'Cyno', {}, row).mastery()).toBeCloseTo(0, 10);
        expect(effect('Hutao', 'Cyno', {}, row, {polestar_field: true}).mastery()).toBeCloseTo(200, 10);
    });

    test("Columbina: the dominant Lunar reaction of her C2 is with her Lunar Brilliance", () => {
        const {settings, entry} = load('Hutao', 'Columbina', {'party.columbina_c2_dominant_lunar': 'geo'});
        expect(entry.getConstellation()).toBe(2);
        expect(settings.columbina_lunar_brilliance).toBe(true);
        expect(settings.columbina_c2_dominant_lunar).toBe('geo');
    });

    test("a control that is off brings nothing", () => {
        const {settings} = load('Hutao', 'Nahida', {'party.nahida_compassion_illuminated': false});
        expect(settings.nahida_illusory_heart).toBeFalsy();
    });
});

describe("a constellation the row had no switch for", () => {
    test("Pyro Traveler: a control of a constellation means that constellation", () => {
        const row = {'party.traveler_pyro_starfires_flowing_light': true};
        const {settings, entry} = load('Hutao', 'TravelerPyro', row);
        expect(entry.getConstellation()).toBe(1);
        expect(settings.traveler_pyro_starfires_flowing_light).toBe(true);
        expect(effect('Hutao', 'TravelerPyro', {}, row)('dmg_all')).toBeCloseTo(0.06, 10);
    });

    test("Furina: Fanfare above 300 is her C1", () => {
        const typed = {furina_char_skill_burst: 10};
        const high = load('Hutao', 'Furina', Object.assign({party_furina_fanfare_stacks: 400}, typed));
        expect(high.entry.getConstellation()).toBe(1);
        expect(high.settings.furina_fanfare_stacks).toBe(400);
        const change = effect('Hutao', 'Furina', typed, {party_furina_fanfare_stacks: 400});
        expect(change('dmg_all')).toBeCloseTo(1, 10);
        expect(change('healing_recv')).toBeCloseTo(0.4, 10);

        const base = load('Hutao', 'Furina', Object.assign({party_furina_fanfare_stacks: 300}, typed));
        expect(base.entry.getConstellation()).toBe(0);
        expect(effect('Hutao', 'Furina', typed, {party_furina_fanfare_stacks: 300})('dmg_all')).toBeCloseTo(0.75, 10);
    });

    test("Mika: a fifth Detector stack is his C6", () => {
        expect(load('Eula', 'Mika', {mika_suppressive_barrage: 5}).entry.getConstellation()).toBe(6);
        expect(effect('Eula', 'Mika', {}, {mika_suppressive_barrage: 5})('dmg_phys')).toBeCloseTo(0.5, 10);

        expect(load('Eula', 'Mika', {mika_suppressive_barrage: 4}).entry.getConstellation()).toBe(0);
        expect(effect('Eula', 'Mika', {}, {mika_suppressive_barrage: 4})('dmg_phys')).toBeCloseTo(0.4, 10);
    });

    test("a control a constellation only reads, and a chosen recipient, mean no constellation", () => {
        // Odette's C2 reads her Solo Dance: Double; Lohen's recipient of
        // Flippant Masterpiece is chosen for every row of his.
        expect(load('Sandrone', 'Odette', {'party.odette_solo_dance_double': true}).entry.getConstellation()).toBe(0);
        const lohen = load('Hutao', 'Lohen', {'party.lohen_flippant_masterpiece': true});
        expect(lohen.settings.lohen_flippant_masterpiece_receiver).toBe(charId('Hutao'));
        expect(lohen.entry.getConstellation()).toBe(0);
    });

    test("the row's own switches still count, and a count no constellation allows changes nothing", () => {
        const switched = load('Hutao', 'Furina', {party_furina_fanfare_stacks: 400, 'party.furina_constellation_3': true});
        expect(switched.entry.getConstellation()).toBe(3);

        const beyond = load('Hutao', 'Furina', {party_furina_fanfare_stacks: 9999});
        expect(beyond.entry.getConstellation()).toBe(0);
    });
});
