import { BuildData } from "../src/js/classes/Build/Data";
import { Lohen } from "../src/js/db/Char/Lohen";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { makeBuild } from "./support/team";

global.DB = DB;

function getWillToWinCondition() {
    return Lohen.getConditions().find((condition) => {
        return condition.getName() === "lohen_will_to_win";
    });
}

function getCondition(name) {
    return Lohen.getConditions().find((condition) => {
        return condition.getName() === name;
    });
}

function getFeature(name) {
    return Lohen.getFeatures().find((feature) => {
        return feature.name === name;
    });
}

function getFeatureDamage(name, settings = {}) {
    const feature = getFeature(name);
    feature.compiled = null;

    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        char_constellation: 1,
        char_skill_elemental: 13,
        char_skill_burst: 13,
        lohen_will_to_win: 300,
        ...settings,
    }, {
        atk_base: 1000,
    });

    return feature.getResult(data)[feature.getName()].normal;
}

test("Lohen Will to Win numeric condition resolves dynamic max values", () => {
    const condition = getWillToWinCondition();

    expect(condition.getType()).toBe("number");
    expect(condition.getMaxValue({char_constellation: 0})).toBe(100);
    expect(condition.getMaxValue({char_constellation: 1})).toBe(300);
    expect(condition.getValue({char_constellation: 0, lohen_will_to_win: 42})).toBe(42);
    expect(condition.getValue({char_constellation: 0, lohen_will_to_win: 500})).toBe(100);
    expect(condition.getValue({char_constellation: 1, lohen_will_to_win: 500})).toBe(300);
});

test("Lohen High Spirits grants a separate Elemental Skill level bonus", () => {
    const condition = getCondition("lohen_when_the_mood_strikes");

    expect(condition.getData({lohen_when_the_mood_strikes: true}).settings).toEqual({
        char_skill_elemental_bonus_2: 1,
    });
});

test("Lohen Unhealing Thorn requires at least half of current Will to Win max", () => {
    const lohen = makeBuild('Lohen');
    const durin = makeBuild('Durin');
    durin.setCharSettings({durin_witch_homework: true});
    const team = Team.fromMember(lohen);
    team.setMember(1, durin);
    const condition = getCondition('lohen_unhealing_thorn');

    for (const [constellation, willToWin, expected] of [
        [0, 49, false], [0, 50, true], [1, 149, false], [1, 150, true],
    ]) {
        lohen.setCharLevels({level: 90, ascension: 6, constellation});
        lohen.setCharSettings({
            lohen_unhealing_thorn: true,
            lohen_witch_homework: true,
            lohen_will_to_win: willToWin,
        });
        expect(condition.isActive(lohen.getBuildData().settings)).toBe(expected);
    }
    durin.setCharSettings({durin_witch_homework: false});
    expect(condition.isActive(lohen.getBuildData().settings)).toBe(false);

});

test("Lohen Evilsbane Blade is uncategorized Cryo damage", () => {
    const feature = getFeature("lohen_evilsbane_blade");

    expect(feature.category).toBe("other");
    expect(feature.getName()).toBe("other.lohen_evilsbane_blade");
    expect(feature.getDamageType()).toBe("");
});

test("Lohen Will to Win damage increase multiplies the feature talent multiplier", () => {
    expect(getFeatureDamage("lohen_etched_into_bone_and_soul")).toBeCloseTo(1402.5, 5);
    expect(getFeatureDamage("lohen_manifest_judgment")).toBeCloseTo(2776.95, 5);
});
