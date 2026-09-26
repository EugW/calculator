import { BuildData } from "../src/js/classes/Build/Data";
import { CalcObjectWeapon } from "../src/js/classes/CalcObject/Weapon";
import { DB } from "../src/js/db/DB";

global.DB = DB;

const weapon = DB.Weapons.get('bow').get('TheDaybreakChronicles');

function getBuffStats(settings) {
    const data = new BuildData(settings, {});
    for (const condition of weapon.getConditions()) {
        data.addStats(condition.getData(settings).stats);
    }
    return data.stats;
}

test.each([[1, 60], [2, 75], [3, 90], [4, 105], [5, 120]])(
    'The Daybreak Chronicles stays capped at R%i even with the old Hexerei toggle enabled',
    (refine, cap) => {
        for (const stacks of [0, 1, 3, 6, 7]) {
            for (const hexerei of [false, true]) {
                const stats = getBuffStats({
                    weapon_refine: refine,
                    weapon_the_daybreak_chronicles: stacks,
                    weapon_the_daybreak_chronicles_hexerei: hexerei,
                });

                for (const type of ['normal', 'skill', 'burst']) {
                    expect(stats.get('dmg_' + type)).toBe(Math.min(stacks, 6) * cap / 6);
                }
                expect(stats.get('dmg_charged')).toBe(0);
                expect(stats.get('dmg_plunge')).toBe(0);
            }
        }
    },
);

test('The Daybreak Chronicles only exposes its existing stack control', () => {
    const controls = weapon.getConditions().filter((condition) => !condition.isHidden({}));
    expect(controls.map((condition) => condition.getName())).toEqual([
        'weapon_the_daybreak_chronicles',
    ]);
});

test.each([
    [[1, 1, 6]],
    [[2, 1, 6, 2]],
    [[2, 2, 1, 6]],
])('The Daybreak Chronicles loads old condition data %j without retaining the Hexerei bonus', (conditions) => {
    const input = [236, 90, 6, 1, ...conditions, 999];
    const loaded = CalcObjectWeapon.deserialize(input);

    expect(loaded).not.toBeNull();
    expect(input).toEqual([999]);
    const settings = loaded.getSettings();
    expect(settings.weapon_the_daybreak_chronicles).toBe(6);
    expect(settings.weapon_the_daybreak_chronicles_hexerei).toBeUndefined();
    expect(getBuffStats(settings).get('dmg_burst')).toBe(60);
    expect(loaded.serialize(settings)).toEqual([236, 90, 6, 1, 1, 1, 6]);
});
