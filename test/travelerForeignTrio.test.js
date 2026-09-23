import { BuildData } from "../src/js/classes/Build/Data";
import { TravelerGeo } from "../src/js/db/Char/TravelerGeo";
import { TravelerElectro } from "../src/js/db/Char/TravelerElectro";
import { TravelerDendro } from "../src/js/db/Char/TravelerDendro";
import { Rotation } from "../src/js/db/Features/Rotation";

function damage(char, name, settings = {}, element = 'geo') {
    const feature = char.getFeatures().find((f) => f.getName() === name);
    feature.compiled = undefined;
    const resKey = 'enemy_res_' + element;
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        char_skill_attack: 1,
        [resKey]: 0,
        ...settings,
    }, {
        atk_base: 1000,
    });
    return feature.getResult(data)[name];
}

test("Geo Rockfell gates on 3 blades and adds 120%", () => {
    expect(TravelerGeo.getFeatures().find((f) => f.getName() === 'attack.traveler_geo_rockfell').isActive(new BuildData({traveler_geo_blade_archaic_petra: 2}, {}))).toBe(false);
    const base = damage(TravelerGeo, 'attack.charged_hit_1', {}, 'geo').normal;
    const inf = damage(TravelerGeo, 'attack.traveler_geo_rockfell_1', {traveler_geo_blade_archaic_petra: 3}, 'geo').normal;
    expect(inf - base).toBeCloseTo(1000 * 1.2 * 0.5, 5);
    expect(Rotation.getByName('attack.traveler_geo_rockfell')).toBe(933);
});

test("Electro Detonate gates on 3 blades, core 100% plus delayed 200%", () => {
    const base = damage(TravelerElectro, 'attack.charged_hit_1', {}, 'electro').normal;
    const inf = damage(TravelerElectro, 'attack.traveler_electro_detonate_1', {traveler_electro_blade_thunder: 3}, 'electro').normal;
    expect(inf - base).toBeCloseTo(1000 * 1.0 * 0.5, 5);
    const delayed = damage(TravelerElectro, 'attack.traveler_electro_detonate_delayed', {traveler_electro_blade_thunder: 3}, 'electro').normal;
    expect(delayed).toBeCloseTo(1000 * 2.0 * 0.5, 5);
    expect(Rotation.getByName('attack.traveler_electro_detonate_delayed')).toBe(939);
});

test("Dendro Verdessence gates on 3 blades, core 80% plus vinecores 120%", () => {
    const base = damage(TravelerDendro, 'attack.charged_hit_1', {}, 'dendro').normal;
    const inf = damage(TravelerDendro, 'attack.traveler_dendro_verdessence_1', {traveler_dendro_blade_viridis: 3}, 'dendro').normal;
    expect(inf - base).toBeCloseTo(1000 * 0.8 * 0.5, 5);
    const vine = damage(TravelerDendro, 'attack.traveler_dendro_vinecore_1', {traveler_dendro_blade_viridis: 3}, 'dendro').normal;
    expect(vine).toBeCloseTo(1000 * 1.2 * 0.5, 5);
    expect(Rotation.getByName('attack.traveler_dendro_vinecore_2')).toBe(944);
});
