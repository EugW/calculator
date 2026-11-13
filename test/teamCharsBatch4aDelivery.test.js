import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { charTalentTables } from "../src/js/db/generated/CharTalentTables";
import { featureValues, finalStats, makeBuild, totalMastery, enemyChange } from "./support/team";

global.DB = DB;

function teamWith(sourceKey, receiverKey = 'Keqing', constellation = 6) {
    const receiver = makeBuild(receiverKey);
    const source = makeBuild(sourceKey);
    source.setCharLevels({level: 90, ascension: 6, constellation});
    const team = Team.fromMember(receiver);
    team.setMember(1, source);
    return {team, receiver, source};
}

test("Aino's C1 Mastery survives save/load from an off-field source", () => {
    const {team, receiver, source} = teamWith('Aino');
    source.setCharSettings({aino_the_theory_of_ashfield_equilibrium: true});
    expect(finalStats(receiver).get('mastery')).toBeCloseTo(80, 10);

    // Aino is off-field (receiver was selected first); her toggle must stay
    // saved and keep delivering after a round trip.
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(0)).get('mastery')).toBeCloseTo(80, 10);
    expect(finalStats(copy.getMember(1)).get('mastery')).toBeCloseTo(80, 10);
});

test("Aino's C6 reaction bonus follows the live Moonsign tier", () => {
    const {team, receiver, source} = teamWith('Aino');
    source.setCharSettings({aino_the_burden_of_creative_genius: true});
    // Nascent Gleam (only Aino is Nod-Krai): +15%.
    expect(finalStats(receiver).get('dmg_reaction_lunarbloom')).toBeCloseTo(0.15, 10);

    const flins = makeBuild('Flins');
    team.setMember(2, flins);
    // Ascendant Gleam (two Nod-Krai members): +35%.
    expect(finalStats(receiver).get('dmg_reaction_lunarbloom')).toBeCloseTo(0.35, 10);
});

test("Flins's C6 delivery survives save/load from an off-field source", () => {
    const {team, receiver, source} = teamWith('Flins');
    const before = finalStats(receiver).get('lunarcharged_multi');
    expect(before).toBeGreaterThan(0);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(0)).get('lunarcharged_multi')).toBeCloseTo(before, 10);
});

test("Ineffa's Panoramic Permutation only reaches the active member", () => {
    const {team, receiver, source} = teamWith('Ineffa');
    source.setCharSettings({ineffa_panoramic_permutation_protocol: true});
    const sourceAtk = finalStats(source).getTotalPercent('atk');
    // 6% of Ineffa's live ATK for the on-field receiver...
    expect(finalStats(receiver).get('mastery')).toBeCloseTo(sourceAtk * 0.06, 8);
    // ...and for Ineffa herself, but nobody off-field.
    expect(finalStats(source).get('mastery')).toBeCloseTo(sourceAtk * 0.06, 8);
    team.setOnFieldMember(source);
    expect(finalStats(receiver).get('mastery')).toBe(0);
    expect(finalStats(source).get('mastery')).toBeCloseTo(sourceAtk * 0.06, 8);
});

test("Ineffa's Rectifying Processor scales on her live ATK", () => {
    const {receiver, source} = teamWith('Ineffa', 'Keqing', 1);
    source.setCharSettings({ineffa_rectifying_processor: true});
    const before = finalStats(receiver).get('dmg_reaction_lunarcharged');
    source.modifyBuffsSettings({'custom_buffs.atk': 500});
    const after = finalStats(receiver).get('dmg_reaction_lunarcharged');
    // 2.5% per 100 ATK: +500 ATK raises the bonus by 12.5 points.
    expect(after - before).toBeCloseTo(0.125, 8);
});

test("Ineffa's delivery needs her ascension 4", () => {
    const {receiver, source} = teamWith('Ineffa');
    source.setCharLevels({level: 70, ascension: 3, constellation: 6});
    source.setCharSettings({ineffa_panoramic_permutation_protocol: true});
    expect(finalStats(receiver).get('mastery')).toBe(0);
});

test("Jahoda's Sweet Berry Bounty only reaches the active member", () => {
    const {team, receiver, source} = teamWith('Jahoda');
    source.setCharSettings({jahoda_a1_em_bonus: true});
    expect(finalStats(receiver).get('mastery')).toBeCloseTo(100, 10);
    expect(finalStats(source).get('mastery')).toBeCloseTo(100, 10);
    team.setOnFieldMember(source);
    expect(finalStats(receiver).get('mastery')).toBe(0);
    expect(finalStats(source).get('mastery')).toBeCloseTo(100, 10);
});

test("Jahoda's C6 only reaches Moonsign receivers, at Ascendant Gleam", () => {
    const aino = makeBuild('Aino');
    const jahoda = makeBuild('Jahoda');
    jahoda.setCharLevels({level: 90, ascension: 6, constellation: 6});
    jahoda.setCharSettings({jahoda_c6_crit_bonus: true});
    const keqing = makeBuild('Keqing');
    const team = Team.fromMember(aino);
    team.setMember(1, jahoda);
    team.setMember(2, keqing);
    // Two Nod-Krai members: Ascendant Gleam. Aino (Moonsign) gets the CRIT,
    // Keqing (not Moonsign) gets nothing.
    expect(finalStats(aino).get('crit_rate')).toBeCloseTo(0.05, 10);
    expect(finalStats(aino).get('crit_dmg')).toBeCloseTo(0.4, 10);
    expect(finalStats(keqing).get('crit_rate')).toBe(0);
    expect(finalStats(keqing).get('crit_dmg')).toBe(0);
});

test("Nefer's Lunar-Bloom base bonus scales on her live Mastery", () => {
    const {receiver, source} = teamWith('Nefer', 'Keqing', 0);
    const before = finalStats(receiver).get('lunarbloom_multi');
    source.modifyBuffsSettings({'custom_buffs.mastery': 100});
    const after = finalStats(receiver).get('lunarbloom_multi');
    // 0.0175% per EM: +100 EM raises the bonus by 1.75 points of multi.
    expect(after - before).toBeCloseTo(0.0175, 8);
});

test("Nefer's C6 elevation stays on Nefer herself", () => {
    const {receiver, source} = teamWith('Nefer');
    source.setCharSettings({nefer_victory_flows_from_the_turning_of_tides: true});
    expect(finalStats(source).get('dmg_lunarbloom_special')).toBeCloseTo(0.15, 10);
    expect(finalStats(receiver).get('dmg_lunarbloom_special')).toBe(0);
});

test("Zibai's Lunar-Crystallize base bonus scales on her live DEF", () => {
    const {receiver, source} = teamWith('Zibai', 'Keqing', 2);
    const before = finalStats(receiver).get('lunarcrystallize_multi');
    source.modifyBuffsSettings({'custom_buffs.def': 500});
    const after = finalStats(receiver).get('lunarcrystallize_multi');
    // 0.7% per 100 DEF: +500 DEF raises the bonus by 3.5 points of multi.
    expect(after - before).toBeCloseTo(0.035, 8);
});

test("Zibai's C2 reaction bonus can be switched off", () => {
    const {receiver, source} = teamWith('Zibai', 'Keqing', 2);
    expect(finalStats(receiver).get('dmg_reaction_lunarcrystallize')).toBe(0);
    source.setCharSettings({zibai_c2_party_lunar_crystallize: true});
    expect(finalStats(receiver).get('dmg_reaction_lunarcrystallize')).toBeCloseTo(0.3, 10);
});

test("Zibai's C2 delivery survives save/load from an off-field source", () => {
    const {team, receiver, source} = teamWith('Zibai', 'Keqing', 2);
    source.setCharSettings({zibai_c2_party_lunar_crystallize: true});
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(0)).get('dmg_reaction_lunarcrystallize')).toBeCloseTo(0.3, 10);
});

test("Lauma's A1 CRIT follows the live Moonsign tier", () => {
    const {team, receiver, source} = teamWith('Lauma');
    source.setCharSettings({lauma_light_for_the_frosty_night: true});
    // Nascent Gleam: Bloom-family CRIT only.
    expect(finalStats(receiver).get('crit_rate_bloom')).toBeCloseTo(0.15, 10);
    expect(finalStats(receiver).get('crit_rate_lunarbloom')).toBe(0);

    const aino = makeBuild('Aino');
    team.setMember(2, aino);
    // Ascendant Gleam: Lunar-Bloom CRIT instead.
    expect(finalStats(receiver).get('crit_rate_bloom')).toBe(0);
    expect(finalStats(receiver).get('crit_rate_lunarbloom')).toBeCloseTo(0.1, 10);
    expect(finalStats(receiver).get('crit_dmg_lunarbloom')).toBeCloseTo(0.2, 10);
});

test("Lauma's RES shred reads her live skill level with her C5 bonus", () => {
    const {receiver, source} = teamWith('Lauma', 'Keqing', 5);
    source.setCharSettings({lauma_res_shred: true});
    // Skill 10 + C5 bonus 3 = level 13.
    expect(enemyChange(receiver, 'enemy_res_dendro'))
        .toBeCloseTo(-charTalentTables.Lauma.s2.p8[12] / 100, 10);
    source.setCharSkills({attack: 10, elemental: 9, burst: 10});
    // Skill 9 + C5 bonus 3 = level 12: the shred follows the talent.
    expect(enemyChange(receiver, 'enemy_res_dendro'))
        .toBeCloseTo(-charTalentTables.Lauma.s2.p8[11] / 100, 10);
});

test("Lauma's Pale Hymn grows with her live Mastery", () => {
    const nefer = makeBuild('Nefer');
    const lauma = makeBuild('Lauma');
    lauma.setCharLevels({level: 90, ascension: 6, constellation: 0});
    const team = Team.fromMember(nefer);
    team.setMember(1, lauma);
    lauma.setCharSettings({lauma_pale_hymn: true});
    const key = 'skill.nefer_phantasm_shade_hit_1';
    const base = featureValues(nefer)[key][2];
    lauma.modifyBuffsSettings({'custom_buffs.mastery': 100});
    const raised = featureValues(nefer)[key][2];
    expect(raised).toBeGreaterThan(base);
    lauma.modifyBuffsSettings({'custom_buffs.mastery': 200});
    const raisedTwice = featureValues(nefer)[key][2];
    // EM scaling is linear: doubling the added Mastery doubles the gain.
    expect(raisedTwice - base).toBeCloseTo(2 * (raised - base), 8);
});

test("Lauma's toggles survive save/load from an off-field source", () => {
    const {team, receiver, source} = teamWith('Lauma');
    source.setCharSettings({
        lauma_light_for_the_frosty_night: true,
        lauma_pale_hymn: true,
    });
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(0)).get('crit_rate_bloom')).toBeCloseTo(0.15, 10);
    expect(finalStats(copy.getMember(1)).get('crit_rate_bloom')).toBeCloseTo(0.15, 10);
});
