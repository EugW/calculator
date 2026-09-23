import { BuildData } from "../src/js/classes/Build/Data";
import { CalcObjectWeapon } from "../src/js/classes/CalcObject/Weapon";
import { Condition } from "../src/js/classes/Condition";
import { DB } from "../src/js/db/DB";
import { Weapons as WeaponBuffs } from "../src/js/db/Buffs/Weapons";
import {
    HymnofTheMaelstromPartyBuff,
} from "../src/js/db/Buffs/Weapons/HymnofTheMaelstrom";
import { Lang } from "../src/js/ui/Lang";

global.window = {};
global.localStorage = {};
require("../src/js/lang/eng.js");
global.UI = {Lang: new Lang()};
global.DB = DB;

function getWeapon(type, key) {
    return DB.Weapons.get(type).get(key);
}

function getCondition(object, name) {
    return object.getConditions().find((condition) => condition.getName() === name);
}

test.each([
    ['sword', 'NewBough', 258, 11437, 510, 'crit_dmg_base', 55.1],
    ['sword', 'SilverLight', 259, 11438, 510, 'atk_percent', 41.3],
    ['sword', 'BeyondTheChrysalis', 260, 11522, 674, 'crit_dmg_base', 44.1],
    ['catalyst', 'WintersHeavyHeart', 261, 14437, 510, 'crit_dmg_base', 55.1],
    ['catalyst', 'HymnofTheMaelstrom', 262, 14524, 542, 'hp_percent', 66.2],
    ['bow', 'BreezeborneRefrain', 263, 15437, 510, 'crit_rate_base', 27.6],
])('%s %s has its 7.1 identity and L90 stats', (
    type,
    key,
    serializeId,
    gameId,
    expectedAtk,
    expectedSecondaryName,
    expectedSecondary,
) => {
    const weapon = getWeapon(type, key);
    expect(weapon).toBeDefined();
    expect(weapon.getId()).toBe(serializeId);
    expect(weapon.getGameId()).toBe(gameId);
    expect(weapon.statTable[0].getValue(90, 6)).toBeCloseTo(expectedAtk, 0);
    expect(weapon.statTable[1].getName()).toBe(expectedSecondaryName);
    expect(weapon.statTable[1].getValue(90, 6)).toBeCloseTo(expectedSecondary, 1);
});

test('ordinary regeneration keeps stat tables for every registered weapon', () => {
    for (const type of ['sword', 'claymore', 'polearm', 'catalyst', 'bow']) {
        const weapons = DB.Weapons.get(type);
        for (const key of weapons.getKeys(true)) {
            const statTable = weapons.get(key).statTable;
            expect({type, key, hasStats: Array.isArray(statTable) && statTable.length > 0})
                .toEqual({type, key, hasStats: true});
        }
    }
});

test('weapon registries expose the 7.1 weapons by default', () => {
    const expected = {
        sword: ['NewBough', 'SilverLight', 'BeyondTheChrysalis'],
        catalyst: ['WintersHeavyHeart'],
        bow: ['BreezeborneRefrain'],
    };

    for (const [type, keys] of Object.entries(expected)) {
        const weapons = DB.Weapons.get(type);
        for (const key of keys) {
            expect(weapons.getKeys()).toContain(key);
            expect(weapons.getKeys(true)).toContain(key);
        }
    }
});

test('New Bough replaces Verdant stacks with Radiance stacks at R1 and R5', () => {
    const weapon = getWeapon('sword', 'NewBough');
    const mode = getCondition(weapon, 'weapon_new_bough_mode');
    const stacks = getCondition(weapon, 'weapon_new_bough_stacks');

    expect(mode.params.values.find(({value}) => value === 'radiance').title_str)
        .toBe('talent_name.n11500004');

    let stats = stacks.getStats({weapon_refine: 1, weapon_new_bough_mode: 'normal'}, 3);
    expect(stats.get('atk_percent')).toBe(12);
    expect(stats.get('mastery')).toBe(60);
    expect(stats.get('dmg_stellarconduct')).toBe(0);
    expect(stats.get('dmg_stellarswirl')).toBe(0);

    stats = stacks.getStats({weapon_refine: 5, weapon_new_bough_mode: 'radiance'}, 3);
    expect(stats.get('atk_percent')).toBe(36);
    expect(stats.get('mastery')).toBe(0);
    expect(stats.get('dmg_stellarconduct')).toBe(48);
    expect(stats.get('dmg_stellarswirl')).toBe(48);
});

test('Silver Light caps its two independently timed stacks and keeps R1/R5 values', () => {
    const stacks = getCondition(getWeapon('sword', 'SilverLight'), 'weapon_silver_light_stacks');

    expect(stacks.getStats({weapon_refine: 1}, 2).get('mastery')).toBe(104);
    expect(stacks.getStats({weapon_refine: 5}, 2).get('mastery')).toBe(208);
    const settings = {weapon_refine: 5, weapon_silver_light_stacks: 3};
    expect(stacks.getData(settings).stats.get('mastery')).toBe(208);
    expect(settings.weapon_silver_light_stacks).toBe(2);
});

test.each([[1, 56, 36], [5, 120, 72]])('Beyond the Chrysalis winds work independently and together at R%i', (refine, crit, swirl) => {
    const weapon = getWeapon('sword', 'BeyondTheChrysalis');
    const toggles = weapon.getConditions().filter((condition) =>
        !condition.isHidden({}) && condition.getType() !== 'static'
    );
    expect(toggles.map((condition) => condition.getTitle())).toEqual([
        'Winds of Devotion', 'Winds of Defiance',
    ]);
    expect(toggles.every((condition) => condition.getType() === 'checkbox' && !condition.getDescription())).toBe(true);

    for (const [devotion, defiance] of [[false, false], [true, false], [false, true], [true, true]]) {
        const saved = new CalcObjectWeapon();
        saved.set(weapon);
        saved.setLevels({level: 90, ascension: 6, refine});
        saved.setSettings({
            weapon_beyond_the_chrysalis_winds_of_devotion: devotion,
            weapon_beyond_the_chrysalis_winds_of_defiance: defiance,
        });
        const loaded = CalcObjectWeapon.deserialize(saved.serialize(saved.getSettings()));
        const settings = loaded.getSettings();
        const data = new BuildData(settings, {});
        for (const condition of weapon.getConditions()) {
            data.addStats(condition.getData(settings).stats);
        }
        expect(data.stats.get('crit_dmg')).toBe(devotion ? crit : 0);
        expect(data.stats.get('dmg_stellarswirl')).toBe(defiance ? swirl : 0);
    }
});

test('Beyond the Chrysalis still consumes the removed selector in saved builds', () => {
    for (const selection of [1, 2, 3, 4, 5]) {
        const input = [260, 90, 6, 1, 1, 1, selection];
        const loaded = CalcObjectWeapon.deserialize(input);
        expect(loaded.getId()).toBe(260);
        expect(input).toEqual([]);
        expect(loaded.serialize(loaded.getSettings())).toEqual([260, 90, 6, 1, 0]);
    }
});

test('Winters Heavy Heart counts four members and replaces its bonuses during Radiance', () => {
    const weapon = getWeapon('catalyst', 'WintersHeavyHeart');
    const radiance = getCondition(weapon, 'weapon_winters_heavy_heart_radiance');
    const effect = weapon.getConditions()[1];
    const party = {
        char_element: 'cryo',
        resonance_element_1: 'electro',
        resonance_element_2: 'cryo',
        resonance_element_3: 'electro',
    };

    expect(radiance.params.title).toBe('talent_name.n11500004');

    let stats = effect.getStats({weapon_refine: 1, ...party});
    expect(stats.get('mastery')).toBe(48);
    expect(stats.get('atk_percent')).toBeCloseTo(9.6);
    expect(stats.get('dmg_stellarconduct')).toBe(0);

    stats = effect.getStats({weapon_refine: 1, weapon_winters_heavy_heart_radiance: true, ...party});
    expect(stats.get('mastery')).toBe(80);
    expect(stats.get('atk_percent')).toBe(0);
    expect(stats.get('dmg_stellarconduct')).toBe(24);
    expect(stats.get('dmg_stellarswirl')).toBe(24);

    stats = effect.getStats({
        weapon_refine: 5,
        weapon_winters_heavy_heart_radiance: true,
        char_element: 'cryo',
        resonance_element_1: 'cryo',
        resonance_element_2: 'cryo',
        resonance_element_3: 'electro',
        resonance_element_4: 'electro',
    });
    expect(stats.get('mastery')).toBe(160);
    expect(stats.get('atk_percent')).toBe(0);
    expect(stats.get('dmg_stellarconduct')).toBe(48);
});

test("Hymn of the Maelstrom models base and boosted Vatsamonga's Vatic Vintage without a loop", () => {
    const weapon = getWeapon('catalyst', 'HymnofTheMaelstrom');
    const staticEffect = weapon.getConditions()[0];
    const stacks = getCondition(weapon, 'weapon_hymn_of_the_maelstrom_stacks');
    const party = WeaponBuffs.getConditions().find(
        (condition) => condition.getName() === 'weapon_other.weapon_hymn_of_the_maelstrom',
    );

    expect(party).toBe(HymnofTheMaelstromPartyBuff);
    expect(staticEffect.getStats({weapon_refine: 1}).get('healing')).toBe(4);
    expect(staticEffect.getStats({weapon_refine: 5}).get('healing')).toBe(8);
    const r1Description = staticEffect.getDescription(staticEffect.getStats({weapon_refine: 1}));
    expect(r1Description).toContain("Vatsamonga's Vatic Vintage");
    expect(r1Description).not.toContain('?');
    expect(stacks.getStats({weapon_refine: 1, weapon_hymn_of_the_maelstrom_mode: 'hymn'}, 3)
        .get('hp_percent')).toBe(12);
    expect(stacks.getStats({weapon_refine: 1, weapon_hymn_of_the_maelstrom_mode: 'triumph'}, 3)
        .get('hp_percent')).toBeCloseTo(21);

    expect(party.getStats({
        'weapon_other.weapon_hymn_of_the_maelstrom': 1,
        weapon_hymn_of_the_maelstrom_holder_hp: 40999,
        'weapon_other.weapon_hymn_of_the_maelstrom_mode': 'hymn_3',
    }).get('atk_percent')).toBeCloseTo(0.999 * 0.4 * 3, 5);
    expect(party.getStats({
        'weapon_other.weapon_hymn_of_the_maelstrom': 1,
        weapon_hymn_of_the_maelstrom_holder_hp: 60000,
        'weapon_other.weapon_hymn_of_the_maelstrom_mode': 'hymn_3',
    }).get('atk_percent')).toBe(24);
    expect(party.getStats({
        'weapon_other.weapon_hymn_of_the_maelstrom': 1,
        weapon_hymn_of_the_maelstrom_holder_hp: 60000,
        'weapon_other.weapon_hymn_of_the_maelstrom_mode': 'triumph_3',
    }).get('atk_percent')).toBeCloseTo(42);
    expect(party.getStats({
        'weapon_other.weapon_hymn_of_the_maelstrom': 5,
        weapon_hymn_of_the_maelstrom_holder_hp: 150000,
        'weapon_other.weapon_hymn_of_the_maelstrom_mode': 'triumph_3',
    }).get('atk_percent')).toBeCloseTo(84);

    const activeBase = weapon.getPostEffects().filter((effect) => effect.isActive({
        weapon_hymn_of_the_maelstrom_stacks: 3,
        weapon_hymn_of_the_maelstrom_mode: 'hymn',
    }));
    const activeBoosted = weapon.getPostEffects().filter((effect) => effect.isActive({
        weapon_hymn_of_the_maelstrom_stacks: 3,
        weapon_hymn_of_the_maelstrom_mode: 'triumph',
    }));
    expect(activeBase).toHaveLength(1);
    expect(activeBase[0].params.statCap.getValue(1)).toBe(24);
    expect(activeBoosted).toHaveLength(1);
    expect(activeBoosted[0].params.statCap.getValue(5)).toBeCloseTo(84);
});

test.each([40000, 40999, 45678, 100000])('Hymn self and party ATK scaling agree at %i HP', (hp) => {
    const weapon = getWeapon('catalyst', 'HymnofTheMaelstrom');
    const data = new BuildData({
        weapon_refine: 1,
        weapon_hymn_of_the_maelstrom_stacks: 3,
        weapon_hymn_of_the_maelstrom_mode: 'triumph',
    }, {hp_base: hp});
    data.postEffects = weapon.getPostEffects();
    data.applyPostEffects();
    const party = HymnofTheMaelstromPartyBuff.getStats({
        'weapon_other.weapon_hymn_of_the_maelstrom': 1,
        weapon_hymn_of_the_maelstrom_holder_hp: hp,
        'weapon_other.weapon_hymn_of_the_maelstrom_mode': 'triumph_3',
    });
    expect(data.stats.get('atk_percent')).toBeCloseTo(party.get('atk_percent') / 100, 5);
});

test('Breezeborne Refrain threshold refreshes one non-stacking party bonus at R1/R5', () => {
    const weapon = getWeapon('bow', 'BreezeborneRefrain');
    const staticEffect = weapon.getConditions()[0];
    const threshold = weapon.getConditions()[2];
    const party = WeaponBuffs.getConditions().find(
        (condition) => condition.getName() === 'weapon_other.weapon_breezeborne_refrain',
    );

    expect(threshold.params.title).toBe('talent_name.weapon_breezeborne_refrain');
    expect(threshold.getTitle()).toBe("Viper's Ballad");
    expect(staticEffect.getStats({weapon_refine: 1}).get('recharge')).toBe(20);
    expect(staticEffect.getStats({weapon_refine: 5}).get('recharge')).toBe(40);
    expect(threshold.getData({weapon_refine: 1, weapon_breezeborne_refrain_points: 2})
        .stats.get('dmg_stellarswirl')).toBe(0);
    expect(threshold.getData({weapon_refine: 1, weapon_breezeborne_refrain_points: 3})
        .stats.get('dmg_stellarswirl')).toBe(24);
    expect(threshold.getData({weapon_refine: 1, weapon_breezeborne_refrain_points: 9})
        .stats.get('dmg_stellarswirl')).toBe(24);
    expect(party.getStats({'weapon_other.weapon_breezeborne_refrain': 5})
        .get('dmg_stellarconduct')).toBe(48);
    expect(party.getStats({'weapon_other.weapon_breezeborne_refrain': 5})
        .get('dmg_stellarswirl')).toBe(48);
});

test('new party weapons show R1 refinement text at R0 without applying a buff', () => {
    const partyConditions = WeaponBuffs.getConditions();
    const hymn = partyConditions.find(
        (condition) => condition.getName() === 'weapon_other.weapon_hymn_of_the_maelstrom',
    );
    const refrain = partyConditions.find(
        (condition) => condition.getName() === 'weapon_other.weapon_breezeborne_refrain',
    );

    const hymnStats = hymn.getStats({});
    const hymnDescription = hymn.getDescription(hymnStats);
    expect(hymnStats.get('atk_percent')).toBe(0);
    expect(hymn.getData({}).stats.get('atk_percent')).toBe(0);
    expect(hymnDescription).toContain('0.4%');
    expect(hymnDescription).toContain('8%');
    expect(hymnDescription).toContain("Vatsamonga's Vatic Vintage");
    expect(hymnDescription).toContain('75%');
    expect(hymnDescription).not.toContain('?');

    const refrainStats = refrain.getStats({});
    const refrainDescription = refrain.getDescription(refrainStats);
    expect(refrainStats.get('dmg_stellarconduct')).toBe(0);
    expect(refrainStats.get('dmg_stellarswirl')).toBe(0);
    expect(refrain.getData({}).stats.get('dmg_stellarconduct')).toBe(0);
    expect(refrain.getData({}).stats.get('dmg_stellarswirl')).toBe(0);
    expect(refrainDescription).toContain('24%');
    expect(refrainDescription).toContain('Hymn of the Pure');
    expect(refrainDescription).toContain('Thus Lied the Viper');
    expect(refrainDescription).not.toMatch(/^This grants/);
    expect(refrainDescription).not.toContain('?');
});

test('Hymn of the Maelstrom and Breezeborne Refrain use normal condition handling', () => {
    const wrappers = WeaponBuffs.getConditions().filter((condition) => [
        'weapon_other.weapon_hymn_of_the_maelstrom',
        'weapon_other.weapon_breezeborne_refrain',
    ].includes(condition.getName()));
    expect(wrappers).toHaveLength(2);

    const controls = Condition.unwrap(wrappers);
    expect(controls).toHaveLength(4);
});
