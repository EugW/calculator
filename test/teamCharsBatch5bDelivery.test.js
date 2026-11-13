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

test("Alhaitham C4 Mastery reaches others, scales with stacks, excludes himself", () => {
    const alhaitham = c6build('Alhaitham');
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, alhaitham);
    const base = finalStats(receiver).get('mastery');
    const ownBase = finalStats(alhaitham).get('mastery');
    const ownDendroBase = finalStats(alhaitham).get('dmg_dendro');

    alhaitham.setCharSettings({alhaitham_elucidation: 3});
    expect(finalStats(receiver).get('mastery') - base).toBeCloseTo(90, 10);
    // Alhaitham himself gains no Mastery, only his own Dendro bonus.
    expect(finalStats(alhaitham).get('mastery')).toBeCloseTo(ownBase, 10);
    expect(finalStats(alhaitham).get('dmg_dendro') - ownDendroBase).toBeCloseTo(0.3, 10);

    alhaitham.setCharSettings({alhaitham_elucidation: 1});
    expect(finalStats(receiver).get('mastery') - base).toBeCloseTo(30, 10);
});

test("Baizhu bonuses scale with live HP; C4 reaches everyone once; survive save/load", () => {
    const baizhu = c6build('Baizhu');
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, baizhu);
    const hpCustom = matchCarrierTotals(baizhu, {hp_total: 30000});
    baizhu.setCharSettings({
        baizhu_all_things_are_of_the_earth: true,
        baizhu_ancient_art_of_perception: true,
    });

    expect(finalStats(receiver).get('dmg_reaction_bloom')).toBeCloseTo(0.6, 10);
    expect(finalStats(receiver).get('dmg_reaction_burning')).toBeCloseTo(0.6, 10);
    expect(finalStats(receiver).get('mastery')).toBeCloseTo(80, 10);
    // Baizhu holds a single copy of his own C4.
    expect(finalStats(baizhu).get('mastery')).toBeCloseTo(80, 10);

    // Live HP scaling: more Max HP raises the delivered Bloom bonus.
    baizhu.modifyBuffsSettings({'custom_buffs.hp': hpCustom['custom_buffs.hp'] + 5000});
    expect(finalStats(receiver).get('dmg_reaction_bloom')).toBeCloseTo(0.7, 10);

    // The saved source controls survive save/load while off-field.
    team.setOnFieldMember(receiver);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(copy.getMember(1).getSettings().baizhu_all_things_are_of_the_earth).toBe(true);
    expect(finalStats(copy.getMember(0)).get('dmg_reaction_bloom')).toBeCloseTo(0.7, 4);
    expect(finalStats(copy.getMember(0)).get('mastery')).toBeCloseTo(80, 10);
});

test("Cyno Together We Rise needs Radiance and follows the active member", () => {
    const cyno = c6build('Cyno');
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, cyno);
    const baseMastery = finalStats(receiver).get('mastery');
    const cynoBaseMastery = finalStats(cyno).get('mastery');
    team.modifySettings({polestar_field: true});
    cyno.setCharSettings({
        cyno_radiance_stellarconduct: true,
        cyno_together_we_rise: true,
        cyno_homecoming_of_spirits_stellarconduct: 5,
    });

    expect(finalStats(receiver).get('mastery') - baseMastery).toBeCloseTo(200, 10);
    expect(finalStats(receiver).get('dmg_stellarconduct')).toBeCloseTo(0.8, 10);

    // Without Radiance the whole chain stops.
    cyno.setCharSettings({
        cyno_radiance_stellarconduct: false,
        cyno_together_we_rise: true,
        cyno_homecoming_of_spirits_stellarconduct: 5,
    });
    expect(finalStats(receiver).get('mastery')).toBeCloseTo(baseMastery, 10);
    expect(finalStats(receiver).get('dmg_stellarconduct')).toBe(0);

    // With Cyno himself on-field, the off-field teammate keeps nothing
    // while Cyno holds his own copies.
    cyno.setCharSettings({
        cyno_radiance_stellarconduct: true,
        cyno_together_we_rise: true,
        cyno_homecoming_of_spirits_stellarconduct: 5,
    });
    team.setOnFieldMember(cyno);
    expect(finalStats(receiver).get('mastery')).toBeCloseTo(baseMastery, 10);
    expect(finalStats(receiver).get('dmg_stellarconduct')).toBe(0);
    expect(finalStats(cyno).get('mastery') - cynoBaseMastery).toBeCloseTo(200, 10);
    expect(finalStats(cyno).get('dmg_stellarconduct')).toBeCloseTo(0.8, 10);
});

test("Kaveh Painted Dome rupture bonus reaches the team from his live burst level", () => {
    const kaveh = c6build('Kaveh');
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, kaveh);
    // Painted Dome's effects end when Kaveh leaves the field.
    team.setOnFieldMember(kaveh);
    kaveh.setCharSettings({kaveh_painted_dome: true});

    // Burst 10 plus his own C3 bonus: level 13 table value. Kaveh holds
    // his own C4 on top for cores he triggers himself.
    expect(finalStats(receiver).get('dmg_reaction_rupture')).toBeCloseTo(0.5841, 4);
    expect(finalStats(kaveh).get('dmg_reaction_rupture')).toBeCloseTo(1.1841, 4);

    // Live talent scaling: lowering his burst level lowers the delivery.
    kaveh.setCharSkills({attack: 10, elemental: 10, burst: 1});
    expect(finalStats(receiver).get('dmg_reaction_rupture')).toBeCloseTo(0.3436, 4);
    expect(finalStats(kaveh).get('dmg_reaction_rupture')).toBeCloseTo(0.9436, 4);
});

test("Nilou Bounty needs a pure dendro/hydro team; mixed teams keep the Dendro shred", () => {
    const bounty = {
        nilou_stance_bonus: true,
        nilou_stance_attacked: true,
        nilou_the_starry_skies_1: true,
        nilou_the_starry_skies_2: true,
    };

    // Mixed team: Eula breaks the Nilou party, so only the ungated
    // Dendro shred stays.
    const nilouMixed = c6build('Nilou');
    const eula = makeBuild('Eula');
    const mixed = Team.fromMember(eula);
    mixed.setMember(1, nilouMixed);
    matchCarrierTotals(nilouMixed, {hp_total: 40000});
    nilouMixed.setCharSettings(bounty);
    expect(enemyChange(eula, 'enemy_res_dendro')).toBeCloseTo(-0.35, 10);
    expect(enemyChange(eula, 'enemy_res_hydro')).toBe(0);
    expect(finalStats(eula).get('mastery')).toBe(0);
    expect(finalStats(eula).get('dmg_reaction_rupture')).toBe(0);

    // A pure team opens every gate; the Bounty bonus reads live Max HP.
    const nilou = c6build('Nilou');
    const tartaglia = makeBuild('Tartaglia');
    const collei = makeBuild('Collei');
    const pure = Team.fromMember(tartaglia);
    pure.setMember(1, nilou);
    pure.setMember(2, collei);
    const hpCustom = matchCarrierTotals(nilou, {hp_total: 40000});
    nilou.setCharSettings(bounty);
    expect(finalStats(tartaglia).get('mastery')).toBeCloseTo(100, 10);
    expect(enemyChange(tartaglia, 'enemy_res_hydro')).toBeCloseTo(-0.35, 10);
    expect(finalStats(tartaglia).get('dmg_reaction_rupture')).toBeCloseTo(0.9, 10);
    nilou.modifyBuffsSettings({'custom_buffs.hp': hpCustom['custom_buffs.hp'] + 5000});
    expect(finalStats(tartaglia).get('dmg_reaction_rupture')).toBeCloseTo(1.35, 10);

    // The saved source controls survive save/load while off-field.
    pure.setOnFieldMember(tartaglia);
    const copy = Team.deserialize(pure.serialize());
    expect(copy).not.toBeNull();
    expect(copy.getMember(1).getSettings().nilou_stance_bonus).toBe(true);
    expect(finalStats(copy.getMember(0)).get('mastery')).toBeCloseTo(100, 10);
    expect(finalStats(copy.getMember(0)).get('dmg_reaction_rupture')).toBeCloseTo(1.35, 3);
});

test("Faruzan Hurricane Guard scales with live Base ATK; team gifts persist off-field", () => {
    const faruzan = c6build('Faruzan');
    const receiver = makeBuild('Wanderer');
    const team = Team.fromMember(receiver);
    team.setMember(1, faruzan);
    matchCarrierTotals(faruzan, {atk_base: 900});
    const gifts = {
        faruzan_wind_bale: true,
        faruzan_wind_benefit: true,
        faruzan_lost_wisdom_of_the_seven_caverns: true,
        faruzan_the_wondrous_path_of_truth: true,
    };
    const baseAnemo = finalStats(receiver).get('dmg_anemo');
    faruzan.setCharSettings(gifts);

    expect(finalStats(receiver).get('dmg_anemo') - baseAnemo).toBeCloseTo(0.3825, 4);
    expect(enemyChange(receiver, 'enemy_res_anemo')).toBeCloseTo(-0.3, 10);
    expect(finalStats(receiver).get('crit_dmg_anemo')).toBeCloseTo(0.4, 10);
    // Faruzan keeps her own Benefit copy.
    expect(finalStats(faruzan).get('dmg_anemo')).toBeCloseTo(0.3825, 4);

    // Live Base ATK scaling through the delivered multiplier.
    const anemoHit = () => receiver.calcFeatures(1)['attack.normal_hit_1'].normal;
    const buffed = anemoHit();
    faruzan.setCharSettings(Object.assign({}, gifts, {
        faruzan_lost_wisdom_of_the_seven_caverns: false,
    }));
    const without = anemoHit();
    const gain900 = buffed - without;
    expect(gain900).toBeGreaterThan(0);
    // Base totals match only once per static: reset before re-matching.
    faruzan.static = undefined;
    matchCarrierTotals(faruzan, {atk_base: 1800});
    faruzan.setCharSettings(gifts);
    // Doubling her Base ATK doubles the delivered flat bonus.
    expect((anemoHit() - without) / gain900).toBeCloseTo(2, 2);

    // The saved source controls survive save/load while off-field.
    team.setOnFieldMember(receiver);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(copy.getMember(1).getSettings().faruzan_wind_benefit).toBe(true);
    expect(enemyChange(copy.getMember(0), 'enemy_res_anemo')).toBeCloseTo(-0.3, 10);
});

test("Dahlia A4 and C6 follow the active member; A4 scales with live HP", () => {
    const dahlia = c6build('Dahlia');
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, dahlia);
    const hpCustom = matchCarrierTotals(dahlia, {hp_total: 30000});
    dahlia.setCharSettings({
        dahlia_prayer_of_well_wrought_joy: true,
        dahlia_revelation_of_mercy: true,
        dahlia_you_shall_go_out_with_joy: true,
    });

    // 15% from HP plus 10% from C6; the shield gift is not field-gated.
    expect(finalStats(receiver).get('atk_speed')).toBeCloseTo(0.25, 10);
    expect(finalStats(receiver).get('shield')).toBeCloseTo(0.25, 10);

    // Live HP scaling: 10000 more Max HP adds 5% ATK SPD.
    dahlia.modifyBuffsSettings({'custom_buffs.hp': hpCustom['custom_buffs.hp'] + 10000});
    expect(finalStats(receiver).get('atk_speed')).toBeCloseTo(0.3, 10);
    dahlia.modifyBuffsSettings({'custom_buffs.hp': hpCustom['custom_buffs.hp']});

    // With Dahlia herself on-field, the teammate keeps no ATK SPD while
    // Dahlia holds her own copies; the shield gift stays.
    team.setOnFieldMember(dahlia);
    expect(finalStats(receiver).get('atk_speed')).toBe(0);
    expect(finalStats(receiver).get('shield')).toBeCloseTo(0.25, 10);
    expect(finalStats(dahlia).get('atk_speed')).toBeCloseTo(0.25, 10);

    // The saved source controls survive save/load while off-field.
    team.setOnFieldMember(receiver);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(copy.getMember(1).getSettings().dahlia_prayer_of_well_wrought_joy).toBe(true);
    expect(finalStats(copy.getMember(0)).get('atk_speed')).toBeCloseTo(0.25, 4);
});

test("Mika gifts reach affected characters on the field and follow skill level", () => {
    const mika = c6build('Mika');
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, mika);
    mika.setCharSettings({
        mika_soulwind: true,
        mika_suppressive_barrage: 5,
        mika_companions_counsel: true,
    });

    expect(finalStats(receiver).get('atk_speed_normal')).toBeCloseTo(0.25, 10);
    expect(finalStats(receiver).get('dmg_phys')).toBeCloseTo(0.5, 10);
    expect(finalStats(receiver).get('crit_dmg_phys')).toBeCloseTo(0.6, 10);

    // Live talent scaling: lowering his skill level lowers the delivery.
    mika.setCharSkills({attack: 10, elemental: 1, burst: 10});
    expect(finalStats(receiver).get('atk_speed_normal')).toBeLessThan(0.25);
    mika.setCharSkills({attack: 10, elemental: 10, burst: 10});
    expect(finalStats(receiver).get('atk_speed_normal')).toBeCloseTo(0.25, 10);

    // With Mika himself on-field, the off-field teammate keeps nothing
    // while Mika holds his own copies.
    team.setOnFieldMember(mika);
    expect(finalStats(receiver).get('atk_speed_normal')).toBe(0);
    expect(finalStats(receiver).get('dmg_phys')).toBe(0);
    expect(finalStats(receiver).get('crit_dmg_phys')).toBe(0);
    expect(finalStats(mika).get('atk_speed_normal')).toBeCloseTo(0.25, 10);
    expect(finalStats(mika).get('dmg_phys')).toBeCloseTo(0.5, 10);

    // The saved source controls survive save/load while off-field.
    team.setOnFieldMember(receiver);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(copy.getMember(1).getSettings().mika_suppressive_barrage).toBe(5);
    expect(finalStats(copy.getMember(0)).get('atk_speed_normal')).toBeCloseTo(0.25, 10);
    expect(finalStats(copy.getMember(0)).get('dmg_phys')).toBeCloseTo(0.5, 10);
});

test("Mika Detector cap follows ascension and constellation on both copies", () => {
    const mika = makeBuild('Mika');
    mika.setCharLevels({level: 90, ascension: 1, constellation: 0});
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, mika);
    mika.setCharSettings({
        mika_soulwind: true,
        mika_suppressive_barrage: 5,
    });

    // Five stacks set, but the cap is 3 without A4/C6: both copies agree.
    expect(finalStats(receiver).get('dmg_phys')).toBeCloseTo(0.3, 10);
    expect(finalStats(mika).get('dmg_phys')).toBeCloseTo(0.3, 10);
});
