import { BuildData } from "../src/js/classes/Build/Data";
import { TravelerPyro } from "../src/js/db/Char/TravelerPyro";
import { Rotation } from "../src/js/db/Features/Rotation";
import { charTalentTables } from "../src/js/db/generated/CharTalentTables";

function getFeature(name) {
    return TravelerPyro.getFeatures().find((f) => f.getName() === name);
}

function getCondition(name) {
    return TravelerPyro.getAllConditions().find((c) => c.getName() === name);
}

function damage(name, settings = {}) {
    const feature = getFeature(name);
    feature.compiled = undefined;
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_pyro: 0,
        char_skill_attack: 1,
        ...settings,
    }, {
        atk_base: 1000,
    });
    data.multipliers = TravelerPyro.getMultipliers();
    return feature.getResult(data)[name];
}

test("Pyro Inferno stacks gate damage and cooldown", () => {
    expect(getCondition('traveler_pyro_blade_sacred_flame').getId()).toBe(9);
    expect(getFeature('attack.traveler_pyro_inferno').isActive(new BuildData({traveler_pyro_blade_sacred_flame: 1}, {}))).toBe(false);
    expect(getFeature('attack.traveler_pyro_inferno').isActive(new BuildData({traveler_pyro_blade_sacred_flame: 2}, {}))).toBe(true);
    expect(getFeature('attack.traveler_pyro_inferno_1').isActive(new BuildData({traveler_pyro_blade_sacred_flame: 2}, {}))).toBe(true);
});

test("Pyro Inferno adds flat 200% ATK per hit over base charged", () => {
    const base1 = damage('attack.charged_hit_1', {}).normal;
    const inf1 = damage('attack.traveler_pyro_inferno_1', {traveler_pyro_blade_sacred_flame: 2}).normal;
    // 200% x 1000 ATK x 0.5 DEF (L90 vs L90) = 1000
    expect(inf1 - base1).toBeCloseTo(1000, 5);

    const total = damage('attack.traveler_pyro_inferno', {traveler_pyro_blade_sacred_flame: 2}).normal;
    const childTotal = damage('attack.traveler_pyro_inferno_1', {traveler_pyro_blade_sacred_flame: 2}).normal
        + damage('attack.traveler_pyro_inferno_2', {traveler_pyro_blade_sacred_flame: 2}).normal;
    expect(total).toBeCloseTo(childTotal, 5);

    const cooldown = getFeature('other.traveler_pyro_inferno_cooldown');
    cooldown.compiled = undefined;
    expect(cooldown.getResult(new BuildData({traveler_pyro_blade_sacred_flame: 2}, {}))['other.traveler_pyro_inferno_cooldown'].normal).toBe(15);
});

test("Pyro Inferno uses reserved Rotation IDs 920-922", () => {
    expect(Rotation.getByName('attack.traveler_pyro_inferno')).toBe(920);
    expect(Rotation.getByName('attack.traveler_pyro_inferno_1')).toBe(921);
    expect(Rotation.getByName('attack.traveler_pyro_inferno_2')).toBe(922);
});
