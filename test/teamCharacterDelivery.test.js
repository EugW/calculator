import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild } from "./support/team";

global.DB = DB;

test.each([
    ['Keqing', true],
    ['Eula', true],
    ['Hutao', true],
    ['Tartaglia', false],
    ['Wanderer', false],
])("Chongyun's infusion and attack speed use %s's weapon type", (char, melee) => {
    const chongyun = makeBuild('Chongyun');
    const receiver = makeBuild(char);
    const team = Team.fromMember(chongyun);
    team.setMember(1, receiver);
    const before = finalStats(receiver).get('atk_speed_normal');
    chongyun.setCharSettings({chongyun_frost_field: true});
    expect(Boolean(receiver.getBuildData().settings.attack_infusion_cryo)).toBe(melee);
    expect(finalStats(receiver).get('atk_speed_normal') - before).toBeCloseTo(melee ? 0.08 : 0, 10);
});

test("Barbara's Melody Loop stamina reduction can be switched off", () => {
    const barbara = makeBuild('Barbara');
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(barbara);
    team.setMember(1, receiver);

    for (const member of [barbara, receiver]) {
        expect(finalStats(member).get('stamina_consume')).toBe(0);
    }
    barbara.setCharSettings({barbara_glorious_season: true});
    for (const member of [barbara, receiver]) {
        expect(finalStats(member).get('stamina_consume')).toBeCloseTo(0.12, 10);
    }
    barbara.setCharSettings({barbara_glorious_season: false});
    for (const member of [barbara, receiver]) {
        expect(finalStats(member).get('stamina_consume')).toBe(0);
    }
});

test("Beidou's enemy debuff remains when an off-field receiver loses the active-character Mastery", () => {
    const beidou = makeBuild('Beidou');
    beidou.setCharLevels({level: 90, ascension: 6, constellation: 6});
    beidou.setCharSettings({beidou_bane_of_the_evil: true, beidou_radiance_stellarconduct: true});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(beidou);
    team.modifySettings({polestar_field: true});
    team.setMember(1, receiver);
    team.setOnFieldMember(receiver);

    const active = finalStats(receiver);
    expect(active.get('mastery')).toBe(200);
    expect(finalStats(beidou).get('mastery')).toBe(0);
    team.setOnFieldMember(beidou);
    const inactive = finalStats(receiver);
    expect(inactive.get('mastery')).toBe(0);
    expect(inactive.get('enemy__res_cryo')).toBe(active.get('enemy__res_cryo'));
    expect(inactive.get('enemy__res_electro')).toBe(active.get('enemy__res_electro'));

    team.setOnFieldMember(receiver);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(1)).get('mastery')).toBe(200);
    expect(finalStats(copy.getMember(0)).get('mastery')).toBe(0);
});

test("Rosaria shares her live CRIT Rate with others, up to 15 percentage points", () => {
    const rosaria = makeBuild('Rosaria');
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(rosaria);
    team.setMember(1, receiver);
    const receiverBase = finalStats(receiver).get('crit_rate');
    const sourceBase = finalStats(rosaria).get('crit_rate');
    const sourceTotal = finalStats(rosaria).get('crit_rate_base') + sourceBase;

    rosaria.setCharSettings({rosaria_shadow_samaritan: true});
    expect(finalStats(receiver).get('crit_rate') - receiverBase).toBeCloseTo(sourceTotal * 0.15, 10);
    expect(finalStats(rosaria).get('crit_rate')).toBeCloseTo(sourceBase, 10);

    rosaria.modifyBuffsSettings({'custom_buffs.crit_rate': 20});
    expect(finalStats(receiver).get('crit_rate') - receiverBase).toBeCloseTo((sourceTotal + 0.2) * 0.15, 10);
    rosaria.modifyBuffsSettings({'custom_buffs.crit_rate': 100});
    expect(finalStats(receiver).get('crit_rate') - receiverBase).toBeCloseTo(0.15, 10);
    expect(finalStats(rosaria).get('crit_rate')).toBeCloseTo(sourceBase + 1, 10);
});

test("Yoimiya's burst-time stack assumption buffs only others and requires A4", () => {
    const yoimiya = makeBuild('Yoimiya');
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(yoimiya);
    team.setMember(1, receiver);
    const sourceBase = finalStats(yoimiya).get('atk_percent');
    const receiverBase = finalStats(receiver).get('atk_percent');
    yoimiya.setCharSettings({yoimiya_summer_nights_dawn: true, yoimiya_summer_nights_dawn_stacks: 2});
    expect(finalStats(receiver).get('atk_percent') - receiverBase).toBeCloseTo(0.12, 10);
    expect(finalStats(yoimiya).get('atk_percent')).toBe(sourceBase);
    yoimiya.setCharSettings({yoimiya_summer_nights_dawn: true, yoimiya_summer_nights_dawn_stacks: 5});
    expect(finalStats(receiver).get('atk_percent') - receiverBase).toBeCloseTo(0.15, 10);
    yoimiya.setCharLevels({level: 60, ascension: 3, constellation: 0});
    expect(finalStats(receiver).get('atk_percent')).toBe(receiverBase);
});

test("Yelan's retained A4 setting starts delivering only when the source unlocks A4", () => {
    const yelan = makeBuild('Yelan');
    yelan.setCharLevels({level: 60, ascension: 3, constellation: 0});
    yelan.setCharSettings({yelan_adapt_with_ease: 15});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(yelan);
    team.setMember(1, receiver);
    team.setOnFieldMember(receiver);
    expect(finalStats(receiver).get('dmg_all')).toBe(0);
    yelan.setCharLevels({level: 70, ascension: 4, constellation: 0});
    expect(finalStats(receiver).get('dmg_all')).toBeCloseTo(0.5, 10);
});

test.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
])("Dori's assumed HP and energy effects are independently controlled (%s, %s)", (healing, recharge) => {
    const dori = makeBuild('Dori');
    dori.setCharLevels({level: 90, ascension: 6, constellation: 4});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(dori);
    team.setMember(1, receiver);
    const before = finalStats(receiver);
    dori.setCharSettings({
        dori_discretionary_supplement_1: healing,
        dori_discretionary_supplement_2: recharge,
    });
    const after = finalStats(receiver);
    expect(after.get('healing_recv') - before.get('healing_recv')).toBeCloseTo(healing ? 0.5 : 0, 10);
    expect(after.get('recharge') - before.get('recharge')).toBeCloseTo(recharge ? 0.3 : 0, 10);
});

test.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
])("Diona's assumed HP modes can be disabled without removing her own Max HP bonus (%s, %s)", (mastery, healing) => {
    const diona = makeBuild('Diona');
    diona.setCharLevels({level: 90, ascension: 6, constellation: 6});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(diona);
    team.setMember(1, receiver);
    const sourceHP = finalStats(diona).get('hp_percent');
    const receiverHP = finalStats(receiver).get('hp_percent');

    diona.setCharSettings({diona_cats_tail_mastery: mastery, diona_cats_tail: healing});
    const stats = finalStats(receiver);
    expect(stats.get('mastery')).toBe(mastery ? 200 : 0);
    expect(stats.get('healing_recv')).toBeCloseTo(healing ? 0.3 : 0, 10);
    expect(stats.get('hp_percent')).toBe(receiverHP);
    expect(finalStats(diona).get('hp_percent')).toBe(sourceHP);

    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(1)).get('mastery')).toBe(stats.get('mastery'));
    expect(finalStats(copy.getMember(1)).get('healing_recv')).toBe(stats.get('healing_recv'));
});

test.each([
    [true, false],
    [false, true],
    [true, true],
])("Diona's delivered Radiance follows her source mode with Conduct priority (%s, %s)", (conduct, swirl) => {
    const diona = makeBuild('Diona');
    diona.setCharLevels({level: 90, ascension: 6, constellation: 6});
    diona.setCharSettings({
        diona_cats_tail_radiance: true,
        diona_radiance_stellarconduct: conduct,
        diona_radiance_stellarswirl: swirl,
    });
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(diona);
    team.setMember(1, receiver);
    const stats = finalStats(receiver);
    expect(stats.get('dmg_stellarconduct')).toBeCloseTo(conduct ? 0.4 : 0, 10);
    expect(stats.get('dmg_reaction_superconduct')).toBeCloseTo(conduct ? 0.4 : 0, 10);
    expect(stats.get('dmg_stellarswirl')).toBeCloseTo(!conduct && swirl ? 0.4 : 0, 10);
    expect(stats.get('dmg_reaction_swirl_cryo')).toBeCloseTo(!conduct && swirl ? 0.4 : 0, 10);
});
