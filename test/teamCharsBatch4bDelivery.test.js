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

test("Citlali C1 Stellar Blade scales with live Mastery and skips Citlali herself", () => {
    const citlali = c6build('Citlali');
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, citlali);
    const normal = () => receiver.calcFeatures(1)['attack.normal_hit_1'].normal;
    const base = normal();
    citlali.setCharSettings({citlali_radiant_blades_of_centzon_mimixcoah: true});

    const withC1 = normal();
    expect(withC1).toBeGreaterThan(base);
    citlali.modifyBuffsSettings({'custom_buffs.mastery': 100});
    const delta1 = normal() - withC1;
    expect(delta1).toBeGreaterThan(0);
    citlali.modifyBuffsSettings({'custom_buffs.mastery': 300});
    const delta2 = normal() - withC1;
    // 200% of Mastery, so tripling the bonus triples the damage gain.
    expect(delta2 / delta1).toBeCloseTo(3, 5);
    // Citlali herself is excluded: her own hits gain nothing from the toggle.
    const own = () => citlali.calcFeatures(1)['attack.normal_hit_1'].normal;
    const ownOn = own();
    citlali.setCharSettings({citlali_radiant_blades_of_centzon_mimixcoah: false});
    expect(normal()).toBeCloseTo(base, 10);
    expect(own()).toBeCloseTo(ownOn, 10);
});

test("Citlali shreds survive save/load off-field; C2 Mastery splits self/other; C6 follows points", () => {
    const citlali = c6build('Citlali');
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, citlali);
    matchCarrierTotals(citlali, {mastery_total: 800});
    citlali.setCharSettings({
        citlali_mamaloacos_frigid_rain: true,
        citlali_heart_devourers_travail: true,
        citlali_points: 40,
    });

    expect(enemyChange(receiver, 'enemy_res_pyro')).toBeCloseTo(-0.4, 10);
    expect(enemyChange(receiver, 'enemy_res_hydro')).toBeCloseTo(-0.4, 10);
    expect(finalStats(receiver).get('mastery')).toBeCloseTo(250, 10);
    // C2: Citlali herself gains 125 (toggle off/on delta, ignoring the
    // matched test totals).
    const citlaliMastery = finalStats(citlali).get('mastery');
    citlali.setCharSettings({
        citlali_mamaloacos_frigid_rain: true,
        citlali_heart_devourers_travail: false,
        citlali_points: 40,
    });
    expect(citlaliMastery - finalStats(citlali).get('mastery')).toBeCloseTo(125, 10);
    citlali.setCharSettings({
        citlali_mamaloacos_frigid_rain: true,
        citlali_heart_devourers_travail: true,
        citlali_points: 40,
    });
    expect(finalStats(receiver).get('dmg_pyro')).toBeCloseTo(0.6, 10);

    // The saved source controls survive save/load while off-field.
    team.setOnFieldMember(receiver);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(copy.getMember(1).getSettings().citlali_points).toBe(40);
    expect(copy.getMember(1).getBuildData().settings.citlali_heart_devourers_travail).toBe(true);
    expect(enemyChange(copy.getMember(0), 'enemy_res_pyro')).toBeCloseTo(-0.4, 10);

    // Live points: halving them halves the delivered Pyro/Hydro bonus,
    // and Citlali herself keeps a single copy.
    citlali.setCharSettings({
        citlali_mamaloacos_frigid_rain: true,
        citlali_heart_devourers_travail: true,
        citlali_points: 20,
    });
    expect(finalStats(receiver).get('dmg_pyro')).toBeCloseTo(0.3, 10);
    expect(finalStats(citlali).get('dmg_pyro')).toBeCloseTo(0.3, 10);
});

test("Iansan ATK follows the active member, scales with live ATK, C2 needs Precise Movement", () => {
    const iansan = c6build('Iansan');
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, iansan);
    const receiverBase = finalStats(receiver).get('atk');
    // Linear regime for the live-scaling check: low matched ATK stays
    // under the burst cap, and both point counts skip the 42-point bonus.
    matchCarrierTotals(iansan, {atk_total: 500});
    iansan.setCharSettings({
        iansan_points: 0,
        iansan_enhanced_resistance_training: true,
        iansan_teachings_of_the_collective_of_plenty: true,
    });
    const pointsBase = finalStats(receiver).get('atk');
    iansan.setCharSettings({
        iansan_points: 30,
        iansan_enhanced_resistance_training: true,
        iansan_teachings_of_the_collective_of_plenty: true,
    });
    const gain30 = finalStats(receiver).get('atk') - pointsBase;
    expect(gain30).toBeGreaterThan(0);
    iansan.setCharSettings({
        iansan_points: 15,
        iansan_enhanced_resistance_training: true,
        iansan_teachings_of_the_collective_of_plenty: true,
    });
    const gain15 = finalStats(receiver).get('atk') - pointsBase;
    // Live Nightsoul points: doubling them doubles the ATK gain.
    expect(gain30 / gain15).toBeCloseTo(2, 2);

    matchCarrierTotals(iansan, {atk_total: 2000});
    iansan.setCharSettings({
        iansan_points: 42,
        iansan_enhanced_resistance_training: true,
        iansan_teachings_of_the_collective_of_plenty: true,
    });
    const buffed = finalStats(receiver).get('atk') - receiverBase;
    expect(buffed).toBeGreaterThan(0);

    // C2 rides on the Precise Movement assumption.
    expect(finalStats(receiver).get('atk_percent')).toBeCloseTo(0.3, 10);
    iansan.setCharSettings({
        iansan_points: 42,
        iansan_enhanced_resistance_training: false,
        iansan_teachings_of_the_collective_of_plenty: true,
    });
    expect(finalStats(receiver).get('atk_percent')).toBe(0);

    // The buff follows the active member: with Iansan on-field, the
    // teammate keeps nothing and Iansan holds her own copy.
    iansan.setCharSettings({
        iansan_points: 42,
        iansan_enhanced_resistance_training: true,
        iansan_teachings_of_the_collective_of_plenty: true,
    });
    team.setOnFieldMember(iansan);
    expect(finalStats(receiver).get('atk')).toBeCloseTo(receiverBase, 10);
    expect(finalStats(receiver).get('dmg_all')).toBe(0);
    expect(finalStats(iansan).get('dmg_all')).toBeCloseTo(0.25, 10);
});

test("Mavuika Kiongozi reaches the active member live; C4 needs it; shred persists off-field", () => {
    const mavuika = c6build('Mavuika');
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, mavuika);
    mavuika.setCharSettings({
        mavuika_kiongozi: 40,
        mavuika_the_ashen_price: true,
        mavuika_humanitys_name_unfettered: true,
    });

    expect(finalStats(receiver).get('dmg_all')).toBeCloseTo(0.5, 10);
    expect(enemyChange(receiver, 'enemy_def_reduce')).toBeCloseTo(0.2, 10);
    // Live assumption: halving Kiongozi halves the delivered bonus.
    mavuika.setCharSettings({
        mavuika_kiongozi: 20,
        mavuika_the_ashen_price: true,
        mavuika_humanitys_name_unfettered: true,
    });
    expect(finalStats(receiver).get('dmg_all')).toBeCloseTo(0.3, 10);
    // C4 Resolve needs the Kiongozi assumption: at zero it adds nothing.
    mavuika.setCharSettings({
        mavuika_kiongozi: 0,
        mavuika_the_ashen_price: true,
        mavuika_humanitys_name_unfettered: true,
    });
    expect(finalStats(receiver).get('dmg_all')).toBe(0);

    // With Mavuika herself on-field, the off-field teammate keeps nothing.
    mavuika.setCharSettings({
        mavuika_kiongozi: 40,
        mavuika_the_ashen_price: true,
        mavuika_humanitys_name_unfettered: true,
    });
    team.setOnFieldMember(mavuika);
    expect(finalStats(receiver).get('dmg_all')).toBe(0);
    expect(finalStats(mavuika).get('dmg_all')).toBeCloseTo(0.5, 10);

    // Off-field source keeps shredding after save/load.
    team.setOnFieldMember(receiver);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(copy.getMember(1).getSettings().mavuika_kiongozi).toBe(40);
    expect(enemyChange(copy.getMember(0), 'enemy_def_reduce')).toBeCloseTo(0.2, 10);
    expect(finalStats(copy.getMember(0)).get('dmg_all')).toBeCloseTo(0.5, 10);
});

test("Ifa reaction bonus follows live points and Nightsoul state, source included once", () => {
    const ifa = c6build('Ifa');
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, ifa);
    ifa.setCharSettings({
        'common.nightsoul_blessing_state': true,
        ifa_field_medics_vision: 200,
    });

    expect(finalStats(receiver).get('dmg_reaction_swirl')).toBeCloseTo(3, 10);
    // Source and receiver hold the same single copy.
    expect(finalStats(ifa).get('dmg_reaction_swirl')).toBeCloseTo(3, 10);
    ifa.setCharSettings({
        'common.nightsoul_blessing_state': true,
        ifa_field_medics_vision: 100,
    });
    expect(finalStats(receiver).get('dmg_reaction_swirl')).toBeCloseTo(1.5, 10);
    // Without the Blessing state the bonus stops.
    ifa.setCharSettings({
        'common.nightsoul_blessing_state': false,
        ifa_field_medics_vision: 200,
    });
    expect(finalStats(receiver).get('dmg_reaction_swirl')).toBe(0);
});

test("Varesa stays neutral for teammates; her C4 Plunging bonus is live ATK", () => {
    const varesa = c6build('Varesa');
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, varesa);
    expect(DB.Chars.get('Varesa').partyData).toBeUndefined();

    const base = finalStats(receiver);
    expect(finalStats(receiver).get('atk')).toBeCloseTo(base.get('atk'), 10);
    expect(finalStats(receiver).get('dmg_all')).toBe(0);

    // C4 Diligent Refinement: toggle off/on moves her own Plunging damage,
    // and more ATK raises it (500% of ATK, capped at 20000).
    const plunge = () => varesa.calcFeatures(1)['attack.plunge_low'].normal;
    varesa.setCharSettings({varesa_the_courage_to_press_on_1: false});
    const off = plunge();
    varesa.setCharSettings({varesa_the_courage_to_press_on_1: true});
    expect(plunge()).toBeGreaterThan(off);
    varesa.modifyBuffsSettings({'custom_buffs.atk': 1000});
    expect(plunge()).toBeGreaterThan(off);
});

test("Xilonen shreds follow team elements; C2 matches elements; samplers gate everything", () => {
    const xilonen = c6build('Xilonen');
    const ayaka = makeBuild('Ayaka');
    const team = Team.fromMember(ayaka);
    team.setMember(1, xilonen);
    matchCarrierTotals(xilonen, {def_total: 2000});
    xilonen.setCharSettings({
        'common.nightsoul_blessing_state': true,
        xilonen_samplers: true,
        xilonen_suchitls_trance: true,
    });

    // Ayaka + Xilonen: Cryo and Geo samplers.
    expect(enemyChange(ayaka, 'enemy_res_cryo')).toBeLessThan(0);
    expect(enemyChange(ayaka, 'enemy_res_geo')).toBeLessThan(0);
    expect(enemyChange(ayaka, 'enemy_res_pyro')).toBe(0);
    // C2: Cryo member gains CRIT DMG, but no Pyro ATK.
    expect(finalStats(ayaka).get('crit_dmg')).toBeCloseTo(0.6, 10);
    expect(finalStats(ayaka).get('atk_percent')).toBe(0);

    // A Pyro member in the same team gets the Pyro sampler instead.
    const hutao = makeBuild('Hutao');
    team.setMember(2, hutao);
    expect(finalStats(hutao).get('atk_percent')).toBeCloseTo(0.45, 10);
    expect(enemyChange(hutao, 'enemy_res_pyro')).toBeLessThan(0);

    // Samplers off: no shred, no C2 gifts.
    xilonen.setCharSettings({
        'common.nightsoul_blessing_state': true,
        xilonen_samplers: false,
        xilonen_suchitls_trance: true,
    });
    expect(enemyChange(ayaka, 'enemy_res_cryo')).toBe(0);
    expect(finalStats(ayaka).get('crit_dmg')).toBe(0);
});

test("Xilonen C4 Blooming Blessing scales with live DEF and survives save/load off-field", () => {
    const xilonen = c6build('Xilonen');
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, xilonen);
    xilonen.setCharSettings({
        'common.nightsoul_blessing_state': true,
        xilonen_samplers: true,
        xilonen_suchitls_trance: true,
    });
    const normal = () => receiver.calcFeatures(1)['attack.normal_hit_1'].normal;
    const without = normal();

    xilonen.modifyBuffsSettings({'custom_buffs.def': 1000});
    expect(normal() - without).toBeGreaterThan(0);

    team.setOnFieldMember(receiver);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(copy.getMember(1).getSettings().xilonen_suchitls_trance).toBe(true);
    const afterLoad = copy.getMember(0).calcFeatures(1)['attack.normal_hit_1'].normal;
    expect(afterLoad).toBeCloseTo(normal(), 10);
});

test("Xianyun Galefeather reaches everyone; Adeptus bonus is live, active-only, C2-leveled", () => {
    const xianyun = c6build('Xianyun');
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, xianyun);
    matchCarrierTotals(xianyun, {atk_total: 2000});
    xianyun.setCharSettings({
        xianyun_galefeather_pursuit: 4,
        xianyun_consider_the_adeptus_in_her_realm: true,
    });

    // Storm Pinion: every member, source included.
    expect(finalStats(receiver).get('crit_rate_plunge')).toBeCloseTo(0.1, 10);
    expect(finalStats(xianyun).get('crit_rate_plunge')).toBeCloseTo(0.1, 10);

    // Adeptus in Her Realm: live ATK, active recipients only.
    const plunge = () => receiver.calcFeatures(1)['attack.plunge_low'].normal;
    const buffed = plunge();
    xianyun.modifyBuffsSettings({'custom_buffs.atk': 1000});
    expect(plunge()).toBeGreaterThan(buffed);
    team.setOnFieldMember(xianyun);
    xianyun.modifyBuffsSettings({'custom_buffs.atk': 0});
    // Off-field Ayaka keeps no Adeptus bonus, while the on-field Xianyun
    // holds her own copy.
    expect(plunge()).toBeLessThan(buffed);
    const ownPlunge = () => xianyun.calcFeatures(1)['attack.plunge_low'].normal;
    const ownOn = ownPlunge();
    xianyun.setCharSettings({
        xianyun_galefeather_pursuit: 4,
        xianyun_consider_the_adeptus_in_her_realm: false,
    });
    expect(ownPlunge()).toBeLessThan(ownOn);

    // C2 second level doubles the delivered bonus over C0.
    team.setOnFieldMember(receiver);
    xianyun.setCharLevels({level: 90, ascension: 6, constellation: 6});
    xianyun.setCharSettings({
        xianyun_galefeather_pursuit: 4,
        xianyun_consider_the_adeptus_in_her_realm: true,
    });
    const withC2 = plunge() - (() => {
        xianyun.setCharSettings({
            xianyun_galefeather_pursuit: 4,
            xianyun_consider_the_adeptus_in_her_realm: false,
        });
        return plunge();
    })();
    xianyun.setCharLevels({level: 90, ascension: 6, constellation: 0});
    xianyun.setCharSettings({
        xianyun_galefeather_pursuit: 4,
        xianyun_consider_the_adeptus_in_her_realm: true,
    });
    const withC0 = plunge() - (() => {
        xianyun.setCharSettings({
            xianyun_galefeather_pursuit: 4,
            xianyun_consider_the_adeptus_in_her_realm: false,
        });
        return plunge();
    })();
    expect(withC2 / withC0).toBeCloseTo(2, 2);
});
