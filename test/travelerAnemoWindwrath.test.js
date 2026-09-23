import { BuildData } from "../src/js/classes/Build/Data";
import { TravelerAnemo } from "../src/js/db/Char/TravelerAnemo";
import { Rotation } from "../src/js/db/Features/Rotation";

function getFeature(name) {
    return TravelerAnemo.getFeatures().find((f) => f.getName() === name);
}

function damage(name, settings = {}) {
    const feature = getFeature(name);
    feature.compiled = undefined;
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_anemo: 0,
        enemy_res_pyro: 0,
        char_skill_attack: 1,
        ...settings,
    }, {
        atk_base: 1000,
    });
    return feature.getResult(data)[name];
}

test("Anemo Whirlwind gates on 2+ blades", () => {
    expect(getFeature('attack.traveler_anemo_whirlwind').isActive(new BuildData({traveler_anemo_blade_dawn_breeze: 1}, {}))).toBe(false);
    expect(getFeature('attack.traveler_anemo_whirlwind').isActive(new BuildData({traveler_anemo_blade_dawn_breeze: 2}, {}))).toBe(true);
});

test("Anemo Whirlwind adds 60% per hit and blade winds add 50% per selected element", () => {
    const base = damage('attack.charged_hit_1', {}).normal;
    const inf = damage('attack.traveler_anemo_whirlwind_1', {traveler_anemo_blade_dawn_breeze: 2}).normal;
    expect(inf - base).toBeCloseTo(1000 * 0.6 * 0.5, 5);

    const pyro = damage('attack.traveler_anemo_blade_wind_pyro', {
        traveler_anemo_blade_dawn_breeze: 2,
        traveler_anemo_blade_wind_element: 'pyro;hydro',
    }).normal;
    expect(pyro).toBeCloseTo(1000 * 0.5 * 0.5, 5);

    expect(getFeature('attack.traveler_anemo_blade_wind_pyro').isActive(new BuildData({
        traveler_anemo_blade_dawn_breeze: 2,
        traveler_anemo_blade_wind_element: 'hydro',
    }, {}))).toBe(false);
});

test("Anemo Windwrath rotation IDs", () => {
    expect(Rotation.getByName('attack.traveler_anemo_whirlwind')).toBe(923);
    expect(Rotation.getByName('attack.traveler_anemo_blade_wind_electro')).toBe(929);
});
