import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild } from "./support/team";

global.DB = DB;

test("Sara's Tengu Juurai ATK uses her live base ATK and talent level, C6 follows the buff for everyone", () => {
    const sara = makeBuild('Sara');
    sara.setCharLevels({level: 90, ascension: 6, constellation: 6});
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(sara);
    team.setMember(1, receiver);
    const base = finalStats(receiver).get('atk');

    sara.setCharSettings({sara_tengu_juurai: true});
    const buffed = finalStats(receiver).get('atk') - base;
    expect(buffed).toBeGreaterThan(0);
    // C5 talent bonus applies from the source: skill 10 + 3.
    const saraAtkBase = finalStats(sara).get('atk_base');
    expect(buffed).toBeCloseTo(saraAtkBase * 0.9129, 2);
    // C6: both source and receiver hold 60 Electro CRIT DMG, no doubling.
    expect(finalStats(receiver).get('crit_dmg_electro')).toBeCloseTo(0.6, 10);
    expect(finalStats(sara).get('crit_dmg_electro')).toBeCloseTo(0.6, 10);

    sara.setCharSettings({sara_tengu_juurai: false});
    expect(finalStats(receiver).get('atk')).toBeCloseTo(base, 10);
    // Every recipient, including Sara, needs the Tengu Juurai buff.
    expect(finalStats(receiver).get('crit_dmg_electro')).toBe(0);
    expect(finalStats(sara).get('crit_dmg_electro')).toBe(0);
});

test("Sara's C6 gift stays off below C6 and survives save/load from off-field", () => {
    const sara = makeBuild('Sara');
    sara.setCharLevels({level: 90, ascension: 6, constellation: 5});
    sara.setCharSettings({sara_tengu_juurai: true});
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, sara);
    expect(team.getOnFieldMember()).toBe(receiver);
    expect(finalStats(receiver).get('crit_dmg_electro')).toBe(0);
    expect(finalStats(receiver).get('atk')).toBeGreaterThan(0);

    sara.setCharLevels({level: 90, ascension: 6, constellation: 6});
    expect(finalStats(receiver).get('crit_dmg_electro')).toBeCloseTo(0.6, 10);

    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(copy.getOnFieldMember().char.getId()).toBe(receiver.char.getId());
    expect(finalStats(copy.getMember(1)).get('atk')).toBeGreaterThan(0);
    expect(finalStats(copy.getMember(0)).get('crit_dmg_electro')).toBeCloseTo(0.6, 10);
});

test("Gorou's banner needs his toggle, ascension and Geo count; C6 needs C6", () => {
    const gorou = makeBuild('Gorou');
    gorou.setCharLevels({level: 90, ascension: 6, constellation: 6});
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(gorou);
    team.setMember(1, receiver);
    const defBase = finalStats(receiver).get('def');
    team.setOnFieldMember(receiver);

    gorou.setCharSettings({
        gorou_generals_war_banner: true,
        gorou_heedless_of_the_wind_and_weather: true,
    });
    expect(finalStats(receiver).get('def') - defBase).toBeGreaterThan(0);
    expect(finalStats(receiver).get('def_percent')).toBeCloseTo(0.25, 10);
    // One Geo member only: first C6 tier.
    expect(finalStats(receiver).get('crit_dmg_geo')).toBeCloseTo(0.1, 10);
    expect(finalStats(receiver).get('dmg_geo')).toBe(0);

    // A1 without ascension 1: heedless stops, banner DEF stays.
    gorou.setCharLevels({level: 20, ascension: 0, constellation: 6});
    expect(finalStats(receiver).get('def_percent')).toBe(0);
    expect(finalStats(receiver).get('def') - defBase).toBeGreaterThan(0);

    // Below C6: the CRIT tiers stop.
    gorou.setCharLevels({level: 90, ascension: 6, constellation: 5});
    expect(finalStats(receiver).get('crit_dmg_geo')).toBe(0);
});

test("Gorou's Crunch and higher C6 tiers need three Geo members", () => {
    const gorou = makeBuild('Gorou');
    gorou.setCharLevels({level: 90, ascension: 6, constellation: 6});
    gorou.setCharSettings({gorou_generals_war_banner: true});
    const receiver = makeBuild('Itto');
    const team = Team.fromMember(gorou);
    team.setMember(1, receiver);
    team.setMember(2, makeBuild('Albedo'));
    team.setMember(3, makeBuild('Zhongli'));
    team.setOnFieldMember(receiver);
    expect(finalStats(receiver).get('dmg_geo')).toBeCloseTo(0.15, 10);
    expect(finalStats(receiver).get('crit_dmg_geo')).toBeCloseTo(0.4, 10);
    expect(finalStats(receiver).get('def')).toBeGreaterThan(0);

    team.setOnFieldMember(gorou);
    expect(finalStats(receiver).get('dmg_geo')).toBe(0);
    expect(finalStats(receiver).get('def')).toBe(0);
    // C6 is a lasting buff to all nearby party members, unlike the field.
    expect(finalStats(receiver).get('crit_dmg_geo')).toBeCloseTo(0.4, 10);
    expect(finalStats(gorou).get('dmg_geo')).toBeCloseTo(0.15, 10);

    const copy = Team.deserialize(team.serialize());
    copy.setOnFieldMember(copy.getMember(1));
    expect(finalStats(copy.getMember(1)).get('dmg_geo')).toBeCloseTo(0.15, 10);
});

test("YaeMiko's C2 Mastery follows the active character, C1/C4 reach everyone at the right constellation", () => {
    const yae = makeBuild('YaeMiko');
    yae.setCharLevels({level: 90, ascension: 6, constellation: 4});
    yae.setCharSettings({
        yae_miko_yakan_offering_buff: true,
        yae_miko_sesshou_sakura_level: 4,
        miko_sakura_channeling: true,
    });
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(yae);
    team.setMember(1, receiver);
    team.setOnFieldMember(receiver);

    expect(finalStats(receiver).get('dmg_electro')).toBeCloseTo(0.7, 10);
    expect(finalStats(receiver).get('mastery')).toBe(200);

    // Off-field receivers keep C1/C4 but lose the active-only C2.
    team.setOnFieldMember(yae);
    expect(finalStats(receiver).get('dmg_electro')).toBeCloseTo(0.7, 10);
    expect(finalStats(receiver).get('mastery')).toBe(0);
    // Yae keeps her own C2 copy while off-field-selected.
    expect(finalStats(yae).get('mastery')).toBe(200);

    // Below the relevant constellations the gifts stop.
    yae.setCharLevels({level: 90, ascension: 6, constellation: 0});
    team.setOnFieldMember(receiver);
    expect(finalStats(receiver).get('dmg_electro')).toBe(0);
    expect(finalStats(receiver).get('mastery')).toBe(0);
});

test("Candace's HP-scaled Normal DMG is live, infusion stays melee-only and survives save/load", () => {
    const candace = makeBuild('Candace');
    candace.setCharLevels({level: 90, ascension: 6, constellation: 0});
    candace.setCharSettings({candace_prayer_of_the_crimson_crown: true});
    const sword = makeBuild('Keqing');
    const catalyst = makeBuild('Wanderer');
    const team = Team.fromMember(candace);
    team.setMember(1, sword);
    team.setMember(2, catalyst);

    const dmgBefore = finalStats(sword).get('dmg_normal_electro');
    expect(dmgBefore).toBeGreaterThan(0.2);
    expect(finalStats(catalyst).get('dmg_normal_electro')).toBeCloseTo(dmgBefore, 10);
    expect(Boolean(sword.getBuildData().settings.attack_infusion_hydro)).toBe(true);
    expect(Boolean(catalyst.getBuildData().settings.attack_infusion_hydro)).toBe(false);

    // Live HP scaling: more Max HP on Candace raises the delivered bonus.
    candace.modifyBuffsSettings({'custom_buffs.hp': 5000});
    expect(finalStats(sword).get('dmg_normal_electro') - dmgBefore).toBeCloseTo(5000 * 0.0005 / 100, 10);

    // Off-field source keeps delivering after save/load.
    team.setOnFieldMember(sword);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(Boolean(copy.getMember(1).getBuildData().settings.attack_infusion_hydro)).toBe(true);
    expect(Boolean(copy.getMember(2).getBuildData().settings.attack_infusion_hydro)).toBe(false);
    expect(finalStats(copy.getMember(1)).get('dmg_normal_electro')).toBeCloseTo(finalStats(sword).get('dmg_normal_electro'), 10);
});

test("Tighnari's C4 Mastery tiers need C4 and the first toggle", () => {
    const tighnari = makeBuild('Tighnari');
    tighnari.setCharLevels({level: 90, ascension: 6, constellation: 4});
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(tighnari);
    team.setMember(1, receiver);

    tighnari.setCharSettings({tighnari_withering_glimpsed_in_the_leaves_1: true});
    expect(finalStats(receiver).get('mastery')).toBe(60);
    tighnari.setCharSettings({
        tighnari_withering_glimpsed_in_the_leaves_1: true,
        tighnari_withering_glimpsed_in_the_leaves_2: true,
    });
    expect(finalStats(receiver).get('mastery')).toBe(120);
    // Second toggle alone does nothing.
    tighnari.setCharSettings({tighnari_withering_glimpsed_in_the_leaves_2: true});
    expect(finalStats(receiver).get('mastery')).toBe(0);

    tighnari.setCharLevels({level: 90, ascension: 6, constellation: 3});
    tighnari.setCharSettings({
        tighnari_withering_glimpsed_in_the_leaves_1: true,
        tighnari_withering_glimpsed_in_the_leaves_2: true,
    });
    expect(finalStats(receiver).get('mastery')).toBe(0);
});

test("Layla's shield stacks and C4 HP scaling deliver and survive save/load", () => {
    const layla = makeBuild('Layla');
    layla.setCharLevels({level: 90, ascension: 6, constellation: 4});
    layla.setCharSettings({layla_like_nascent_light: 4, layla_starry_illumination: true});
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(layla);
    team.setMember(1, receiver);

    expect(finalStats(receiver).get('shield')).toBeCloseTo(0.24, 10);
    layla.setCharSettings({layla_like_nascent_light: 2, layla_starry_illumination: true});
    expect(finalStats(receiver).get('shield')).toBeCloseTo(0.12, 10);
    const normal = () => receiver.calcFeatures(1)['attack.normal_hit_1'].normal;
    const damageWithC4 = normal();
    const sourceHP = finalStats(layla).getTotalPercent('hp');

    // C4 below constellation 4 stops the multiplier but keeps the shield.
    layla.setCharLevels({level: 90, ascension: 6, constellation: 3});
    layla.setCharSettings({layla_like_nascent_light: 4, layla_starry_illumination: true});
    expect(finalStats(receiver).get('shield')).toBeCloseTo(0.24, 10);
    const damageWithoutC4 = normal();
    expect(damageWithC4).toBeGreaterThan(damageWithoutC4);

    layla.setCharLevels({level: 90, ascension: 6, constellation: 4});
    layla.modifyBuffsSettings({'custom_buffs.hp': 5000});
    expect(normal() - damageWithoutC4).toBeCloseTo(
        (damageWithC4 - damageWithoutC4) * (sourceHP + 5000) / sourceHP, 8,
    );
    team.setOnFieldMember(receiver);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(1)).get('shield')).toBeCloseTo(0.24, 10);
});

test("Kirara's C6 Elemental DMG needs C6 and reaches the team", () => {
    const kirara = makeBuild('Kirara');
    kirara.setCharLevels({level: 90, ascension: 6, constellation: 6});
    kirara.setCharSettings({kirara_countless_sights_to_see: true});
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(kirara);
    team.setMember(1, receiver);

    for (const element of ['anemo', 'geo', 'pyro', 'electro', 'hydro', 'cryo', 'dendro']) {
        expect(finalStats(receiver).get('dmg_' + element)).toBeCloseTo(0.12, 10);
    }
    expect(finalStats(kirara).get('dmg_pyro')).toBeCloseTo(0.12, 10);

    kirara.setCharLevels({level: 90, ascension: 6, constellation: 5});
    expect(finalStats(receiver).get('dmg_pyro')).toBe(0);
    expect(finalStats(kirara).get('dmg_pyro')).toBe(0);
});
