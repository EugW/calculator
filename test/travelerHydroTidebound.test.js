import { BuildData } from "../src/js/classes/Build/Data";
import { TravelerHydro } from "../src/js/db/Char/TravelerHydro";
import { Rotation } from "../src/js/db/Features/Rotation";

function getFeature(name) {
    return TravelerHydro.getFeatures().find((f) => f.getName() === name);
}

function damage(name, settings = {}) {
    const feature = getFeature(name);
    feature.compiled = undefined;
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_hydro: 0,
        char_skill_attack: 1,
        ...settings,
    }, {
        atk_base: 1000,
        hp_base: 10000,
    });
    return feature.getResult(data)[name];
}

test("Hydro Tidebound gates on 3 blades", () => {
    expect(getFeature('attack.traveler_hydro_tidebound').isActive(new BuildData({traveler_hydro_blade_many_waters: 2}, {}))).toBe(false);
    expect(getFeature('attack.traveler_hydro_tidebound').isActive(new BuildData({traveler_hydro_blade_many_waters: 3}, {}))).toBe(true);
});

test("Hydro Tidebound HP dropdown selects bonus vs heal branch", () => {
    const base = damage('attack.charged_hit_1', {}).normal;
    const low = damage('attack.traveler_hydro_tidebound_1', {
        traveler_hydro_blade_many_waters: 3,
        traveler_hydro_tidebound_hp: 'low',
    }).normal;
    // 150% x 1000 x 0.5 DEF = 750
    expect(low - base).toBeCloseTo(750, 5);

    const high = damage('attack.traveler_hydro_tidebound_1', {
        traveler_hydro_blade_many_waters: 3,
        traveler_hydro_tidebound_hp: 'high',
    }).normal;
    // +100% extra x 1000 x 0.5 = 500 on top of low branch
    expect(high - low).toBeCloseTo(500, 5);

    const total = damage('attack.traveler_hydro_tidebound', {
        traveler_hydro_blade_many_waters: 3,
        traveler_hydro_tidebound_hp: 'high',
    }).normal;
    const children = damage('attack.traveler_hydro_tidebound_1', {
        traveler_hydro_blade_many_waters: 3,
        traveler_hydro_tidebound_hp: 'high',
    }).normal + damage('attack.traveler_hydro_tidebound_2', {
        traveler_hydro_blade_many_waters: 3,
        traveler_hydro_tidebound_hp: 'high',
    }).normal;
    expect(total).toBeCloseTo(children, 5);
});

test("Hydro Tidebound rotation IDs", () => {
    expect(Rotation.getByName('attack.traveler_hydro_tidebound')).toBe(930);
    expect(Rotation.getByName('attack.traveler_hydro_tidebound_1')).toBe(931);
    expect(Rotation.getByName('attack.traveler_hydro_tidebound_2')).toBe(932);
});
