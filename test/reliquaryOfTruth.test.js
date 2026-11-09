import { BuildData } from "../src/js/classes/Build/Data";
import { DB } from "../src/js/db/DB";
import { Lang } from "../src/js/ui/Lang";

global.window = {};
global.localStorage = {};
require("../src/js/lang/eng.js");
global.UI = {Lang: new Lang()};
global.DB = DB;

function getWeapon() {
    return DB.Weapons.get('catalyst').get('ReliquaryOfTruth');
}

function applyWeapon(settings) {
    const data = new BuildData(settings, {});
    for (const condition of getWeapon().getConditions()) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }
    return data.stats;
}

test('Reliquary of Truth shows the generated passive, including the combined boost', () => {
    const settings = {weapon_refine: 1};
    const described = getWeapon().getConditions().filter((condition) => condition.params.description);
    expect(described.map((condition) => condition.params.description)).toEqual([
        'talent_descr.weapon_reliquary_of_truth_1',
        'talent_descr.weapon_reliquary_of_truth_2',
        'talent_descr.weapon_reliquary_of_truth_3',
        'talent_descr.weapon_reliquary_of_truth_4',
    ]);

    const texts = described.map((condition) => condition.getDescription(condition.getStats(settings)));
    for (const text of texts) {
        expect(text).not.toContain('%{');
    }
    expect(texts[0]).toContain('8%');
    expect(texts[1]).toContain('80');
    expect(texts[2]).toContain('24%');
    expect(texts[2]).toContain('Lunar-Bloom');
    expect(texts[3]).toContain('50%');
    for (const condition of described) {
        expect(condition.getTitle()).toBe('Essence of Falsity');
    }
});

test('Reliquary of Truth boosts both effects by 50% only while both are active', () => {
    const secretOnly = applyWeapon({weapon_refine: 1, weapon_reliquary_of_truth: true});
    expect(secretOnly.get('mastery')).toBe(80);
    expect(secretOnly.get('crit_dmg')).toBe(0);

    const both = applyWeapon({
        weapon_refine: 1,
        weapon_reliquary_of_truth: true,
        weapon_reliquary_of_truth_2: true,
    });
    expect(both.get('crit_rate')).toBe(8);
    expect(both.get('mastery')).toBe(120);
    expect(both.get('crit_dmg')).toBe(36);
});
