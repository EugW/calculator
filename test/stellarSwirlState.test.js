import { BuildData } from "../src/js/classes/Build/Data";
import { CalcObjectBuffs } from "../src/js/classes/CalcObject/Buffs";
import { FeatureMultiplierStellarSwirl } from "../src/js/classes/Feature2/Multiplier/StellarSwirl";
import { Sandrone } from "../src/js/db/Char/Sandrone";
import { DB } from "../src/js/db/DB";

global.DB = DB;

const vortexName = "stellarswirl_vortex_triggers";

function getSharedVortexCondition() {
    return new CalcObjectBuffs().getConditions()
        .filter((condition) => condition.getName() === vortexName);
}

function applyConditions(data, conditions) {
    for (const condition of conditions) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }
}

test("Stellar Vortex uses exactly one global Party setup input", () => {
    const shared = getSharedVortexCondition();
    expect(shared).toHaveLength(1);

    const vortex = shared[0];
    expect(vortex.getId()).toBe(78);
    expect(vortex.getMaxValue()).toBe(6);
    expect(vortex.getBuffRotationSection()).toBe("buffs");
    expect(vortex.params.hideInactive).toBe(true);
    expect(vortex.checkSubconditions({allowed_stellarswirl: 1})).toBe(true);
    expect(vortex.checkSubconditions({})).toBe(false);

    const characterCopies = DB.Chars.getList(true).flatMap((character) => [
        ...character.getAllConditions(),
        ...character.getPartyConditions(),
    ]).filter((condition) => condition.getName() === vortexName);
    expect(characterCopies).toEqual([]);
});

test("Sandrone alone enables the shared Stellar Vortex input", () => {
    const data = new BuildData({}, {});
    applyConditions(data, Sandrone.getAllConditions());

    expect(data.settings.allowed_stellarswirl).toBe(1);
    expect(getSharedVortexCondition()[0].checkSubconditions(data.settings)).toBe(true);
});

test("shared Stellar Vortex triggers round-trip through global Buff ID 78", () => {
    const buffs = new CalcObjectBuffs();
    const settings = {
        allowed_stellarswirl: 1,
        stellarswirl_vortex_triggers: 4,
    };

    const encoded = buffs.serialize(settings);
    const vortexIndex = encoded.indexOf(78);
    expect(vortexIndex).toBeGreaterThan(0);
    expect(encoded.slice(vortexIndex, vortexIndex + 2)).toEqual([78, 4]);

    const restored = CalcObjectBuffs.deserialize([...encoded]);
    expect(restored.getSettings()).toMatchObject({
        stellarswirl_vortex_triggers: 4,
    });
    expect(restored.serialize({...restored.getSettings(), allowed_stellarswirl: 1}))
        .toEqual(encoded);
});

test.each([
    [0, 0, 1, 2, false],
    [2, 2, 1, 2, false],
    [3, 3, 2, 3, false],
    [5, 5, 2, 3, false],
    [6, 6, 2, 3, true],
    [99, 6, 2, 3, true],
])("Stellar Vortex threshold at %i triggers remains unchanged", (
    input,
    count,
    level,
    coefficient,
    bursts,
) => {
    const data = new BuildData({stellarswirl_vortex_triggers: input}, {});

    expect(FeatureMultiplierStellarSwirl.getVortexTriggerCount(data)).toBe(count);
    expect(FeatureMultiplierStellarSwirl.getVortexLevel(count)).toBe(level);
    expect(FeatureMultiplierStellarSwirl.getVortexCoefficient(count)).toBe(coefficient);
    expect(FeatureMultiplierStellarSwirl.shouldBurstVortex(count)).toBe(bursts);
});
