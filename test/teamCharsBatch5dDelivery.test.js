import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, makeSolo, featureValues, totalMastery, enemyChange } from "./support/team";

global.DB = DB;

function teamWith(receiverKey, carrierKey, constellation = 6) {
    const receiver = makeBuild(receiverKey);
    const carrier = makeBuild(carrierKey);
    carrier.setCharLevels({level: 90, ascension: 6, constellation});
    const team = Team.fromMember(receiver);
    team.setMember(1, carrier);
    return {team, receiver, carrier};
}

test("Alyosha Precision reaches the on-field teammate and scales live on talent", () => {
    const {team, receiver, carrier} = teamWith('Tartaglia', 'Alyosha', 6);
    carrier.setCharSettings({alyosha_hunters_precision: 0});
    const base = finalStats(receiver).get('atk_percent');
    const carrierBase = finalStats(carrier).get('atk_percent');
    carrier.setCharSettings({alyosha_hunters_precision: 1});
    const on = finalStats(receiver).get('atk_percent') - base;
    expect(on).toBeGreaterThan(0);
    // Alyosha has the same field restriction as his teammates.
    expect(finalStats(carrier).get('atk_percent')).toBeCloseTo(carrierBase, 10);
    // Live skill scaling: the source talent level drives the delivery.
    carrier.setCharSkills({attack: 10, elemental: 1, burst: 10});
    const at1 = finalStats(receiver).get('atk_percent') - base;
    expect(at1).toBeGreaterThan(0);
    expect(at1).toBeLessThan(on);
    carrier.setCharSkills({attack: 10, elemental: 10, burst: 10});
    expect(finalStats(receiver).get('atk_percent') - base).toBeCloseTo(on, 10);
    // Switching on-field members transfers the bonus to Alyosha.
    team.setOnFieldMember(carrier);
    expect(finalStats(receiver).get('atk_percent')).toBeCloseTo(base, 10);
    expect(finalStats(carrier).get('atk_percent') - carrierBase).toBeCloseTo(on, 10);
});

test("Alyosha C6 second stack adds 100 mastery on the field", () => {
    const {team, receiver, carrier} = teamWith('Tartaglia', 'Alyosha', 6);
    carrier.setCharSettings({alyosha_hunters_precision: 2});
    expect(finalStats(receiver).get('mastery') -
        finalStats(makeSolo('Tartaglia')).get('mastery')).toBeCloseTo(100, 5);
    carrier.setCharSettings({alyosha_hunters_precision: 1});
    expect(finalStats(receiver).get('mastery') -
        finalStats(makeSolo('Tartaglia')).get('mastery')).toBeCloseTo(0, 5);
    carrier.setCharSettings({alyosha_hunters_precision: 2});
    team.setOnFieldMember(carrier);
    expect(finalStats(receiver).get('mastery') -
        finalStats(makeSolo('Tartaglia')).get('mastery')).toBeCloseTo(0, 5);
    expect(finalStats(carrier).get('mastery') -
        finalStats(makeSolo('Alyosha')).get('mastery')).toBeCloseTo(100, 5);
});

test("Alyosha Stellar-Conduct needs Precision, Radiance and Polestar on the field", () => {
    const {team, receiver, carrier} = teamWith('Tartaglia', 'Alyosha', 6);
    carrier.setCharSettings({
        alyosha_hunters_precision: 1,
        alyosha_radiance_stellarconduct: true,
    });
    // No Polestar Field: no Stellar-Conduct bonus, and no unlock delivered.
    expect(finalStats(receiver).get('dmg_stellarconduct')).toBe(0);
    expect(receiver.getBuildData().settings['allowed_stellarconduct']).toBeUndefined();
    team.modifySettings({polestar_field: true});
    expect(finalStats(receiver).get('dmg_stellarconduct')).toBeCloseTo(0.2, 10);
    expect(finalStats(carrier).get('dmg_stellarconduct')).toBe(0);
    expect(receiver.getBuildData().settings['allowed_stellarconduct']).toBe(1);
    // Off-field receivers lose the on-field Stellar-Conduct share.
    team.setOnFieldMember(carrier);
    expect(finalStats(receiver).get('dmg_stellarconduct')).toBe(0);
    expect(finalStats(carrier).get('dmg_stellarconduct')).toBeCloseTo(0.2, 10);
});

test("Alyosha off-field source toggles survive save/load", () => {
    const {team, receiver, carrier} = teamWith('Tartaglia', 'Alyosha', 6);
    carrier.setCharSettings({
        alyosha_hunters_precision: 1,
        alyosha_radiance_stellarconduct: true,
    });
    const before = finalStats(receiver).get('atk_percent');
    expect(before).toBeGreaterThan(0);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(0)).get('atk_percent')).toBeCloseTo(before, 10);
    expect(copy.getMember(1).getSettings()['alyosha_hunters_precision']).toBe(1);
});

test("Mizuki Dreamdrifter shares scale live on her mastery", () => {
    const {receiver, carrier} = teamWith('Tartaglia', 'Mizuki', 6);
    carrier.setCharSettings({
        mizuki_dreamdrifter: false,
        mizuki_in_mist_like_waters: true,
    });
    const masteryBase = finalStats(receiver).get('mastery');
    const pyroBase = finalStats(receiver).get('dmg_pyro');
    carrier.setCharSettings({
        mizuki_dreamdrifter: true,
        mizuki_in_mist_like_waters: true,
    });
    expect(finalStats(receiver).get('mastery')).toBeGreaterThan(masteryBase);
    expect(finalStats(receiver).get('dmg_pyro')).toBeGreaterThan(pyroBase);
    const masteryOn = finalStats(receiver).get('mastery');
    const pyroOn = finalStats(receiver).get('dmg_pyro');
    // Raising the source EM grows every EM-scaled share. Deliveries read
    // her stage-0 total, so +500 custom means +50 Vast and +0.20 element.
    carrier.modifyBuffsSettings({'custom_buffs.mastery': 500});
    expect(finalStats(receiver).get('mastery') - masteryOn).toBeCloseTo(50, 8);
    expect(finalStats(receiver).get('dmg_pyro') - pyroOn).toBeCloseTo(0.2, 8);
    // Without Dreamdrifter nothing is shared.
    carrier.setCharSettings({
        mizuki_dreamdrifter: false,
        mizuki_in_mist_like_waters: true,
    });
    expect(finalStats(receiver).get('mastery')).toBe(masteryBase);
    expect(finalStats(receiver).get('dmg_pyro')).toBe(pyroBase);
});

test("Mizuki C2 needs constellation 2 and C6 crit needs constellation 6", () => {
    const {receiver, carrier} = teamWith('Tartaglia', 'Mizuki', 0);
    carrier.setCharSettings({mizuki_dreamdrifter: true});
    expect(finalStats(receiver).get('dmg_pyro')).toBe(0);
    expect(enemyChange(receiver, 'enemy_res_pyro')).toBe(0);
    carrier.setCharLevels({level: 90, ascension: 6, constellation: 2});
    expect(finalStats(receiver).get('dmg_pyro')).toBeGreaterThan(0);
    expect(enemyChange(receiver, 'enemy_res_pyro')).toBeCloseTo(-0.2, 10);
    expect(finalStats(receiver).get('crit_rate_swirl')).toBe(0);
    carrier.setCharLevels({level: 90, ascension: 6, constellation: 6});
    expect(finalStats(receiver).get('crit_rate_swirl')).toBeCloseTo(0.3, 10);
    expect(finalStats(receiver).get('crit_dmg_swirl')).toBeCloseTo(1, 10);
    expect(finalStats(receiver).get('crit_rate_stellarswirl')).toBeCloseTo(0.1, 10);
    expect(finalStats(receiver).get('crit_dmg_stellarswirl')).toBeCloseTo(0.2, 10);
});

test("Mizuki off-field source toggles survive save/load", () => {
    const {team, receiver, carrier} = teamWith('Tartaglia', 'Mizuki', 6);
    carrier.setCharSettings({
        mizuki_dreamdrifter: true,
        mizuki_in_mist_like_waters: true,
    });
    const before = finalStats(receiver).get('dmg_pyro');
    expect(before).toBeGreaterThan(0);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(0)).get('dmg_pyro')).toBeCloseTo(before, 10);
    expect(copy.getMember(1).getSettings()['mizuki_dreamdrifter']).toBe(true);
});

test("Vodyanitsa Song and A1 shred reach the team with ascension gates", () => {
    const {receiver, carrier} = teamWith('Barbara', 'Vodyanitsa', 6);
    carrier.setCharSettings({
        vodyanitsa_song_of_ages_past: true,
        vodyanitsa_wandering_vortex: true,
    });
    expect(enemyChange(receiver, 'enemy_res_hydro')).toBeLessThan(0);
    expect(enemyChange(receiver, 'enemy_res_cryo')).toBeLessThan(0);
    expect(enemyChange(receiver, 'enemy_res_anemo')).toBeCloseTo(-0.35, 10);
    // Below A1 the Wandering Vortex shred stops; Song of Ages Past stays.
    carrier.setCharLevels({level: 90, ascension: 0, constellation: 6});
    expect(enemyChange(receiver, 'enemy_res_anemo')).toBe(0);
    expect(enemyChange(receiver, 'enemy_res_hydro')).toBeLessThan(0);
});

test("Vodyanitsa C1 ATK scales live on her HP", () => {
    const {receiver, carrier} = teamWith('Barbara', 'Vodyanitsa', 1);
    carrier.setCharSettings({vodyanitsa_c1_healing: false});
    const baseOff = finalStats(receiver).get('atk');
    carrier.setCharSettings({vodyanitsa_c1_healing: true});
    const before = finalStats(receiver).get('atk');
    expect(before).toBeGreaterThan(baseOff);
    carrier.modifyBuffsSettings({'custom_buffs.hp': 10000});
    expect(finalStats(receiver).get('atk') - before).toBeCloseTo(80, 6);
    // Without the healing trigger the share stops.
    carrier.setCharSettings({vodyanitsa_c1_healing: false});
    expect(finalStats(receiver).get('atk')).toBeCloseTo(baseOff, 6);
});

test("Vodyanitsa C2 reaches the active member, everyone at C6", () => {
    const {team, receiver, carrier} = teamWith('Barbara', 'Vodyanitsa', 2);
    carrier.setCharSettings({
        vodyanitsa_song_of_ages_past: true,
        vodyanitsa_c2_horn_hit: true,
    });
    // No Wandering Vortex: Hydro/Cryo CRIT DMG for the on-field receiver.
    expect(finalStats(receiver).get('crit_dmg_hydro')).toBeCloseTo(0.5, 10);
    expect(finalStats(receiver).get('crit_dmg_cryo')).toBeCloseTo(0.5, 10);
    expect(finalStats(receiver).get('crit_dmg_stellarswirl')).toBe(0);
    team.setOnFieldMember(carrier);
    expect(finalStats(receiver).get('crit_dmg_hydro')).toBe(0);
    // Wandering Vortex switches the share to Stellar Swirl CRIT DMG.
    carrier.setCharSettings({
        vodyanitsa_song_of_ages_past: true,
        vodyanitsa_wandering_vortex: true,
        vodyanitsa_c2_horn_hit: true,
    });
    team.setOnFieldMember(receiver);
    expect(finalStats(receiver).get('crit_dmg_stellarswirl')).toBeCloseTo(0.6, 10);
    expect(finalStats(receiver).get('crit_dmg_hydro')).toBe(0);
    // At C6 the off-field member keeps the share.
    carrier.setCharLevels({level: 90, ascension: 6, constellation: 6});
    team.setOnFieldMember(carrier);
    expect(finalStats(receiver).get('crit_dmg_stellarswirl')).toBeCloseTo(0.6, 10);
});

test("Vodyanitsa C6 elevates the team while Song of Ages Past is active", () => {
    const {receiver, carrier} = teamWith('Barbara', 'Vodyanitsa', 6);
    carrier.setCharSettings({vodyanitsa_song_of_ages_past: true});
    expect(finalStats(receiver).get('dmg_hydro')).toBeCloseTo(0.6, 10);
    expect(finalStats(receiver).get('dmg_cryo')).toBeCloseTo(0.6, 10);
    expect(finalStats(receiver).get('dmg_stellarswirl_special')).toBeCloseTo(0.25, 10);
    carrier.setCharSettings({vodyanitsa_song_of_ages_past: false});
    expect(finalStats(receiver).get('dmg_hydro')).toBe(0);
    expect(finalStats(receiver).get('dmg_stellarswirl_special')).toBe(0);
});

test("Vodyanitsa Lead Vocal feeds the active member, Chorus the others", () => {
    const {team, receiver, carrier} = teamWith('Barbara', 'Vodyanitsa', 6);
    carrier.modifyBuffsSettings({'custom_buffs.hp': 60000});
    const feature = 'attack.normal_hit_1';
    const baseline = featureValues(receiver)[feature][2];
    // Active receiver with Lead Vocal: Hydro flat from Vodyanitsa HP.
    carrier.setCharSettings({vodyanitsa_lead_vocal: 25, vodyanitsa_chorus: 0});
    const leadActive = featureValues(receiver)[feature][2];
    expect(leadActive).toBeGreaterThan(baseline + 100);
    // Active receiver with Chorus only: no share (Chorus is for the others).
    carrier.setCharSettings({vodyanitsa_lead_vocal: 0, vodyanitsa_chorus: 10});
    expect(featureValues(receiver)[feature][2]).toBeCloseTo(baseline, 5);
    // Off-field receiver with Chorus: the same flat share arrives.
    team.setOnFieldMember(carrier);
    const chorusOffField = featureValues(receiver)[feature][2];
    expect(chorusOffField).toBeCloseTo(leadActive, 5);
    // Off-field receiver with Lead Vocal only: no share.
    carrier.setCharSettings({vodyanitsa_lead_vocal: 25, vodyanitsa_chorus: 0});
    expect(featureValues(receiver)[feature][2]).toBeCloseTo(baseline, 5);
});

test("Vodyanitsa off-field source toggles survive save/load", () => {
    const {team, receiver, carrier} = teamWith('Barbara', 'Vodyanitsa', 6);
    carrier.setCharSettings({
        vodyanitsa_song_of_ages_past: true,
        vodyanitsa_c1_healing: true,
        vodyanitsa_chorus: 10,
    });
    const atk = finalStats(receiver).get('atk');
    const res = enemyChange(receiver, 'enemy_res_hydro');
    expect(res).toBeLessThan(0);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(0)).get('atk')).toBeCloseTo(atk, 10);
    expect(enemyChange(copy.getMember(0), 'enemy_res_hydro')).toBeCloseTo(res, 10);
    expect(copy.getMember(1).getSettings()['vodyanitsa_chorus']).toBe(10);
});


test("Mizuki C1 reads her live final mastery including her own Vast share", () => {
    const {receiver, carrier} = teamWith('Wanderer', 'Mizuki', 6);
    carrier.setCharSettings({mizuki_dreamdrifter: true});
    const stageZero = carrier.getBuildData().stats;
    carrier.modifyBuffsSettings({
        'custom_buffs.mastery': 800 - totalMastery(stageZero),
    });
    expect(totalMastery(finalStats(carrier))).toBeCloseTo(880, 8);
    expect(finalStats(receiver).get('mastery')).toBeCloseTo(80, 8);
    expect(finalStats(receiver).get('dmg_pyro')).toBeCloseTo(0.32, 8);

    const feature = 'reaction.swirl_pyro';
    const withoutC1 = featureValues(receiver)[feature][0];
    carrier.setCharSettings({mizuki_dreamdrifter: true, mizuki_in_mist_like_waters: true});
    expect(featureValues(receiver)[feature][0] - withoutC1).toBeCloseTo(11 * 880 * 1.05, 6);

    carrier.modifyBuffsSettings({'custom_buffs.mastery': 1300 - totalMastery(stageZero)});
    const strongerC1 = featureValues(receiver)[feature][0];
    carrier.setCharSettings({mizuki_dreamdrifter: true});
    expect(strongerC1 - featureValues(receiver)[feature][0]).toBeCloseTo(11 * 1430 * 1.05, 6);
});

test("Vodyanitsa herself uses Chorus off-field and Lead Vocal on-field", () => {
    const {team, carrier} = teamWith('Barbara', 'Vodyanitsa', 0);
    carrier.modifyBuffsSettings({'custom_buffs.hp': 60000});
    const feature = 'attack.normal_hit_1';
    const baseline = featureValues(carrier)[feature][0];
    carrier.setCharSettings({vodyanitsa_lead_vocal: 25, vodyanitsa_chorus: 0});
    expect(featureValues(carrier)[feature][0]).toBeCloseTo(baseline, 5);
    carrier.setCharSettings({vodyanitsa_lead_vocal: 0, vodyanitsa_chorus: 10});
    const chorus = featureValues(carrier)[feature][0];
    expect(chorus).toBeGreaterThan(baseline + 100);
    team.setOnFieldMember(carrier);
    expect(featureValues(carrier)[feature][0]).toBeCloseTo(baseline, 5);
    carrier.setCharSettings({vodyanitsa_lead_vocal: 25, vodyanitsa_chorus: 0});
    expect(featureValues(carrier)[feature][0]).toBeCloseTo(chorus, 5);
});
