import { BuildData } from "../src/js/classes/Build/Data";
import { FeatureDamageNormal } from "../src/js/classes/Feature2/Damage/Normal";
import { FeatureMultiplier } from "../src/js/classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../src/js/classes/Feature2/Multiplier/Target";
import { Nicole } from "../src/js/db/Char/Nicole";
import { StatTable } from "../src/js/classes/StatTable";
import { CalcObjectBuffs } from "../src/js/classes/CalcObject/Buffs";

function makeNormalAttackResult(settings = {}) {
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        ...settings,
    }, {
        atk_base: 1000,
        nicole_atk_total: 2000,
    });
    data.multipliers = Nicole.getPartyMultipliers();

    const feature = new FeatureDamageNormal({
        element: "phys",
        multipliers: [
            new FeatureMultiplier({
                values: new StatTable("normal_hit", [100]),
            }),
        ],
    });

    return feature.getResult(data)["attack.normal_hit"].normal;
}

function makeNicolePartyData(settings = {}) {
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        nicole_char_skill_elemental: 1,
        ...settings,
    }, {
        nicole_atk_total: 1000,
    });

    for (const condition of Nicole.getPartyConditions()) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }

    return data;
}

function getGraceAtkBonus(settings = {}) {
    const data = makeNicolePartyData({
        "party.nicole_grace_of_kenosis": "grace",
        ...settings,
    });
    data.postEffects = Nicole.getPartyPostEffects();
    data.applyPostEffects();

    return data.stats.get("atk");
}

function getNicoleFeature(name, features = Nicole.getFeatures()) {
    return features.find((feature) => {
        return feature.getName() === name;
    });
}

test("Nicole C4 party Pathfinder's Blessing adds 70% of Nicole's ATK to eligible base damage", () => {
    const withoutBlessing = makeNormalAttackResult({
        "party.nicole_grace_of_kenosis": "guidance",
    });

    const withBlessing = makeNormalAttackResult({
        "party.nicole_grace_of_kenosis": "guidance",
        "party.nicole_whether_left_or_right_no_matter_which_way_you_turn": true,
    });

    expect(withoutBlessing).toBeCloseTo(500, 5);
    expect(withBlessing).toBeCloseTo(1200, 5);
});

test("Nicole C3 party switch raises Grace of Kenosis skill-level scaling", () => {
    const withoutC3 = getGraceAtkBonus();
    const withC3 = getGraceAtkBonus({
        "party.nicole_you_will_hear_my_voice_beside_you": true,
    });

    expect(withoutC3).toBeCloseTo(82.5, 5);
    expect(withC3).toBeCloseTo(105, 5);
});

test("Nicole Arcane Projection uses generic and elemental damage bonuses, but not attack-type bonuses or reactions", () => {
    const feature = getNicoleFeature("other.nicole_arcane_projection");
    const unityFeature = getNicoleFeature("other.nicole_arcane_projection_unity");
    const baseData = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_pyro: 0,
        char_element: "pyro",
        char_skill_burst: 1,
        char_constellation: 1,
    }, {
        atk_base: 1000,
    });

    const buffedData = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_pyro: 0,
        char_element: "pyro",
        char_skill_burst: 1,
        char_constellation: 1,
        reaction: "vaporize",
    }, {
        atk_base: 1000,
        dmg_all: 0.1,
        dmg_pyro: 0.1,
        dmg_burst: 10,
        dmg_normal: 10,
    });
    buffedData.multipliers = [
        new FeatureMultiplier({
            values: new StatTable("fake_global_base_buff", [1000]),
        }),
        new FeatureMultiplier({
            values: new StatTable("fake_burst_base_buff", [1000]),
            target: new FeatureMultiplierTarget({
                damageTypes: ["burst"],
            }),
        }),
    ];

    const base = feature.getResult(baseData)["other.nicole_arcane_projection"];
    const buffed = feature.getResult(buffedData)["other.nicole_arcane_projection"];
    const unityBase = unityFeature.getResult(baseData)["other.nicole_arcane_projection_unity"];
    const unityBuffed = unityFeature.getResult(buffedData)["other.nicole_arcane_projection_unity"];

    expect(feature.getDamageType()).toBe("");
    expect(feature.getStatsDmgBonus(baseData)).toEqual(["dmg_all", "dmg_pyro*"]);
    expect(buffed.normal).toBeCloseTo(base.normal * 1.2, 5);
    expect(buffed.isReacted).toBe(false);
    expect(unityFeature.getDamageType()).toBe("");
    expect(unityBuffed.normal).toBeCloseTo(unityBase.normal * 1.2, 5);
    expect(unityBuffed.isReacted).toBe(false);
});

test("Nicole support Arcane Projection is appended to party features and uses active character stats", () => {
    global.DB = {
        Buffs: {},
        Chars: {
            getById: (id) => id === Nicole.getId() ? Nicole : null,
        },
    };

    const buffs = new CalcObjectBuffs();
    buffs.setPartyChars([Nicole.getId()]);

    const partyFeatures = buffs.getFeatures();
    const partyFeatureNames = partyFeatures.map((feature) => feature.getName());
    expect(partyFeatureNames).toContain("other.nicole_arcane_projection");
    expect(partyFeatureNames).toContain("other.nicole_arcane_projection_unity");

    const feature = getNicoleFeature("other.nicole_arcane_projection", partyFeatures);
    const unityFeature = getNicoleFeature("other.nicole_arcane_projection_unity", partyFeatures);
    const lowAtk = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_electro: 0,
        char_element: "electro",
        nicole_char_skill_burst: 1,
    }, {
        atk_base: 1000,
        nicole_atk_total: 99999,
        crit_rate_base: 1,
        crit_dmg_base: 1,
    });
    const highAtk = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_electro: 0,
        char_element: "electro",
        nicole_char_skill_burst: 1,
    }, {
        atk_base: 2000,
        nicole_atk_total: 99999,
        crit_rate_base: 1,
        crit_dmg_base: 1,
    });

    const low = feature.getResult(lowAtk)["other.nicole_arcane_projection"];
    const high = feature.getResult(highAtk)["other.nicole_arcane_projection"];

    expect(feature.getElement(lowAtk)).toBe("electro");
    expect(high.normal).toBeCloseTo(low.normal * 2, 5);
    expect(low.crit).toBeCloseTo(low.normal * 2, 5);
    expect(unityFeature.getResult(lowAtk)).toEqual({});

    const c1LowAtk = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_electro: 0,
        char_constellation: 0,
        char_element: "electro",
        "party.nicole_do_not_be_afraid_child_who_is_loved": true,
    }, {
        atk_base: 1000,
        nicole_atk_total: 99999,
        crit_rate_base: 1,
        crit_dmg_base: 1,
    });
    const c1HighAtk = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_electro: 0,
        char_constellation: 0,
        char_element: "electro",
        "party.nicole_do_not_be_afraid_child_who_is_loved": true,
    }, {
        atk_base: 2000,
        nicole_atk_total: 99999,
        crit_rate_base: 1,
        crit_dmg_base: 1,
    });

    const unityLow = unityFeature.getResult(c1LowAtk)["other.nicole_arcane_projection_unity"];
    const unityHigh = unityFeature.getResult(c1HighAtk)["other.nicole_arcane_projection_unity"];

    expect(unityFeature.getElement(c1LowAtk)).toBe("electro");
    expect(unityHigh.normal).toBeCloseTo(unityLow.normal * 2, 5);
    expect(unityLow.crit).toBeCloseTo(unityLow.normal * 2, 5);
});
