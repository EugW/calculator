import { BuildData } from "../src/js/classes/Build/Data";
import { FeatureMultiplierStellarConduct } from "../src/js/classes/Feature2/Multiplier/StellarConduct";
import { ElementalResonance } from "../src/js/db/Buffs/ElementalResonance";

function makeFieldData(settings) {
    const data = new BuildData(settings, {});

    for (const condition of ElementalResonance.getConditions()) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }

    return data;
}

test("Polestar Field applies field-level bonuses from shared included hits", () => {
    const data = makeFieldData({
        polestar_field: true,
        polestar_included_hits: 3,
    });

    expect(data.stats.get("enemy_res_phys")).toBe(-40);
    expect(data.stats.get("dmg_cryo")).toBe(31);
    expect(data.stats.get("dmg_electro")).toBe(31);
    expect(FeatureMultiplierStellarConduct.getHitCount(data)).toBe(3);
});

test("Polestar Field supports twelve included hits", () => {
    const data = makeFieldData({
        polestar_field: true,
        polestar_included_hits: 12,
    });

    expect(data.stats.get("dmg_cryo")).toBe(40);
    expect(data.stats.get("dmg_electro")).toBe(40);
    expect(FeatureMultiplierStellarConduct.getHitCount(data)).toBe(12);
    expect(FeatureMultiplierStellarConduct.baseMultiplier(data).value).toBe(2);
});

test("Polestar Field keeps zero included hits active through the field switch", () => {
    const data = makeFieldData({
        polestar_field: true,
        polestar_included_hits: 0,
    });

    expect(data.stats.get("enemy_res_phys")).toBe(-40);
    expect(data.stats.get("dmg_cryo")).toBe(20);
    expect(data.stats.get("dmg_electro")).toBe(20);
    expect(FeatureMultiplierStellarConduct.getHitCount(data)).toBe(0);
});
