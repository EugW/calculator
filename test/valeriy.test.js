import { BuildData } from "../src/js/classes/Build/Data";
import { FeatureDamageSkill } from "../src/js/classes/Feature2/Damage/Skill";
import { FeatureDamageStellarConduct } from "../src/js/classes/Feature2/Damage/StellarConduct";
import { FeatureMultiplier } from "../src/js/classes/Feature2/Multiplier";
import { loadLegacyTeam } from "../src/js/classes/Legacy/Team";
import { StatTable } from "../src/js/classes/StatTable";
import { Team } from "../src/js/classes/Team";
import { Valeriy } from "../src/js/db/Char/Valeriy";
import { DB } from "../src/js/db/DB";
import { charTalentTables } from "../src/js/db/generated/CharTalentTables";
import { featureValues, finalStats, makeBuild, pinStats, totalMastery } from "./support/team";

global.DB = DB;
global.UI ||= {Lang: {get: () => ''}};

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

/**
 * Valeriy next to Keqing (Electro) on the field, his Normal Attack talent at
 * level 1 and his ATK at 2000.
 *
 * @returns {{team: Team, receiver: CalcSet, valeriy: CalcSet}}
 */
function teamWithValeriy(constellation, settings, atk = 2000) {
    const receiver = makeBuild('Keqing');
    const valeriy = makeBuild('Valeriy');
    valeriy.setCharLevels({level: 90, ascension: 6, constellation});
    valeriy.setCharSkills({attack: 1, elemental: 1, burst: 1});
    valeriy.setCharSettings(settings);
    const team = Team.fromMember(receiver);
    team.setMember(1, valeriy);
    pinStats([[valeriy, 'atk', atk]]);
    return {team, receiver, valeriy};
}

const stiletto = 'skill.keqing_skill_stiletto';
const teamDirective = {valeriy_offensive_directive: 15, valeriy_impact_momentum: 100};

/**
 * The flat DMG a hit of the receiver gains from Valeriy's controls: its
 * increase over the same team without Offensive Directive, divided by what
 * one point of the hit's base DMG is worth (its DMG bonus, DEF and RES
 * multipliers, from the hit's own talent value and the receiver's ATK).
 */
function flatBonus(constellation, settings, opts = {}) {
    const make = (controls) => {
        const result = teamWithValeriy(constellation, controls, opts.atk);
        result.team.modifySettings(opts.teamSettings || {});
        if (opts.onField) result.team.setOnFieldMember(result[opts.onField]);
        return result;
    };
    const off = make(Object.assign({}, settings, {valeriy_offensive_directive: 0}));
    const on = make(settings);
    const plain = featureValues(off.receiver)[stiletto][0];
    const base = charTalentTables.Keqing.s2.p1[9] / 100 * finalStats(off.receiver).getTotalPercent('atk');
    return (featureValues(on.receiver)[stiletto][0] - plain) / (plain / base);
}

test("Valeriy shares Offensive Directive from his ATK and Normal Attack level with the active member", () => {
    // Ordinary Electro DMG: the flat bonus is added to the hit's base.
    expect(flatBonus(0, teamDirective)).toBeCloseTo((0.2432 + 0.003 * 100) * 2000, 5);
    expect(flatBonus(0, {...teamDirective, valeriy_impact_momentum: 40})).toBeCloseTo((0.2432 + 0.003 * 40) * 2000, 5);
    // His ATK, as it is now.
    expect(flatBonus(0, teamDirective, {atk: 1000})).toBeCloseTo((0.2432 + 0.003 * 100) * 1000, 5);

    // C3 raises the shared talent value: his own Normal Attack level.
    const level4 = charTalentTables.Valeriy.s1.p7[3] / 100;
    expect(flatBonus(3, teamDirective)).toBeCloseTo((level4 + 0.003 * 100) * 2000, 5);
    // C4: 130 Impact Momentum.
    expect(flatBonus(4, {...teamDirective, valeriy_impact_momentum: 130})).toBeCloseTo((level4 + 0.003 * 130) * 2000, 5);
    expect(flatBonus(0, {...teamDirective, valeriy_impact_momentum: 130})).toBeCloseTo((0.2432 + 0.003 * 100) * 2000, 5);

    // "A nearby active character in the party": not a member off the field.
    expect(flatBonus(0, teamDirective, {onField: 'valeriy'})).toBeCloseTo(0, 8);

    // In Radiance: Stellar-Conduct the directive is for Electro DMG that is
    // considered Stellar-Conduct DMG: an ordinary Electro hit gains nothing.
    const radiance = {...teamDirective, valeriy_radiance_stellarconduct: true};
    expect(flatBonus(0, radiance, {teamSettings: {polestar_field: true}})).toBeCloseTo(0, 8);
    // The state needs the Polestar Field.
    expect(flatBonus(0, radiance)).toBeCloseTo((0.2432 + 0.003 * 100) * 2000, 5);
});

test("C2 and C6 controls grant the team EM and Electro CRIT buffs", () => {
    const controls = {
        valeriy_ranks_that_charge_as_one: true,
        valeriy_the_strength_to_breach_enemy_lines: true,
    };
    const off = teamWithValeriy(6, {});
    const on = teamWithValeriy(6, controls);
    for (const member of ['receiver', 'valeriy']) {
        const before = finalStats(off[member]);
        const after = finalStats(on[member]);
        expect(totalMastery(after) - totalMastery(before)).toBeCloseTo(100, 8);
        expect(after.get("crit_rate_electro") - before.get("crit_rate_electro")).toBeCloseTo(0.1, 10);
        expect(after.get("crit_dmg_electro_stellarconduct") - before.get("crit_dmg_electro_stellarconduct")).toBeCloseTo(0.4, 10);
    }
    // His own two hits' 100% stays his.
    expect(finalStats(on.valeriy).get("dmg_valeriy_breach")).toBeCloseTo(1, 10);
    expect(finalStats(on.receiver).get("dmg_valeriy_breach")).toBe(0);

    // The controls are his constellations'.
    const c1 = teamWithValeriy(1, controls);
    expect(totalMastery(finalStats(c1.receiver))).toBeCloseTo(totalMastery(finalStats(off.receiver)), 8);
    expect(finalStats(c1.receiver).get("crit_rate_electro")).toBe(0);
});

test("a released link's party row loads as Valeriy with the row's controls", () => {
    expect(Valeriy.partyData).toBeUndefined();
    expect(Valeriy.getLegacyPartyConditions().map((condition) => condition.getId())).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(Valeriy.getLegacyPartyConditions().every((condition) => condition.isRetired())).toBe(true);

    const load = (row) => {
        const receiver = makeBuild('Keqing');
        const team = Team.fromMember(receiver);
        const report = loadLegacyTeam(team, {
            party: [{charId: Valeriy.getId(), settings: row}],
            buffs: {},
            settings: {},
            dropped: [],
        });
        return {receiver, entry: team.legacy.getBySourceId(Valeriy.getId()), report};
    };
    const flat = (row) => {
        const typed = {valeriy_atk_total: row.valeriy_atk_total, valeriy_char_skill_attack: row.valeriy_char_skill_attack};
        const off = load(typed);
        const on = load(row);
        expect(on.report.dropped).toEqual([]);
        const plain = featureValues(off.receiver)[stiletto][0];
        const base = charTalentTables.Keqing.s2.p1[9] / 100 * finalStats(off.receiver).getTotalPercent('atk');
        return {entry: on.entry, bonus: (featureValues(on.receiver)[stiletto][0] - plain) / (plain / base)};
    };

    // The released engine's number for this row: (24.32% + 0.3% x 100) of
    // the typed 2000 ATK, at the typed talent level 1.
    const row = {
        valeriy_atk_total: 2000,
        valeriy_char_skill_attack: 1,
        "party.valeriy_offensive_directive": 15,
        "party.valeriy_impact_momentum": 100,
    };
    const loaded = flat(row);
    expect(loaded.entry.getConstellation()).toBe(0);
    expect(loaded.entry.char.getSettings().valeriy_offensive_directive).toBe(15);
    expect(loaded.bonus).toBeCloseTo((0.2432 + 0.003 * 100) * 2000, 5);

    // The row's C3 switch is his third constellation: the talent at level 4.
    const level4 = charTalentTables.Valeriy.s1.p7[3] / 100;
    const c3 = flat({...row, "party.valeriy_constellation_3": true});
    expect(c3.entry.getConstellation()).toBe(3);
    expect(c3.bonus).toBeCloseTo((level4 + 0.003 * 100) * 2000, 5);

    // More Impact Momentum than 100 means his fourth constellation, which
    // allows it, and with it the third's talent level.
    const c4 = flat({...row, "party.valeriy_impact_momentum": 130});
    expect(c4.entry.getConstellation()).toBe(4);
    expect(c4.bonus).toBeCloseTo((level4 + 0.003 * 130) * 2000, 5);
});
