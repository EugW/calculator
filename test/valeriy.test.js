import { BuildData } from "../src/js/classes/Build/Data";
import { FeatureDamageSkill } from "../src/js/classes/Feature2/Damage/Skill";
import { FeatureDamageStellarConduct } from "../src/js/classes/Feature2/Damage/StellarConduct";
import { FeatureMultiplier } from "../src/js/classes/Feature2/Multiplier";
import { StatTable } from "../src/js/classes/StatTable";
import { Valeriy } from "../src/js/db/Char/Valeriy";
import { DB } from "../src/js/db/DB";
import { charTalentTables } from "../src/js/db/generated/CharTalentTables";

function applyConditions(data, conditions) {
    for (const condition of conditions) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }
}

function localConditions(constellation = 0) {
    return Valeriy.getConditions().concat(Valeriy.constellation.getConditions(constellation));
}

function getFeature(name) {
    return Valeriy.getFeatures().find((feature) => feature.getName() === name);
}

function makeData(settings = {}, stats = {}) {
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_electro: 0,
        enemy_res_phys: 0,
        char_skill_attack: 1,
        char_skill_elemental: 1,
        char_skill_burst: 1,
        ...settings,
    }, {
        atk_base: 1000,
        ...stats,
    });
    data.multipliers = Valeriy.getMultipliers();
    return data;
}

function getDamage(name, settings = {}, stats = {}) {
    return getFeature(name).getResult(makeData(settings, stats))[name];
}

function stellarConductProbe() {
    return new FeatureDamageStellarConduct({
        category: "skill",
        element: "electro",
        multipliers: [
            new FeatureMultiplier({
                values: new StatTable("stellarconduct_test_hit", [100]),
            }),
        ],
    });
}

function electroSkillProbe() {
    return new FeatureDamageSkill({
        element: "electro",
        multipliers: [
            new FeatureMultiplier({
                values: new StatTable("electro_test_hit", [100]),
            }),
        ],
    });
}

const directive = {
    char_ascension: 4,
    valeriy_offensive_directive: 15,
    valeriy_impact_momentum: 40,
};

test("Valeriy is character 130 and is available by default", () => {
    expect(DB.Chars.get("Valeriy")).toBe(Valeriy);
    expect(DB.Chars.getById(130)).toBe(Valeriy);
    expect(DB.Chars.getByGameId(10000137)).toBe(Valeriy);
    expect(DB.Chars.getKeys()).toContain("Valeriy");
    expect(Valeriy.getId()).toBe(130);
    expect(Valeriy.rarity).toBe(4);
    expect(Valeriy.element).toBe("electro");
    expect(Valeriy.weapon).toBe("sword");
});

test("generated tables keep Mortar, Offensive Directive, shield and Thunderburst rows", () => {
    expect(charTalentTables.Valeriy.s1_id).toBe(30601);
    expect(charTalentTables.Valeriy.s2_id).toBe(30602);
    expect(charTalentTables.Valeriy.s3_id).toBe(30605);
    expect(charTalentTables.Valeriy.s1.p5[0]).toBe(229.2);
    expect(charTalentTables.Valeriy.s1.p7[0]).toBe(24.32);
    expect(charTalentTables.Valeriy.s1.p8[0]).toBe(72.96);
    expect(charTalentTables.Valeriy.s1.p9).toEqual([15]);
    expect(charTalentTables.Valeriy.s2.p2[0]).toBe(208.896);
    expect(charTalentTables.Valeriy.s2.p3[0]).toBe(1309.6384);
    expect(charTalentTables.Valeriy.s3.p2[0]).toBe(31.52);
});

test("Offensive Directive adds ATK-based Electro DMG with the A4 Momentum bonus outside Radiance", () => {
    const mortar = getDamage("attack.valeriy_direct_fire_mortar", directive);
    expect(mortar.normal).toBeCloseTo((2.292 + 0.2432 + 0.003 * 40) * 1000 * 0.5, 5);

    const skill = getDamage("skill.skill_dmg", {...directive, valeriy_impact_momentum: 100});
    expect(skill.normal).toBeCloseTo((1.66 + 0.2432 + 0.003 * 100) * 1000 * 0.5, 5);

    // Physical Normal Attacks are not Electro DMG.
    const physical = getDamage("attack.normal_hit_1", directive);
    expect(physical.normal).toBeCloseTo(charTalentTables.Valeriy.s1.p1[0] / 100 * 1000 * 0.5, 5);

    // Without A4 only the talent value remains.
    const noA4 = getDamage("attack.valeriy_direct_fire_mortar", {...directive, char_ascension: 0});
    expect(noA4.normal).toBeCloseTo((2.292 + 0.2432) * 1000 * 0.5, 5);

    const noStacks = getDamage("attack.valeriy_direct_fire_mortar", {char_ascension: 4});
    expect(noStacks.normal).toBeCloseTo(2.292 * 1000 * 0.5, 5);
});

test("Radiance: Stellar-Conduct moves Offensive Directive to flat Stellar-Conduct DMG", () => {
    const radiance = {
        ...directive,
        polestar_field: true,
        valeriy_radiance_stellarconduct: true,
        valeriy_impact_momentum: 100,
    };
    const skill = getDamage("skill.skill_dmg", radiance);
    expect(skill.normal).toBeCloseTo(1.66 * 1000 * 0.5, 5);

    const probe = stellarConductProbe();
    const result = probe.getResult(makeData(radiance))["skill.stellarconduct_test_hit"];
    expect(result.normal).toBeCloseTo(1000 + (0.7296 + 0.009 * 100) * 1000, 5);

    const outside = probe.getResult(makeData(directive))["skill.stellarconduct_test_hit"];
    expect(outside.normal).toBeCloseTo(1000, 5);
});

test("Impact Momentum is clamped to 40-100 and C4 raises the limit to 130", () => {
    const data = makeData({valeriy_impact_momentum: 200});
    applyConditions(data, localConditions(0));
    expect(data.settings.valeriy_impact_momentum).toBe(100);

    const c4 = makeData({char_constellation: 4, valeriy_impact_momentum: 200});
    applyConditions(c4, localConditions(4));
    expect(c4.settings.valeriy_impact_momentum).toBe(130);

    const low = makeData({valeriy_impact_momentum: 10});
    applyConditions(low, localConditions(0));
    expect(low.settings.valeriy_impact_momentum).toBe(40);
});

test("Supercharged Shield scales with ATK and C2 converts excess Momentum into absorption", () => {
    const shield = getFeature("skill.shield");
    expect(shield.getElement()).toBe("electro");

    const base = shield.getResult(makeData())["skill.shield"];
    expect(base.normal).toBeCloseTo(2.08896 * 1000 + 1309.6384, 3);

    const c2 = shield.getResult(makeData({
        char_constellation: 2,
        valeriy_c2_excess_momentum: 20,
    }))["skill.shield"];
    expect(c2.normal).toBeCloseTo(2.08896 * 1000 + 1309.6384 + 0.08 * 20 * 1000, 3);
});

test("C2 grants EM and C6 doubles Mortar and Thunderburst Shell DMG with Electro CRIT buffs", () => {
    const c2 = makeData({char_constellation: 2, valeriy_ranks_that_charge_as_one: true});
    applyConditions(c2, localConditions(2));
    expect(c2.stats.get("mastery")).toBe(100);

    const c6 = makeData({char_constellation: 6, valeriy_the_strength_to_breach_enemy_lines: true});
    applyConditions(c6, localConditions(6));
    expect(c6.stats.get("dmg_valeriy_breach")).toBe(100);
    expect(c6.stats.get("crit_rate_electro")).toBe(10);
    expect(c6.stats.get("crit_dmg_electro_stellarconduct")).toBe(40);
    expect(c6.settings.char_skill_attack_bonus).toBe(3);
    c6.stats.processPercent();

    // C3 raises Guard Tactics to level 4; C5 only raises the Elemental Skill.
    const mortarLevel4 = charTalentTables.Valeriy.s1.p5[3] / 100;
    const mortar = getFeature("attack.valeriy_direct_fire_mortar").getResult(c6)["attack.valeriy_direct_fire_mortar"];
    expect(mortar.normal).toBeCloseTo(mortarLevel4 * 1000 * 2 * 0.5, 5);
    const shell = getFeature("burst.valeriy_thunderburst_shell").getResult(c6)["burst.valeriy_thunderburst_shell"];
    expect(shell.normal).toBeCloseTo(0.3152 * 1000 * 2 * 0.5, 5);
    const burst = getFeature("burst.burst_dmg").getResult(c6)["burst.burst_dmg"];
    expect(burst.normal).toBeCloseTo(1.3512 * 1000 * 0.5, 5);
});

test("party Valeriy shares Offensive Directive from his ATK and Normal Attack level", () => {
    const base = {
        enemy_res_electro: 0,
        valeriy_char_skill_attack: 1,
        "party.valeriy_offensive_directive": 15,
        "party.valeriy_impact_momentum": 100,
    };
    const electro = new BuildData(base, {atk_base: 1000, valeriy_atk_total: 2000});
    electro.multipliers = Valeriy.getPartyMultipliers();
    // Ordinary Electro DMG keeps its DEF multiplier; the flat bonus is added to its base.
    const ordinary = electroSkillProbe().getResult(electro)["skill.electro_test_hit"];
    expect(ordinary.normal).toBeCloseTo((1000 + (0.2432 + 0.003 * 100) * 2000) * 0.5, 5);

    const radiance = new BuildData({
        ...base,
        polestar_field: true,
        "party.valeriy_radiance_stellarconduct": true,
    }, {atk_base: 1000, valeriy_atk_total: 2000});
    radiance.multipliers = Valeriy.getPartyMultipliers();
    const stellar = stellarConductProbe().getResult(radiance)["skill.stellarconduct_test_hit"];
    expect(stellar.normal).toBeCloseTo(1000 + (0.7296 + 0.009 * 100) * 2000, 5);
    expect(electroSkillProbe().getResult(radiance)["skill.electro_test_hit"].normal).toBeCloseTo(1000 * 0.5, 5);

    // C3 raises the shared talent value through the party level bonus.
    const c3 = new BuildData({
        ...base,
        "party.valeriy_constellation_3": true,
    }, {atk_base: 1000, valeriy_atk_total: 2000});
    applyConditions(c3, Valeriy.getPartyConditions());
    c3.multipliers = Valeriy.getPartyMultipliers();
    const level4 = charTalentTables.Valeriy.s1.p7[3] / 100;
    expect(electroSkillProbe().getResult(c3)["skill.electro_test_hit"].normal)
        .toBeCloseTo((1000 + (level4 + 0.003 * 100) * 2000) * 0.5, 5);
});

test("party C2 and C6 toggles grant EM and Electro CRIT buffs", () => {
    const data = new BuildData({
        "party.valeriy_ranks_that_charge_as_one": true,
        "party.valeriy_the_strength_to_breach_enemy_lines": true,
    }, {});
    applyConditions(data, Valeriy.getPartyConditions());
    expect(data.stats.get("mastery")).toBe(100);
    expect(data.stats.get("crit_rate_electro")).toBe(10);
    expect(data.stats.get("crit_dmg_electro_stellarconduct")).toBe(40);
});
