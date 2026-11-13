import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, enemyChange } from "./support/team";

global.DB = DB;

test("Aloy's Combat Override buffs herself by 16% and others by 8%, gated by A1", () => {
    const aloy = makeBuild('Aloy');
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, aloy);
    const sourceBase = finalStats(aloy).get('atk_percent');
    const receiverBase = finalStats(receiver).get('atk_percent');

    aloy.setCharSettings({aloy_combat_override: true});
    expect(finalStats(aloy).get('atk_percent') - sourceBase).toBeCloseTo(0.16, 10);
    expect(finalStats(receiver).get('atk_percent') - receiverBase).toBeCloseTo(0.08, 10);

    aloy.setCharLevels({level: 20, ascension: 0, constellation: 0});
    expect(finalStats(receiver).get('atk_percent')).toBe(receiverBase);
    expect(finalStats(aloy).get('atk_percent')).toBe(sourceBase);
});

test("Aloy's off-field toggle survives team save/load", () => {
    const receiver = makeBuild('Ayaka');
    const aloy = makeBuild('Aloy');
    const team = Team.fromMember(receiver);
    team.setMember(1, aloy);
    aloy.setCharSettings({aloy_combat_override: true});
    const before = finalStats(receiver).get('atk_percent');

    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(0)).get('atk_percent')).toBeCloseTo(before, 10);
});

test("Ayaka's C4 DEF shred needs constellation 4", () => {
    const ayaka = makeBuild('Ayaka');
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, ayaka);
    ayaka.setCharSettings({ayaka_eikyo_ryuuhan: true});
    expect(enemyChange(receiver, 'enemy_def_reduce')).toBe(0);
    ayaka.setCharLevels({level: 90, ascension: 6, constellation: 4});
    expect(enemyChange(receiver, 'enemy_def_reduce')).toBeCloseTo(0.3, 10);
});

test("Jean's C2 speeds and C4 Anemo shred need their constellations", () => {
    const jean = makeBuild('Jean');
    jean.setCharLevels({level: 90, ascension: 6, constellation: 1});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, jean);
    jean.setCharSettings({jean_peoples_aegis: true, jean_lands_of_dandelion: true});
    expect(finalStats(receiver).get('atk_speed_normal')).toBe(0);
    expect(enemyChange(receiver, 'enemy_res_anemo')).toBe(0);

    jean.setCharLevels({level: 90, ascension: 6, constellation: 2});
    expect(finalStats(receiver).get('atk_speed_normal')).toBeCloseTo(0.15, 10);
    expect(finalStats(receiver).get('move_speed')).toBeCloseTo(0.15, 10);
    expect(enemyChange(receiver, 'enemy_res_anemo')).toBe(0);

    jean.setCharLevels({level: 90, ascension: 6, constellation: 4});
    expect(enemyChange(receiver, 'enemy_res_anemo')).toBeCloseTo(-0.4, 10);
});

test("Hutao's A1 and C4 CRIT buffs exclude herself and are independent", () => {
    const hutao = makeBuild('Hutao');
    hutao.setCharLevels({level: 90, ascension: 6, constellation: 4});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, hutao);
    const sourceBase = finalStats(hutao).get('crit_rate');
    const receiverBase = finalStats(receiver).get('crit_rate');

    hutao.setCharSettings({hu_tao_flutter_by: true});
    expect(finalStats(receiver).get('crit_rate') - receiverBase).toBeCloseTo(0.12, 10);
    expect(finalStats(hutao).get('crit_rate')).toBe(sourceBase);

    hutao.setCharSettings({hu_tao_flutter_by: false, hu_tao_garden_of_eternal_rest: true});
    expect(finalStats(receiver).get('crit_rate') - receiverBase).toBeCloseTo(0.12, 10);

    hutao.setCharSettings({hu_tao_flutter_by: true, hu_tao_garden_of_eternal_rest: true});
    expect(finalStats(receiver).get('crit_rate') - receiverBase).toBeCloseTo(0.24, 10);

    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(0)).get('crit_rate') - receiverBase).toBeCloseTo(0.24, 10);
});

test("Hutao's A1 team buff needs ascension 1", () => {
    const hutao = makeBuild('Hutao');
    hutao.setCharLevels({level: 20, ascension: 0, constellation: 4});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, hutao);
    const receiverBase = finalStats(receiver).get('crit_rate');
    hutao.setCharSettings({hu_tao_flutter_by: true});
    expect(finalStats(receiver).get('crit_rate')).toBe(receiverBase);
});

test("Klee's C6 gives others 10% Pyro while she keeps 50% under Hexerei", () => {
    const klee = makeBuild('Klee');
    klee.setCharLevels({level: 90, ascension: 6, constellation: 6});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, klee);
    const sourceBase = finalStats(klee).get('dmg_pyro');
    const receiverBase = finalStats(receiver).get('dmg_pyro');

    klee.setCharSettings({klee_witch_homework: true, klee_blazing_delight: true});
    expect(finalStats(klee).get('dmg_pyro') - sourceBase).toBeCloseTo(0.5, 10);
    expect(finalStats(receiver).get('dmg_pyro') - receiverBase).toBeCloseTo(0.1, 10);

    klee.setCharLevels({level: 90, ascension: 6, constellation: 5});
    expect(finalStats(receiver).get('dmg_pyro')).toBe(receiverBase);
});

test("Klee's C2 DEF shred reaches the team", () => {
    const klee = makeBuild('Klee');
    klee.setCharLevels({level: 90, ascension: 6, constellation: 2});
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, klee);
    klee.setCharSettings({klee_explosive_frags: true});
    expect(enemyChange(receiver, 'enemy_def_reduce')).toBeCloseTo(0.23, 10);
});

function hexereiTeam(receiverKey, sourceKey) {
    const receiver = makeBuild(receiverKey);
    const source = makeBuild(sourceKey);
    const helper = makeBuild('Klee');
    const team = Team.fromMember(receiver);
    team.setMember(1, source);
    team.setMember(2, helper);
    return {team, receiver, source, helper};
}

test("Fischl's Phantasmal Nocturne reaches only active others under resonance", () => {
    const {team, receiver, source, helper} = hexereiTeam('Ayaka', 'Fischl');
    const receiverBaseAtk = finalStats(receiver).get('atk_percent');
    const receiverBaseMastery = finalStats(receiver).get('mastery');
    const sourceBaseAtk = finalStats(source).get('atk_percent');
    source.setCharSettings({
        fischl_witch_homework: true,
        fischl_overloaded_buff: true,
        fischl_electrocharged_buff: true,
    });
    helper.setCharSettings({klee_witch_homework: true});

    // Resonance is on (Fischl + Klee with homework); the receiver is on-field.
    expect(finalStats(receiver).get('atk_percent') - receiverBaseAtk).toBeCloseTo(0.225, 10);
    expect(finalStats(receiver).get('mastery') - receiverBaseMastery).toBe(90);
    // Fischl herself keeps her own buff while off-field.
    expect(finalStats(source).get('atk_percent') - sourceBaseAtk).toBeCloseTo(0.225, 10);

    team.setOnFieldMember(source);
    expect(finalStats(receiver).get('atk_percent')).toBe(receiverBaseAtk);
    expect(finalStats(receiver).get('mastery')).toBe(receiverBaseMastery);

    team.setOnFieldMember(receiver);
    source.setCharSettings({
        fischl_witch_homework: true,
        fischl_overloaded_buff: true,
        fischl_electrocharged_buff: true,
        fischl_evernight_raven: true,
    });
    source.setCharLevels({level: 90, ascension: 6, constellation: 6});
    expect(finalStats(receiver).get('atk_percent') - receiverBaseAtk).toBeCloseTo(0.45, 10);
    expect(finalStats(receiver).get('mastery') - receiverBaseMastery).toBe(180);
});

test("Mona's Omen scales with her live burst level", () => {
    const mona = makeBuild('Mona');
    mona.setCharLevels({level: 90, ascension: 6, constellation: 5});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, mona);
    mona.setCharSettings({mona_omen: true});
    const lowBurst = finalStats(receiver).get('dmg_all');
    expect(lowBurst).toBeGreaterThan(0);
    mona.setCharSkills({attack: 10, elemental: 10, burst: 1});
    expect(finalStats(receiver).get('dmg_all')).toBeLessThan(lowBurst);
});

test("Mona's C4 assumes its trigger independently, and CRIT DMG needs a Hexerei receiver", () => {
    const mona = makeBuild('Mona');
    mona.setCharLevels({level: 90, ascension: 6, constellation: 5});
    const ayaka = makeBuild('Ayaka');
    const team = Team.fromMember(ayaka);
    team.setMember(1, mona);
    const ayakaBase = finalStats(ayaka).get('crit_rate');
    mona.setCharSettings({mona_witch_homework: true, mona_prophecy_of_oblivion: true});
    // CRIT Rate against the Omen's opponent, not a stat of the member
    // (test/buffChainsMona.test.js).
    expect(finalStats(ayaka).get('crit_rate_enemy')).toBeCloseTo(0.15, 10);
    expect(finalStats(ayaka).get('crit_rate')).toBe(ayakaBase);
    expect(finalStats(mona).get('crit_rate_enemy')).toBeCloseTo(0.15, 10);

    mona.setCharSettings({
        mona_witch_homework: true,
        mona_omen: true,
        mona_prophecy_of_oblivion: true,
    });
    expect(finalStats(ayaka).get('crit_rate_enemy')).toBeCloseTo(0.15, 10);
    // Ayaka is not Hexerei: no CRIT DMG.
    expect(finalStats(ayaka).get('crit_dmg')).toBe(0);

    const klee = makeBuild('Klee');
    team.setMember(0, klee);
    klee.setCharSettings({klee_witch_homework: true});
    expect(finalStats(klee).get('crit_dmg')).toBeCloseTo(0.15, 10);
});

test("Mona's Astral Glow raises others' Vaporize DMG under resonance", () => {
    const {team, receiver, source, helper} = hexereiTeam('Ayaka', 'Mona');
    source.setCharLevels({level: 90, ascension: 6, constellation: 5});
    source.setCharSettings({mona_witch_homework: true, mona_astral_glow: 3});
    helper.setCharSettings({klee_witch_homework: true});
    expect(finalStats(receiver).get('dmg_reaction_vaporize')).toBeCloseTo(0.15, 10);
    source.setCharSettings({mona_witch_homework: true, mona_astral_glow: 1});
    expect(finalStats(receiver).get('dmg_reaction_vaporize')).toBeCloseTo(0.05, 10);
    const fischl = makeBuild('Fischl');
    fischl.setCharSettings({fischl_witch_homework: true});
    team.setMember(3, fischl);
    source.setCharSettings({mona_witch_homework: false, mona_astral_glow: 3});
    expect(finalStats(receiver).get('dmg_reaction_vaporize')).toBe(0);

});

test("Albedo's Solar Isotoma scales with live DEF up to its cap", () => {
    const {receiver, source, helper} = hexereiTeam('Ayaka', 'Albedo');
    source.setCharLevels({level: 90, ascension: 6, constellation: 6});
    source.setCharSettings({albedo_witch_homework: true, albedo_solar_isotoma_buff: true});
    helper.setCharSettings({klee_witch_homework: true});
    const defTotal = finalStats(source).get('def_base') + finalStats(source).get('def');
    const expected = Math.min(0.004 * defTotal, 12) / 100;
    for (const type of ['normal', 'charged', 'plunge', 'skill', 'burst']) {
        expect(finalStats(receiver).get('dmg_' + type)).toBeCloseTo(expected, 8);
    }
    expect(finalStats(receiver).get('dmg_all')).toBe(0);

    source.modifyBuffsSettings({'custom_buffs.def': 100000});
    expect(finalStats(receiver).get('dmg_normal')).toBeCloseTo(0.12, 10);
    source.setCharSettings({albedo_witch_homework: true, albedo_silver_isotoma_buff: true});
    expect(finalStats(receiver).get('dmg_normal')).toBe(0);
    expect(finalStats(helper).get('dmg_normal')).toBeCloseTo(0.3, 10);
    expect(finalStats(source).get('dmg_normal')).toBeCloseTo(0.3, 10);
});

test("Albedo's C2 lasting Mastery includes himself; C4/C6 need an active receiver", () => {
    const albedo = makeBuild('Albedo');
    albedo.setCharLevels({level: 90, ascension: 6, constellation: 6});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, albedo);
    const sourceBaseMastery = finalStats(albedo).get('mastery');
    const receiverBaseMastery = finalStats(receiver).get('mastery');
    albedo.setCharSettings({
        albedo_witch_homework: true,
        albedo_homuncular_nature: true,
        albedo_opening_of_hanerozoic: 0,
        albedo_opening_of_hanerozoic_buff: true,
        albedo_descent_of_divinity: true,
        albedo_descent_of_divinity_3s: true,
        albedo_dust_of_purification: true,
    });
    expect(finalStats(receiver).get('mastery') - receiverBaseMastery).toBe(250);
    expect(finalStats(albedo).get('mastery') - sourceBaseMastery).toBe(250);
    expect(finalStats(receiver).get('dmg_plunge')).toBeCloseTo(0.6, 10);
    expect(finalStats(receiver).get('dmg_all')).toBeCloseTo(0.17, 10);

    // The source is off-field when saving, while all three field buffs are on.
    const offFieldCopy = Team.deserialize(team.serialize());
    expect(finalStats(offFieldCopy.getMember(0)).get('dmg_plunge')).toBeCloseTo(0.6, 10);
    expect(finalStats(offFieldCopy.getMember(0)).get('dmg_all')).toBeCloseTo(0.17, 10);

    team.setOnFieldMember(albedo);
    expect(finalStats(receiver).get('dmg_plunge')).toBe(0);
    expect(finalStats(receiver).get('dmg_all')).toBe(0);
    expect(finalStats(receiver).get('mastery') - receiverBaseMastery).toBe(250);

    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(1)).get('mastery') - sourceBaseMastery).toBe(250);
});

test("Albedo's C2 Mastery has independent activation and source gates", () => {
    const albedo = makeBuild('Albedo');
    albedo.setCharLevels({level: 90, ascension: 6, constellation: 2});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, albedo);
    albedo.setCharSettings({albedo_witch_homework: true, albedo_opening_of_hanerozoic_buff: true});
    expect(finalStats(albedo).get('mastery')).toBe(125);
    expect(finalStats(receiver).get('mastery')).toBe(125);
    team.setOnFieldMember(albedo);
    expect(finalStats(receiver).get('mastery')).toBe(125);
    albedo.setCharLevels({level: 90, ascension: 6, constellation: 1});
    expect(finalStats(receiver).get('mastery')).toBe(0);
    albedo.setCharLevels({level: 40, ascension: 2, constellation: 2});
    expect(finalStats(receiver).get('mastery')).toBe(0);
});
