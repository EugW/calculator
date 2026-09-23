import { BuildData } from "../src/js/classes/Build/Data";
import { Flins } from "../src/js/db/Char/Flins";

function applyConditions(data, conditions) {
    for (const condition of conditions) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }
}

function getSelfCondition(name) {
    return Flins.getAllConditions().find((c) => c.getName() === name);
}

function getPartyCondition(name) {
    return Flins.getPartyConditions().find((c) => c.getName() === name);
}

test("Flins A1 is self-only: no party-wide Symphony of Winter", () => {
    expect(getPartyCondition('party.flins_symphony_of_winter')).toBeUndefined();

    // Old World Secrets (party base bonus) and C6 elevate must still exist
    expect(getPartyCondition('party.flins_songs_and_dances_of_death')).toBeDefined();
});

test("Flins self A1 only buffs at Ascendant Gleam (party_moonsign 2)", () => {
    const cond = getSelfCondition('flins_symphony_of_winter');
    expect(cond).toBeDefined();

    const nascent = new BuildData({
        char_ascension: 1,
        flins_symphony_of_winter: true,
        party_moonsign: 1,
    }, {});
    applyConditions(nascent, [cond]);
    expect(nascent.stats.get('dmg_reaction_lunarcharged')).toBeCloseTo(0, 5);

    const ascendant = new BuildData({
        char_ascension: 1,
        flins_symphony_of_winter: true,
        party_moonsign: 2,
    }, {});
    applyConditions(ascendant, [cond]);
    expect(ascendant.stats.get('dmg_reaction_lunarcharged')).toBeCloseTo(20, 5);
});

test("Flins self A1 requires ascension 1", () => {
    const cond = getSelfCondition('flins_symphony_of_winter');

    const data = new BuildData({
        char_ascension: 0,
        flins_symphony_of_winter: true,
        party_moonsign: 2,
    }, {});
    applyConditions(data, [cond]);
    expect(data.stats.get('dmg_reaction_lunarcharged')).toBeCloseTo(0, 5);
});

test("Flins party C6 only elevates at Ascendant Gleam", () => {
    const cond = getPartyCondition('party.flins_songs_and_dances_of_death');
    expect(cond).toBeDefined();

    const nascent = new BuildData({
        'party.flins_songs_and_dances_of_death': true,
        party_moonsign: 1,
    }, {});
    applyConditions(nascent, [cond]);
    expect(nascent.stats.get('dmg_lunarcharged_special')).toBeCloseTo(0, 5);

    const ascendant = new BuildData({
        'party.flins_songs_and_dances_of_death': true,
        party_moonsign: 2,
    }, {});
    applyConditions(ascendant, [cond]);
    expect(ascendant.stats.get('dmg_lunarcharged_special')).toBeCloseTo(10, 5);
});

test("Flins party Old World Secrets base bonus still present", () => {
    const postEffects = Flins.getPartyPostEffects();
    const lunarPost = postEffects.find((p) => {
        try {
            return p.params.percent.getName() === 'lunarcharged_multi';
        } catch (e) {
            return false;
        }
    });
    expect(lunarPost).toBeDefined();
    expect(lunarPost.params.from).toBe('flins_atk_total');
});
