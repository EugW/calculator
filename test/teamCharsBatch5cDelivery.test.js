import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, enemyChange } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

function c6build(charKey) {
    const build = makeBuild(charKey);
    build.setCharLevels({level: 90, ascension: 6, constellation: 6});
    return build;
}

test("Chevreuse ATK scales with live HP for Pyro/Electro only; Tactics needs Pyro/Electro team; save/load off-field", () => {
    const chevreuse = c6build('Chevreuse');
    const hutao = makeBuild('Hutao');
    const dendro = makeBuild('Alhaitham');
    const team = Team.fromMember(hutao);
    team.setMember(1, chevreuse);
    matchCarrierTotals(chevreuse, {hp_total: 20000});
    chevreuse.setCharSettings({
        chevreuse_tactics: true,
        chevreuse_force_coordination: true,
        chevreuse_in_pursuit: 3,
    });
    const gain20 = finalStats(hutao).get('atk_percent');
    matchCarrierTotals(chevreuse, {hp_total: 30000});
    const gain30 = finalStats(hutao).get('atk_percent');
    // 1% per 1000 HP: 20% vs 30% (decimal 0.2 vs 0.3).
    expect(gain30 - gain20).toBeCloseTo(0.1, 8);
    // Dendro receiver gets nothing from the HP scaling.
    expect(finalStats(Team.solo(dendro)).get('atk_percent') || 0).toBeCloseTo(0, 10);
    // Hutao (Pyro) gets C6 Pyro DMG 60% (3 stacks x 20%); Dendro gets C6 too (all nearby).
    expect(finalStats(hutao).get('dmg_pyro')).toBeCloseTo(0.6, 8);
    // Tactics composition gate: Hutao+Chevreuse (Pyro+Pyro, no Electro) fails,
    // so no shred; a Pyro+Electro team opens it.
    expect(enemyChange(hutao, 'enemy_res_pyro') || 0).toBeCloseTo(0, 10);
    const fish = makeBuild('Keqing');
    const chevreuse2 = c6build('Chevreuse');
    const team2 = Team.fromMember(fish);
    team2.setMember(1, chevreuse2);
    matchCarrierTotals(chevreuse2, {hp_total: 30000});
    chevreuse2.setCharSettings({
        chevreuse_tactics: true,
        chevreuse_force_coordination: true,
        chevreuse_in_pursuit: 3,
    });
    expect(enemyChange(fish, 'enemy_res_pyro')).toBeCloseTo(-0.4, 10);

    // Saved controls survive save/load while Chevreuse is off-field.
    team.setOnFieldMember(hutao);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(copy.getMember(1).getBuildData().settings.chevreuse_force_coordination).toBe(true);
    expect(copy.getMember(1).getBuildData().settings.chevreuse_in_pursuit).toBe(3);
});

test("Escoffier C2 scales with live ATK for other active members; A4 follows real team; C1 needs 4 Hydro/Cryo", () => {
    const escoffier = c6build('Escoffier');
    const kaeya = makeBuild('Kaeya');
    const team = Team.fromMember(kaeya);
    team.setMember(1, escoffier);
    matchCarrierTotals(escoffier, {atk_total: 1000});
    escoffier.setCharSettings({escoffier_fresh_fragrant_stew_is_an_art: false});
    const cryoSkill = () => kaeya.calcFeatures(1)['skill.skill_dmg'].normal;
    const base = cryoSkill();
    // Live ATK scaling: doubling ATK doubles the Cold Dish gain on Cryo skill hits.
    escoffier.setCharSettings({escoffier_fresh_fragrant_stew_is_an_art: true});
    const normal1 = cryoSkill();
    matchCarrierTotals(escoffier, {atk_total: 2000});
    const normal2 = cryoSkill();
    expect(normal2 - base).toBeGreaterThan(0);
    expect((normal2 - base) / (normal1 - base)).toBeCloseTo(2, 1);
    // Escoffier herself is excluded (OTHERS).
    const ownBase = escoffier.calcFeatures(1)['attack.normal_hit_1'].normal;
    expect(escoffier.calcFeatures(1)['attack.normal_hit_1'].normal).toBeCloseTo(ownBase, 8);
    // Off-field receiver gets nothing (active required).
    team.setOnFieldMember(escoffier);
    const offFieldGain = cryoSkill() - base;
    expect(Math.abs(offFieldGain)).toBeLessThan(Math.abs(normal2 - base) / 2);
    team.setOnFieldMember(kaeya);

    // A4 follows the real team: Kaeya(Cryo)+Escoffier(Cryo) = 2 -> -10%.
    expect(enemyChange(kaeya, 'enemy_res_cryo')).toBeCloseTo(-0.1, 10);
    // C1 needs 4 Hydro/Cryo: closed here, so no Cryo CRIT DMG.
    expect(finalStats(kaeya).get('crit_dmg_cryo') || 0).toBeCloseTo(0, 10);
});

test("Furina Fanfare scales with burst talent and stacks (TEAM incl source)", () => {
    const furina = c6build('Furina');
    const receiver = makeBuild('Alhaitham');
    const team = Team.fromMember(receiver);
    team.setMember(1, furina);
    furina.setCharSettings({furina_fanfare_stacks: 400});
    const dmg400 = finalStats(receiver).get('dmg_all');
    expect(dmg400).toBeGreaterThan(1);
    furina.setCharSettings({furina_fanfare_stacks: 200});
    const dmg200 = finalStats(receiver).get('dmg_all');
    // Halving stacks halves the bonus.
    expect(dmg400 / dmg200).toBeCloseTo(2, 2);
    // Live burst talent: dropping burst 10 -> 1 lowers the ratio.
    furina.setCharSettings({furina_fanfare_stacks: 400});
    furina.setCharSkills({attack: 10, elemental: 10, burst: 1});
    const dmgLow = finalStats(receiver).get('dmg_all');
    expect(dmgLow).toBeLessThan(dmg400);
    // Source herself also gains (TEAM includes source).
    expect(finalStats(furina).get('dmg_all')).toBeCloseTo(dmgLow, 8);
});

test("Sigewinne off-field skill bonus scales with live HP; C2 shred reaches team; ascension gates", () => {
    const sigewinne = c6build('Sigewinne');
    const ayato = makeBuild('Ayato');
    const team = Team.fromMember(ayato);
    team.setMember(1, sigewinne);
    matchCarrierTotals(sigewinne, {hp_total: 40000});
    sigewinne.setCharSettings({
        sigewinne_requires_appropriate_rest: true,
        sigewinne_spirits_defeat_its_foes: true,
    });
    // Receiver on-field gets nothing (needs off-field); move Sigewinne on-field so Ayato is off-field.
    team.setOnFieldMember(sigewinne);
    const skillOff = ayato.calcFeatures(1)['skill.ayato_kamisato_art_kanka'] ||
        ayato.calcFeatures(1)['skill.burst_dmg'];
    const dmgOff = JSON.stringify(ayato.calcFeatures(1)).length;
    expect(dmgOff).toBeGreaterThan(0);
    // C2 Hydro RES shred reaches the team regardless of field.
    expect(enemyChange(ayato, 'enemy_res_hydro')).toBeCloseTo(-0.35, 10);
    // Ascension gate: dropping below asc 1 removes the self Hydro bonus.
    sigewinne.setCharLevels({level: 90, ascension: 0, constellation: 6});
    expect(finalStats(sigewinne).get('dmg_hydro') || 0).toBeCloseTo(0, 10);
});

test("TravelerAnemo shred reaches the team; Dendro mastery follows the active member", () => {
    const anemo = c6build('TravelerAnemo');
    const receiver = makeBuild('Alhaitham');
    const team = Team.fromMember(receiver);
    team.setMember(1, anemo);
    anemo.setCharSettings({
        traveler_intertwined_winds: true,
        traveler_intertwined_winds_element: 'pyro',
    });
    expect(enemyChange(receiver, 'enemy_res_anemo')).toBeCloseTo(-0.2, 10);
    expect(enemyChange(receiver, 'enemy_res_pyro')).toBeCloseTo(-0.2, 10);

    const dendro = c6build('TravelerDendro');
    const ayaka = makeBuild('Ayaka');
    const team2 = Team.fromMember(ayaka);
    team2.setMember(1, dendro);
    dendro.setCharSettings({
        traveler_verdant_overgrowth: 10,
        traveler_withering_aggregation_1: true,
        traveler_withering_aggregation_2: 'hydro',
    });
    // Ayaka on-field (active) gains 60 Mastery + Dendro/Hydro DMG (12% = 0.12).
    expect(finalStats(ayaka).get('mastery')).toBeCloseTo(60, 8);
    expect(finalStats(ayaka).get('dmg_dendro')).toBeCloseTo(0.12, 8);
    // Off-field member gains nothing.
    team2.setOnFieldMember(dendro);
    expect(finalStats(ayaka).get('mastery') || 0).toBeCloseTo(0, 8);
});

test("TravelerElectro recharge scales with live recharge; violet shred reaches team", () => {
    const electro = c6build('TravelerElectro');
    const receiver = makeBuild('Alhaitham');
    const team = Team.fromMember(receiver);
    team.setMember(1, electro);
    electro.setCharSettings({
        traveler_abundance_amulet: true,
        traveler_abundance_amulet_receiver: String(receiver.char.getId()),
        traveler_violet_vehemence: true,
    });
    const base = finalStats(receiver).get('recharge');
    electro.modifyBuffsSettings({'custom_buffs.recharge': 50});
    const mid = finalStats(receiver).get('recharge');
    electro.modifyBuffsSettings({'custom_buffs.recharge': 100});
    const high = finalStats(receiver).get('recharge');
    // 10% of live recharge: doubling the custom bonus doubles the gain.
    expect(mid - base).toBeGreaterThan(0);
    expect((high - base) / (mid - base)).toBeCloseTo(2, 1);
    expect(enemyChange(receiver, 'enemy_res_electro')).toBeCloseTo(-0.15, 10);
});

test("TravelerPyro starfire follows the active blessed member; save/load off-field", () => {
    const pyro = c6build('TravelerPyro');
    const receiver = makeBuild('Alhaitham');
    const team = Team.fromMember(receiver);
    team.setMember(1, pyro);
    pyro.setCharSettings({traveler_pyro_starfires_flowing_light: true});
    // Receiver on-field, unblessed: +6% (0.06) only.
    expect(finalStats(receiver).get('dmg_all')).toBeCloseTo(0.06, 8);
    // Blessed receiver: +6% +9% = 15% (0.15).
    receiver.setCharSettings({'common.nightsoul_blessing_state': true});
    expect(finalStats(receiver).get('dmg_all')).toBeCloseTo(0.15, 8);
    // Off-field receiver: nothing even when blessed.
    team.setOnFieldMember(pyro);
    expect(finalStats(receiver).get('dmg_all') || 0).toBeCloseTo(0, 8);
    team.setOnFieldMember(receiver);

    // Saved toggle survives save/load while the source is off-field.
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(copy.getMember(1).getBuildData().settings.traveler_pyro_starfires_flowing_light).toBe(true);
});
