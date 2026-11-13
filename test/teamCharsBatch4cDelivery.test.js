import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, featureValues } from "./support/team";

global.DB = DB;

function teamWith(receiverKey, carrierKey, constellation = 6) {
    const receiver = makeBuild(receiverKey);
    const carrier = makeBuild(carrierKey);
    carrier.setCharLevels({level: 90, ascension: 6, constellation});
    const team = Team.fromMember(receiver);
    team.setMember(1, carrier);
    return {team, receiver, carrier};
}

test("Durin C1 party scales live on ATK and excludes the source", () => {
    const {receiver, carrier} = teamWith('Tartaglia', 'Durin', 6);
    // Exclusion first (same ATK): toggling the party branch must not touch Durin himself.
    carrier.setCharSettings({});
    const sourceOff = featureValues(carrier)['attack.normal_hit_1'];
    carrier.setCharSettings({durin_c1_cycle_party: true});
    const sourceOn = featureValues(carrier)['attack.normal_hit_1'];
    expect(sourceOn[2]).toBeCloseTo(sourceOff[2], 5);
    // Live scaling on the receiver (receiver ATK untouched; only the source ATK grows).
    const before = featureValues(receiver)['skill.tartaglia_slash_dmg'];
    carrier.modifyBuffsSettings({'custom_buffs.atk': 1000});
    const after = featureValues(receiver)['skill.tartaglia_slash_dmg'];
    expect(after[2]).toBeGreaterThan(before[2] + 100);
});

test("Durin C2 needs constellation 2 and delivers pyro to the team", () => {
    const {receiver, carrier} = teamWith('Tartaglia', 'Durin', 0);
    carrier.setCharSettings({durin_c2_pyro_bonus: true, durin_c2_dmg_bonus: 'hydro'});
    expect(finalStats(receiver).get('dmg_pyro')).toBe(0);
    expect(finalStats(receiver).get('dmg_hydro')).toBe(0);
    carrier.setCharLevels({level: 90, ascension: 6, constellation: 2});
    expect(finalStats(receiver).get('dmg_pyro')).toBeCloseTo(0.5, 10);
    expect(finalStats(receiver).get('dmg_hydro')).toBeCloseTo(0.5, 10);
});

test("Durin off-field source toggles survive save/load", () => {
    const {team, receiver, carrier} = teamWith('Tartaglia', 'Durin', 6);
    carrier.setCharSettings({
        durin_darkness_mode: true,
        durin_c1_cycle_party: true,
        durin_res_shred: 'pyro',
        durin_c2_pyro_bonus: true,
    });
    const before = finalStats(receiver).get('dmg_pyro');
    // Receiver stays on-field; source is off-field. Saved source controls must persist.
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(0)).get('dmg_pyro')).toBeCloseTo(before, 10);
});

test("Prune Tolling Rally scales live on ATK above 2000", () => {
    const {receiver, carrier} = teamWith('Tartaglia', 'Prune', 6);
    carrier.setCharSettings({prune_tolling_synchronicity: true});
    // Carrier ATK is ~2000 by default (excess 0); raise it and expect damage growth.
    const before = featureValues(receiver)['skill.tartaglia_slash_dmg'];
    carrier.modifyBuffsSettings({'custom_buffs.atk': 2000});
    const after = featureValues(receiver)['skill.tartaglia_slash_dmg'];
    expect(after[2]).toBeGreaterThan(before[2] + 100);
});

test("Prune C6 350 ATK needs the active receiver and Tolling Rally", () => {
    const {team, receiver, carrier} = teamWith('Tartaglia', 'Prune', 6);
    const base = finalStats(receiver).get('atk');
    carrier.setCharSettings({
        prune_tolling_synchronicity: true,
        prune_and_thats_the_story_share_it_with_your_friends: true,
    });
    // Receiver is on-field initially, so the active-gated C6 applies.
    expect(finalStats(receiver).get('atk') - base).toBeCloseTo(350, 5);
    // Without Tolling Rally the C6 delivery stops.
    carrier.setCharSettings({
        prune_tolling_synchronicity: false,
        prune_and_thats_the_story_share_it_with_your_friends: true,
    });
    expect(finalStats(receiver).get('atk')).toBe(base);
    carrier.setCharSettings({
        prune_tolling_synchronicity: true,
        prune_and_thats_the_story_share_it_with_your_friends: true,
    });
    expect(finalStats(receiver).get('atk') - base).toBeCloseTo(350, 5);
    // Move the receiver off-field: the active-only C6 stops applying.
    team.setOnFieldMember(carrier);
    expect(finalStats(receiver).get('atk')).toBe(base);
});

test("Prune Swirl 30% needs a Hexerei receiver", () => {
    const {receiver, carrier} = teamWith('Tartaglia', 'Prune', 6);
    const base = finalStats(receiver).get('atk_percent');
    carrier.setCharSettings({
        prune_tolling_synchronicity: true,
        prune_witch_homework: true,
        prune_witchseekers_vow_swirl: true,
    });
    // Tartaglia is not Hexerei: no Swirl ATK even with the source toggles on.
    expect(finalStats(receiver).get('atk_percent')).toBe(base);
});

test("Lohen Flippant gives ATK to Lohen and the chosen member while C2 EM excludes Lohen", () => {
    const {receiver, carrier} = teamWith('Tartaglia', 'Lohen', 2);
    const receiverBase = finalStats(receiver).get('atk_percent');
    const sourceBase = finalStats(carrier).get('atk_percent');
    carrier.setCharSettings({
        lohen_flippant_masterpiece: true,
        lohen_flippant_masterpiece_receiver: String(receiver.char.getId()),
        lohen_in_flight_i_strike_whatever_flies: true,
    });
    expect(finalStats(receiver).get('atk_percent') - receiverBase).toBeCloseTo(0.15, 10);
    expect(finalStats(carrier).get('atk_percent') - sourceBase).toBeCloseTo(0.15, 10);
    expect(finalStats(receiver).get('mastery')).toBeCloseTo(200, 5);
    expect(finalStats(carrier).get('mastery')).toBe(0);
});

test("Varka C4 delivers Anemo and the chosen element to the team", () => {
    const {receiver, carrier} = teamWith('Tartaglia', 'Varka', 4);
    carrier.setCharSettings({varka_freedom_of_song_element: 'cryo'});
    expect(finalStats(receiver).get('dmg_anemo')).toBeCloseTo(0.2, 10);
    expect(finalStats(receiver).get('dmg_cryo')).toBeCloseTo(0.2, 10);
    expect(finalStats(carrier).get('dmg_anemo')).toBeCloseTo(0.2, 10);
});

test("Odette Snow Swan scales live on burst talent and C6 elevates the team", () => {
    const {receiver, carrier} = teamWith('Tartaglia', 'Odette', 6);
    carrier.setCharSkills({attack: 10, elemental: 10, burst: 1});
    carrier.setCharSettings({
        odette_snow_swans_dream: true,
        odette_all_party_marvelous_splendor: true,
    });
    const at1 = finalStats(receiver).get('dmg_stellarglimmer');
    const special = finalStats(receiver).get('dmg_stellarglimmer_special');
    expect(special).toBeCloseTo(0.25, 10);
    carrier.setCharSkills({attack: 10, elemental: 10, burst: 13});
    const at13 = finalStats(receiver).get('dmg_stellarglimmer');
    expect(at13).toBeGreaterThan(at1 + 0.05);
});

test("Sandrone lightBase scales live on ATK and C1 shares stellar DMG", () => {
    const {receiver, carrier} = teamWith('Tartaglia', 'Sandrone', 1);
    carrier.setCharSettings({sandrone_morrow_after_the_golden_dusk: true});
    expect(finalStats(receiver).get('dmg_stellarglimmer')).toBeCloseTo(0.3, 10);
    const before = finalStats(receiver).get('stellarglimmer_multi');
    carrier.modifyBuffsSettings({'custom_buffs.atk': 1000});
    const after = finalStats(receiver).get('stellarglimmer_multi');
    expect(after).toBeGreaterThan(before + 0.01);
});

test("Vesna jubilee scales live on ATK and unlocks Stellar Swirl", () => {
    const {receiver, carrier} = teamWith('Ayaka', 'Vesna', 0);
    const before = finalStats(receiver).get('stellarswirl_multi');
    carrier.modifyBuffsSettings({'custom_buffs.atk': 1000});
    const after = finalStats(receiver).get('stellarswirl_multi');
    expect(after).toBeGreaterThan(before + 0.01);
    // Unlock: Cryo receiver gains Stellar Swirl reaction features via the shared setting.
    const features = Object.keys(receiver.getFeatures(receiver.getBuildData()));
    expect(features.some((name) => name.includes('stellarswirl'))).toBe(true);
});

test("Traveler Cryo C6 excludes self while C2 goes to the on-field member", () => {
    const {team, receiver, carrier} = teamWith('Tartaglia', 'TravelerCryo', 6);
    const receiverBase = finalStats(receiver).get('mastery');
    const sourceBase = finalStats(carrier).get('mastery');
    carrier.setCharSettings({
        traveler_cryo_frostfall_reverberation: 2,
        traveler_cryo_brumal_grimfrost: 8,
    });
    expect(finalStats(receiver).get('mastery') - receiverBase).toBeCloseTo(120, 5);
    expect(finalStats(receiver).get('dmg_stellarglimmer')).toBeCloseTo(0.4, 10);
    expect(finalStats(carrier).get('dmg_stellarglimmer')).toBe(0);
    expect(finalStats(carrier).get('mastery')).toBeCloseTo(sourceBase, 5);

    team.setOnFieldMember(carrier);
    expect(finalStats(receiver).get('mastery')).toBeCloseTo(receiverBase, 5);
    expect(finalStats(carrier).get('mastery') - sourceBase).toBeCloseTo(120, 5);
});

test("Traveler Cryo glimmer base scales live on ATK", () => {
    const {receiver, carrier} = teamWith('Tartaglia', 'TravelerCryo', 6);
    const before = finalStats(receiver).get('stellarglimmer_multi');
    carrier.modifyBuffsSettings({'custom_buffs.atk': 1000});
    const after = finalStats(receiver).get('stellarglimmer_multi');
    expect(after).toBeGreaterThan(before + 0.005);
});
