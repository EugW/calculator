import { BuildData } from "../src/js/classes/Build/Data";
import { Kinich } from "../src/js/db/Char/Kinich";

function applyConditions(data, conditions) {
    for (const condition of conditions) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }
}

function getSelfConditions(constellation, settings) {
    const data = new BuildData({char_constellation: constellation, ...settings}, {});
    applyConditions(data, Kinich.getAllConditions());
    return data;
}

function getPartyData(settings) {
    const data = new BuildData(settings, {});
    applyConditions(data, Kinich.getPartyConditions());
    return data;
}

test("Kinich C2 shreds Dendro RES and buffs the first Scalespiker Cannon on self", () => {
    const data = getSelfConditions(2, {
        kinich_tiger_beetles_palm_1: true,
        kinich_tiger_beetles_palm_2: true,
    });

    expect(data.stats.get('enemy_res_dendro')).toBeCloseTo(-30, 5);
    expect(data.stats.get('dmg_skill_kinich')).toBeCloseTo(100, 5);
});

test("Kinich C2 Dendro RES shred reaches the party when enabled", () => {
    const enabled = getPartyData({'party.kinich_tiger_beetles_palm_1': true});
    expect(enabled.stats.get('enemy_res_dendro')).toBeCloseTo(-30, 5);

    const disabled = getPartyData({'party.kinich_tiger_beetles_palm_1': false});
    expect(disabled.stats.get('enemy_res_dendro')).toBeCloseTo(0, 5);
});

test("Kinich C2 Scalespiker Cannon bonus stays self-only", () => {
    const names = Kinich.getPartyConditions().map((c) => c.getName());
    expect(names).toContain('party.kinich_tiger_beetles_palm_1');
    expect(names).not.toContain('party.kinich_tiger_beetles_palm_2');

    const data = getPartyData({'party.kinich_tiger_beetles_palm_1': true});
    expect(data.stats.get('dmg_skill_kinich')).toBeCloseTo(0, 5);
});
