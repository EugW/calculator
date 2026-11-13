import fs from "fs";
import path from "path";
import { BuildData } from "../src/js/classes/Build/Data";
import { CalcSet } from "../src/js/classes/CalcSet";
import { Team } from "../src/js/classes/Team";
import { FeatureDamageStellarSwirl } from "../src/js/classes/Feature2/Damage/StellarSwirl";
import { Vodyanitsa } from "../src/js/db/Char/Vodyanitsa";
import { DB } from "../src/js/db/DB";
import { Rotation } from "../src/js/db/Features/Rotation";
import { Reactions } from "../src/js/db/Features/Reactions";
import { charTalentTables } from "../src/js/db/generated/CharTalentTables";
import { finalStats, makeBuild, enemyChange } from "./support/team";

global.DB = DB;

function makeTeamBuild(charName, carrierSettings = {}, constellation = 2) {
    const receiver = makeBuild(charName);
    const carrier = makeBuild('Vodyanitsa');
    carrier.setCharLevels({level: 90, ascension: 6, constellation});
    const team = Team.fromMember(receiver);
    team.setMember(1, carrier);
    carrier.setCharSettings({
        vodyanitsa_song_of_ages_past: true,
        ...carrierSettings,
    });
    return {team, receiver, carrier};
}

function getFeature(name) {
    return Vodyanitsa.getFeatures().find((feature) => feature.getName() === name);
}

function getCondition(name) {
    return Vodyanitsa.getAllConditions().find((condition) => condition.getName() === name);
}

function applyConditions(data, conditions) {
    for (const condition of conditions) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }
}

test("Vodyanitsa is character 127 and is available by default", () => {
    expect(DB.Chars.get("Vodyanitsa")).toBe(Vodyanitsa);
    expect(DB.Chars.getById(127)).toBe(Vodyanitsa);
    expect(DB.Chars.getByGameId(10000140)).toBe(Vodyanitsa);
    expect(DB.Chars.getKeys()).toContain("Vodyanitsa");
    expect(DB.Chars.getKeys(true)).toContain("Vodyanitsa");
    expect(Vodyanitsa.getId()).toBe(127);
    expect(Vodyanitsa.getGameId()).toEqual([10000140]);
    const ids = DB.Chars.getKeys(true).map((key) => DB.Chars.get(key).getId());
    expect(new Set(ids).size).toBe(ids.length);
});

test("generated rows preserve Vodyanitsa's HP kit and skill timing", () => {
    expect(charTalentTables.Vodyanitsa.s1_id).toBe(11401);
    expect(charTalentTables.Vodyanitsa.s2_id).toBe(11402);
    expect(charTalentTables.Vodyanitsa.s3_id).toBe(11405);
    expect(charTalentTables.Vodyanitsa.s2.p2).toEqual([16]);
    expect(charTalentTables.Vodyanitsa.s2.p3).toEqual([3]);
    expect(charTalentTables.Vodyanitsa.s2.p7).toEqual([1.5]);
    expect(charTalentTables.Vodyanitsa.s3.p2[0]).toBe(48);
    expect(charTalentTables.Vodyanitsa.s3.p3).toEqual([15]);
    expect(charTalentTables.Vodyanitsa.s3.p4).toEqual([60]);

    const hpAscension = Vodyanitsa.statTable.find((table) => table.getName() === "hp_percent");
    expect(hpAscension.getValue(90, 6)).toBeCloseTo(28.8, 5);
});

test("Horn hits, healing, RES shred, and Burst resonance use source values", () => {
    const damageData = new BuildData({
        char_level: 90,
        enemy_level: 90,
        char_skill_elemental: 10,
        char_skill_burst: 1,
    }, {
        hp_base: 50000,
    });

    const initial = getFeature("skill.vodyanitsa_sonorous_dawn_initial_dmg")
        .getResult(damageData)["skill.vodyanitsa_sonorous_dawn_initial_dmg"];
    const horn = getFeature("skill.vodyanitsa_horn_of_springs_call_dmg")
        .getResult(damageData)["skill.vodyanitsa_horn_of_springs_call_dmg"];
    const heal = getFeature("skill.vodyanitsa_song_of_ages_past_heal")
        .getResult(damageData)["skill.vodyanitsa_song_of_ages_past_heal"];

    expect(initial.normal).toBeCloseTo(50000 * 0.058896 * 0.5, 5);
    expect(horn.normal).toBeCloseTo(initial.normal, 5);
    expect(heal.normal).toBeCloseTo(50000 * 0.0504 + 593.2278, 5);

    const skillState = getCondition("vodyanitsa_song_of_ages_past");
    const shred = skillState.getData({
        char_skill_elemental: 10,
        vodyanitsa_song_of_ages_past: true,
    }).stats;
    expect(shred.get("enemy_res_hydro")).toBe(-30);
    expect(shred.get("enemy_res_cryo")).toBe(-30);

    const burst = getFeature("burst.vodyanitsa_sink_with_thee_dmg");
    const withoutState = burst.getResult(damageData)["burst.vodyanitsa_sink_with_thee_dmg"];
    const withState = burst.getResult(new BuildData({
        char_level: 90,
        enemy_level: 90,
        char_skill_burst: 1,
        vodyanitsa_song_of_ages_past: true,
    }, {
        hp_base: 50000,
    }))["burst.vodyanitsa_sink_with_thee_dmg"];

    expect(withoutState.normal).toBeCloseTo(50000 * 0.456768 * 0.5, 5);
    expect(withState.normal).toBeCloseTo(withoutState.normal * 1.48, 5);
});

test("A1's 6-second Anemo shred window can outlast Song of Ages Past", () => {
    const mutant = getCondition("vodyanitsa_wandering_vortex");

    expect(mutant.getData({
        char_ascension: 1,
        vodyanitsa_wandering_vortex: true,
    }).stats.get("enemy_res_anemo")).toBe(-35);
    expect(mutant.getData({
        char_ascension: 1,
        vodyanitsa_song_of_ages_past: true,
        vodyanitsa_wandering_vortex: true,
    }).stats.get("enemy_res_anemo")).toBe(-35);
});

test("A4 Solo switches from capped Hydro/Cryo flat damage to Stellar Swirl flat damage", () => {
    const normal = getFeature("attack.normal_hit_1");
    const directData = new BuildData({
        char_level: 90,
        enemy_level: 90,
        char_skill_attack: 1,
        char_ascension: 4,
        vodyanitsa_song_of_ages_past: true,
        vodyanitsa_lead_vocal: 25,
    }, {
        atk_base: 1000,
        hp_base: 100000,
    });
    directData.multipliers = Vodyanitsa.getMultipliers();

    const direct = normal.getResult(directData)["attack.normal_hit_1"];
    const directBase = charTalentTables.Vodyanitsa.s1.p1[0] / 100 * 1000;
    expect(direct.normal).toBeCloseTo((directBase + 3500) * 0.5, 5);

    const staleSolo = new BuildData({
        char_level: 90,
        enemy_level: 90,
        char_skill_attack: 1,
        char_ascension: 4,
        vodyanitsa_lead_vocal: 25,
    }, {
        atk_base: 1000,
        hp_base: 100000,
    });
    staleSolo.multipliers = Vodyanitsa.getMultipliers();
    expect(normal.getResult(staleSolo)["attack.normal_hit_1"].normal)
        .toBeCloseTo((directBase + 3500) * 0.5, 5);
    staleSolo.settings.vodyanitsa_lead_vocal = 0;
    expect(normal.getResult(staleSolo)["attack.normal_hit_1"].normal)
        .toBeCloseTo(directBase * 0.5, 5);

    const stellarFeature = new FeatureDamageStellarSwirl({
        category: 'reaction',
        name: 'vodyanitsa_a4_test',
        element: 'anemo',
        tags: ['stellarswirl_immediate'],
    });
    const stellarData = new BuildData({
        char_ascension: 4,
        vodyanitsa_song_of_ages_past: true,
        vodyanitsa_wandering_vortex: true,
        vodyanitsa_lead_vocal: 25,
    }, {
        enemy__res_anemo: 0.1,
        hp_base: 100000,
        crit_rate_base: 1,
        crit_dmg_base: 0.5,
        dmg_stellarswirl_special: 0.25,
    });
    stellarData.multipliers = Vodyanitsa.getMultipliers();

    const stellar = stellarFeature.getResult(stellarData)["reaction.vodyanitsa_a4_test"];
    const stellarBase = stellarFeature.getResult(new BuildData({}, {
        enemy__res_anemo: 0.1,
        crit_rate_base: 1,
        crit_dmg_base: 0.5,
        dmg_stellarswirl_special: 0.25,
    }))["reaction.vodyanitsa_a4_test"];
    const stellarFlatAfterResAndElevation = 6500 * 0.9 * 1.25;
    expect(stellar.normal - stellarBase.normal).toBeCloseTo(stellarFlatAfterResAndElevation, 5);
    expect(stellar.crit - stellarBase.crit).toBeCloseTo(stellarFlatAfterResAndElevation * 1.5, 5);

    const directAfterMutantData = new BuildData({
        char_level: 90,
        enemy_level: 90,
        char_skill_attack: 1,
        char_ascension: 4,
        vodyanitsa_song_of_ages_past: true,
        vodyanitsa_wandering_vortex: true,
        vodyanitsa_lead_vocal: 25,
    }, {
        atk_base: 1000,
        hp_base: 100000,
    });
    directAfterMutantData.multipliers = Vodyanitsa.getMultipliers();
    const directAfterMutant = normal.getResult(directAfterMutantData)["attack.normal_hit_1"];
    expect(directAfterMutant.normal).toBeCloseTo(directBase * 0.5, 5);
});

test("Lead Vocal uses Vodyanitsa HP and switches to Stellar mode", () => {
    const normal = getFeature("attack.normal_hit_1");
    const directData = new BuildData({
        char_level: 90,
        enemy_level: 90,
        char_skill_attack: 1,
        char_ascension: 4,
        vodyanitsa_lead_vocal: 25,
    }, {
        hp_base: 100000,
    });
    directData.multipliers = Vodyanitsa.getMultipliers();
    expect(normal.getResult(directData)["attack.normal_hit_1"].normal).toBeCloseTo(1750, 5);

    const stellarFeature = new FeatureDamageStellarSwirl({
        category: 'reaction',
        name: 'vodyanitsa_lead_a4_test',
        element: 'anemo',
        tags: ['stellarswirl_immediate'],
    });
    const stellarData = new BuildData({
        char_ascension: 4,
        vodyanitsa_wandering_vortex: true,
        vodyanitsa_lead_vocal: 25,
    }, {
        hp_base: 100000,
    });
    stellarData.multipliers = Vodyanitsa.getMultipliers();
    const stellar = stellarFeature.getResult(stellarData)["reaction.vodyanitsa_lead_a4_test"];
    const stellarBase = stellarFeature.getResult(new BuildData({
    }, {}))["reaction.vodyanitsa_lead_a4_test"];
    expect(stellar.normal - stellarBase.normal).toBeCloseTo(6500, 5);

    expect(getCondition("vodyanitsa_lead_vocal").getMaxStacks({})).toBe(25);
    expect(getCondition("vodyanitsa_chorus").getMaxStacks({})).toBe(10);
});

test("C1 derives flat ATK from Vodyanitsa HP for self and team", () => {
    const local = new BuildData({
        char_constellation: 1,
        vodyanitsa_c1_healing: true,
    }, {
        hp_base: 50000,
    });
    local.postEffects = Vodyanitsa.getPostEffects();
    local.applyPostEffects();
    expect(local.stats.get("atk")).toBeCloseTo(400, 5);

    // The retired party row is now a real team: C1 ATK from her own HP total.
    const {receiver, carrier} = makeTeamBuild('Barbara', {vodyanitsa_c1_healing: true}, 1);
    const carrierStageZero = carrier.getBuildData().stats;
    const carrierHp = carrierStageZero.get('hp_base') * (1 + carrierStageZero.get('hp_percent')) +
        carrierStageZero.get('hp');
    carrier.modifyBuffsSettings({'custom_buffs.hp': 50000 - carrierHp});
    expect(finalStats(receiver).get("atk")).toBeCloseTo(400, 5);
});

test("C2 selects Hydro/Cryo CRIT DMG or Stellar Swirl CRIT DMG", () => {
    const stale = new BuildData({
        vodyanitsa_c2_horn_hit: false,
    }, {});
    applyConditions(stale, Vodyanitsa.constellation.getConditions(2));
    expect(stale.stats.get("crit_dmg_hydro")).toBe(0);
    expect(stale.stats.get("crit_dmg_stellarswirl")).toBe(0);

    const normal = new BuildData({
        vodyanitsa_song_of_ages_past: true,
        vodyanitsa_c2_horn_hit: true,
    }, {});
    applyConditions(normal, Vodyanitsa.constellation.getConditions(2));
    expect(normal.stats.get("crit_dmg_hydro")).toBe(50);
    expect(normal.stats.get("crit_dmg_cryo")).toBe(50);
    expect(normal.stats.get("crit_dmg_stellarswirl")).toBe(0);

    const mutant = new BuildData({
        vodyanitsa_song_of_ages_past: true,
        vodyanitsa_wandering_vortex: true,
        vodyanitsa_c2_horn_hit: true,
    }, {});
    applyConditions(mutant, Vodyanitsa.constellation.getConditions(2));
    expect(mutant.stats.get("crit_dmg_hydro")).toBe(0);
    expect(mutant.stats.get("crit_dmg_cryo")).toBe(0);
    expect(mutant.stats.get("crit_dmg_stellarswirl")).toBe(60);
    expect(mutant.stats.get("dmg_stellarswirl")).toBe(0);

    // The retired party row is now a real team: the on-field receiver gets
    // the Stellar Swirl share from the source state.
    const {receiver} = makeTeamBuild('Barbara', {
        vodyanitsa_wandering_vortex: true,
        vodyanitsa_c2_horn_hit: true,
    }, 2);
    expect(finalStats(receiver).get("crit_dmg_stellarswirl")).toBeCloseTo(0.6, 10);
    expect(finalStats(receiver).get("dmg_stellarswirl")).toBe(0);
    expect(finalStats(receiver).get("crit_dmg_hydro")).toBe(0);
});

test.each([
    ["Barbara", "attack.normal_hit_1", 0.5],
    ["Chongyun", "skill.skill_dmg", 0.5],
    ["Chongyun", "attack.normal_hit_1", 0],
    ["Diluc", "skill.skill_hit_1", 0],
])("C2 applies element-specific CRIT DMG to %s %s", (charName, featureName, bonus) => {
    const {receiver, carrier} = makeTeamBuild(charName, {}, 2);
    const feature = DB.Chars.get(charName).getFeatures()
        .find((item) => item.getName() === featureName);
    const baseline = feature.getResult(receiver.getBuildData())[featureName];

    carrier.setCharSettings({
        vodyanitsa_song_of_ages_past: true,
        vodyanitsa_c2_horn_hit: true,
    });
    const data = receiver.getBuildData();
    const buffed = feature.getResult(data)[featureName];

    expect(data.stats.get("crit_dmg_hydro")).toBe(0.5);
    expect(data.stats.get("crit_dmg_cryo")).toBe(0.5);
    expect(buffed.normal).toBeGreaterThan(0);
    expect(buffed.normal).toBeCloseTo(baseline.normal, 5);
    expect(buffed.crit - baseline.crit).toBeCloseTo(baseline.normal * bonus, 5);

    carrier.setCharSettings({
        vodyanitsa_song_of_ages_past: true,
        vodyanitsa_wandering_vortex: true,
        vodyanitsa_c2_horn_hit: true,
    });
    expect(feature.getResult(receiver.getBuildData())[featureName].crit)
        .toBeCloseTo(baseline.crit, 5);

    carrier.setCharSettings({
        vodyanitsa_song_of_ages_past: false,
        vodyanitsa_wandering_vortex: false,
        vodyanitsa_c2_horn_hit: true,
    });
    expect(receiver.getBuildData().stats.get("crit_dmg_hydro")).toBe(0.5);
    carrier.setCharSettings({vodyanitsa_c2_horn_hit: false});
    const inactive = receiver.getBuildData();
    expect(inactive.stats.get("crit_dmg_hydro")).toBe(0);
    expect(inactive.stats.get("crit_dmg_cryo")).toBe(0);
    expect(inactive.stats.get("crit_dmg_stellarswirl")).toBe(0);
});

test("C2 increases Stellar Swirl critical hits without increasing noncritical damage", () => {
    const {receiver, carrier} = makeTeamBuild('Sucrose', {vodyanitsa_wandering_vortex: true}, 2);
    receiver.setCharSettings({allowed_stellarswirl: true});
    const feature = Reactions.find((item) => item.name === "stellarswirl_anemo_contribution");
    const baseline = feature.getResult(receiver.getBuildData())[feature.getName()];

    carrier.setCharSettings({
        vodyanitsa_song_of_ages_past: true,
        vodyanitsa_wandering_vortex: true,
        vodyanitsa_c2_horn_hit: true,
    });
    const buffed = feature.getResult(receiver.getBuildData())[feature.getName()];
    expect(baseline.normal).toBeGreaterThan(0);
    expect(buffed.normal).toBeCloseTo(baseline.normal, 5);
    expect(buffed.crit - baseline.crit).toBeCloseTo(baseline.normal * 0.6, 5);
});

test.each([1, 10])("C3 adds three levels to Vodyanitsa's level %i Skill RES shred and survives reload", (level) => {
    const receiver = makeBuild("Barbara");
    const carrier = makeBuild('Vodyanitsa');
    carrier.setCharLevels({level: 90, ascension: 6, constellation: 2});
    carrier.setCharSkills({attack: 1, elemental: level, burst: 1});
    const team = Team.fromMember(receiver);
    team.setMember(1, carrier);
    carrier.setCharSettings({vodyanitsa_song_of_ages_past: true});
    expect(enemyChange(receiver, "enemy_res_hydro"))
        .toBeCloseTo(-charTalentTables.Vodyanitsa.s2.p8[level - 1] / 100, 5);

    carrier.setCharLevels({level: 90, ascension: 6, constellation: 3});
    expect(carrier.getBuildData().settings.getLevel("char_skill_elemental")).toBe(level + 3);
    for (const element of ["hydro", "cryo"]) {
        expect(enemyChange(receiver, "enemy_res_" + element))
            .toBeCloseTo(-charTalentTables.Vodyanitsa.s2.p8[level + 2] / 100, 5);
    }

    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(enemyChange(copy.getMember(0), "enemy_res_hydro"))
        .toBeCloseTo(enemyChange(receiver, "enemy_res_hydro"), 5);
    expect(copy.getMember(1).getSettings()["vodyanitsa_song_of_ages_past"]).toBeTruthy();

    carrier.setCharSettings({vodyanitsa_song_of_ages_past: false});
    expect(enemyChange(receiver, "enemy_res_hydro")).toBe(0);
});

test("self C3 RES reduction uses the raised Skill level on the first calculation", () => {
    const build = new CalcSet();
    build.setChar(Vodyanitsa);
    Team.fromMember(build);
    build.setCharLevels({level: 90, ascension: 6, constellation: 3});
    build.setCharSkills({attack: 1, elemental: 10, burst: 1});
    build.setCharSettings({vodyanitsa_song_of_ages_past: true});
    const data = build.getBuildData();
    expect(data.settings.getLevel("char_skill_elemental")).toBe(13);
    expect(enemyChange(build, "enemy_res_hydro", data.stats)).toBeCloseTo(-charTalentTables.Vodyanitsa.s2.p8[12] / 100, 5);
    expect(enemyChange(build, "enemy_res_cryo", data.stats)).toBeCloseTo(enemyChange(build, "enemy_res_hydro", data.stats), 5);
});

test("C4 models its low-HP healing branch and three independent HP stacks", () => {
    expect(getCondition("vodyanitsa_c4_target_below_40").params.description)
        .toBe("talent_descr.vodyanitsa_melancholic_voice_upon_the_gentle_waters_1");
    expect(getCondition("vodyanitsa_c4_hp_stacks").params.description)
        .toBe("talent_descr.vodyanitsa_melancholic_voice_upon_the_gentle_waters_2");
    const data = new BuildData({
        char_constellation: 4,
        vodyanitsa_c4_target_below_40: true,
        vodyanitsa_c4_hp_stacks: 4,
    }, {});
    applyConditions(data, Vodyanitsa.constellation.getConditions(4));

    expect(data.stats.get("healing")).toBe(0);
    expect(data.stats.get("text_percent_healing")).toBe(50);
    expect(data.stats.get("hp_percent")).toBe(60);
    expect(data.settings.vodyanitsa_c4_hp_stacks).toBe(3);
});

test("C4 multiplies both parts of Skill healing alongside existing Healing Bonus", () => {
    const feature = getFeature("skill.vodyanitsa_song_of_ages_past_heal");
    const data = new BuildData({char_constellation: 4, char_skill_elemental: 10}, {
        hp_base: 50000,
        healing: 0.4,
        healing_recv: 0.2,
    });
    const baseline = feature.getResult(data)[feature.getName()].normal;
    data.settings.vodyanitsa_c4_target_below_40 = true;
    expect(feature.getResult(data)[feature.getName()].normal).toBeCloseTo(baseline * 1.5, 5);
    data.settings.char_constellation = 3;
    expect(feature.getResult(data)[feature.getName()].normal).toBeCloseTo(baseline, 5);
});

test("removed recipient control stays hidden and does not override C2", () => {
    const data = new BuildData({
        vodyanitsa_off_field: true,
        vodyanitsa_c2_horn_hit: true,
        char_constellation: 2,
    }, {});
    applyConditions(data, Vodyanitsa.constellation.getConditions(2));
    expect(data.stats.get("crit_dmg_hydro")).toBe(50);
    expect(getCondition("vodyanitsa_off_field").isHidden(data.settings)).toBe(true);
    // The retired party ID decodes but contributes nothing on its own.
    const retired = Vodyanitsa.getLegacyPartyConditions().find((condition) => condition.getId() === 10);
    expect(retired).toBeDefined();
    expect(retired.isHidden({})).toBe(true);
    const retiredData = new BuildData({
        vodyanitsa_c2_horn_hit: true,
        char_constellation: 2,
    }, {});
    applyConditions(retiredData, Vodyanitsa.getLegacyPartyConditions());
    expect(retiredData.stats.get("crit_dmg_hydro")).toBe(0);
});

test.each([
    ["skill.vesna_windborne_sword_lv2_spirit_blade_stellar", "anemo", 1],
    ["burst.vesna_for_the_tsaritsa_stellar", "anemo", 1],
    // A member's contribution at the first rank: 60% of it, flat damage included.
    ["reaction.stellarswirl_vortex_1_contribution", "cryo", 0.6],
])("A4 adds flat damage to %s after Song of Ages Past expires", (name, element, weight) => {
    // The on-field receiver consumes Lead Vocal; Song of Ages Past stays
    // off to prove the A4 share does not need it.
    const {receiver, carrier} = makeTeamBuild('Vesna', {
        vodyanitsa_song_of_ages_past: false,
        vodyanitsa_wandering_vortex: true,
    }, 6);
    const carrierStageZero = carrier.getBuildData().stats;
    const carrierHp = carrierStageZero.get('hp_base') * (1 + carrierStageZero.get('hp_percent')) +
        carrierStageZero.get('hp');
    carrier.modifyBuffsSettings({'custom_buffs.hp': 100000 - carrierHp});
    receiver.setCharSettings({vesna_armed_for_action: true, vesna_radiance_stellarswirl: true});
    receiver.team.enemy.setResistances({[element]: 0});
    const feature = [...DB.Chars.get("Vesna").getFeatures(), ...Reactions]
        .find((item) => item.getName() === name);
    const baseline = feature.getResult(receiver.getBuildData())[name];
    carrier.setCharSettings({
        vodyanitsa_song_of_ages_past: false,
        vodyanitsa_wandering_vortex: true,
        vodyanitsa_lead_vocal: 25,
        vodyanitsa_chorus: 10,
    });
    const data = receiver.getBuildData();
    const buffed = feature.getResult(data)[name];
    const res = data.getResistance(element) / 100;
    const resMultiplier = res < 0 ? 1 - res / 2 : 1 - res;
    expect(buffed.normal - baseline.normal).toBeCloseTo(6500 * weight * resMultiplier, 5);
});

test("builds saved with the removed recipient control still load without affecting damage", () => {
    const built = makeTeamBuild("Barbara", {
        vodyanitsa_song_of_ages_past: false,
        vodyanitsa_c2_horn_hit: true,
    }, 6);
    const {team, receiver, carrier} = built;
    carrier.modifyBuffsSettings({'party.vodyanitsa_off_field': true});
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    const data = finalStats(copy.getMember(0));
    expect(data.get("crit_dmg_hydro")).toBeCloseTo(0.5, 10);
    expect(data.get("dmg_hydro")).toBe(0);
    expect(data.get("dmg_stellarswirl_special")).toBe(0);
    expect(copy.getMember(1).getSettings()['party.vodyanitsa_off_field']).toBeUndefined();
});

test("C6 adds Hydro/Cryo DMG and Stellar Swirl elevation while Song of Ages Past is active", () => {
    const local = new BuildData({
        vodyanitsa_song_of_ages_past: true,
    }, {});
    applyConditions(local, Vodyanitsa.constellation.getConditions(6));
    expect(local.stats.get("dmg_hydro")).toBe(60);
    expect(local.stats.get("dmg_cryo")).toBe(60);
    expect(local.stats.get("dmg_stellarswirl_special")).toBe(25);

    // The retired party row is now a real team: Song of Ages Past carries
    // the C6 share to the receiver, and nothing without it.
    const {receiver, carrier} = makeTeamBuild('Barbara', {}, 6);
    expect(finalStats(receiver).get("dmg_hydro")).toBeCloseTo(0.6, 10);
    expect(finalStats(receiver).get("dmg_cryo")).toBeCloseTo(0.6, 10);
    expect(finalStats(receiver).get("dmg_stellarswirl_special")).toBeCloseTo(0.25, 10);

    carrier.setCharSettings({vodyanitsa_song_of_ages_past: false});
    expect(finalStats(receiver).get("dmg_hydro")).toBe(0);
    expect(finalStats(receiver).get("dmg_stellarswirl_special")).toBe(0);
});

test("Vodyanitsa uses only its reserved 860-889 Rotation block", () => {
    const rows = Rotation.listNames()
        .filter((name) => name.includes("vodyanitsa_"))
        .map((name) => [name, Rotation.getByName(name)]);

    expect(rows).toEqual([
        ["skill.vodyanitsa_sonorous_dawn_initial_dmg", 860],
        ["skill.vodyanitsa_horn_of_springs_call_dmg", 861],
        ["skill.vodyanitsa_song_of_ages_past_heal", 862],
        ["burst.vodyanitsa_sink_with_thee_dmg", 863],
    ]);
    expect(rows.every(([, id]) => id >= 860 && id <= 889)).toBe(true);
    expect(rows.some(([, id]) => id >= 772 && id <= 859)).toBe(false);
});

test("Vodyanitsa localization is generated with only calculator text manual", () => {
    const manualStrings = fs.readFileSync(
        path.join(__dirname, "../data/strings/7.1/vodyanitsa.csv"),
        "utf8",
    );
    const generatedNames = fs.readFileSync(
        path.join(__dirname, "../data/strings/generated/char_names.csv"),
        "utf8",
    );
    const generatedSkills = fs.readFileSync(
        path.join(__dirname, "../data/strings/generated/char_skills.csv"),
        "utf8",
    );
    const generatedTalents = fs.readFileSync(
        path.join(__dirname, "../data/strings/generated/char_talents.csv"),
        "utf8",
    );
    expect(generatedNames).toContain("char_name;vodyanitsa;Водяница;Vodyanitsa");
    expect(generatedSkills).toContain("talent_name;vodyanitsa_psyshkhwe_arietta");
    expect(generatedSkills).toContain("talent_name;n11400001");
    expect(generatedSkills).toContain("talent_descr;n11400002");
    expect(generatedTalents).toContain("talent_name;vodyanitsa_the_last_djeguako_songstress");
    expect(generatedTalents).toContain("talent_name;vodyanitsa_waters_in_full_splendor");
    expect(generatedTalents).toContain("talent_descr;vodyanitsa_melancholic_voice_upon_the_gentle_waters_1");
    expect(generatedTalents).toContain("talent_descr;vodyanitsa_melancholic_voice_upon_the_gentle_waters_2");
    expect(generatedTalents).not.toContain("talent_descr;vodyanitsa_melancholic_voice_upon_the_gentle_waters;");
    expect(generatedTalents).toContain("talent_descr;vodyanitsa_neverending_song_of_revelry");

    const manualNonFeatureKeys = manualStrings.split(/\r?\n/)
        .slice(1)
        .filter(Boolean)
        .map((line) => line.split(";").slice(0, 2).join(";"))
        .filter((key) => !key.startsWith("feature_"));
    expect(manualNonFeatureKeys).toEqual([
        "talent_name;vodyanitsa_song_of_ages_past",
        "talent_descr;vodyanitsa_song_of_ages_past",
    ]);
    expect(manualStrings).toContain("feature_skill;vodyanitsa_song_of_ages_past_heal");
    expect(manualStrings).toContain("feature_burst;vodyanitsa_sink_with_thee_dmg");

});
