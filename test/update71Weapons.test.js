import { Condition } from "../src/js/classes/Condition";
import { DB } from "../src/js/db/DB";
import { Weapons as WeaponBuffs } from "../src/js/db/Buffs/Weapons";

function getWeapon(type, key) {
    return DB.Weapons.get(type).get(key);
}

function getCondition(object, name) {
    return object.getConditions().find((condition) => condition.getName() === name);
}

test.each([
    ['sword', 'SpikedStake', 258, 11437, 510, 'crit_dmg_base', 55.1],
    ['sword', 'Fajian', 259, 11438, 510, 'atk_percent', 41.3],
    ['sword', 'Samosvist', 260, 11522, 674, 'crit_dmg_base', 44.1],
    ['catalyst', 'FrostScepter', 261, 14437, 510, 'crit_dmg_base', 55.1],
    ['catalyst', 'Bludnye', 262, 14524, 542, 'hp_percent', 66.2],
    ['bow', 'Windtalker', 263, 15437, 510, 'crit_rate_base', 27.6],
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

test('weapon registries expose the six 7.1 weapons when optional content is requested', () => {
    const expected = {
        sword: ['SpikedStake', 'Fajian', 'Samosvist'],
        catalyst: ['FrostScepter', 'Bludnye'],
        bow: ['Windtalker'],
    };

    for (const [type, keys] of Object.entries(expected)) {
        const weapons = DB.Weapons.get(type);
        for (const key of keys) {
            expect(weapons.getKeys()).not.toContain(key);
            expect(weapons.getKeys(true)).toContain(key);
        }
    }
});

test('SpikedStake replaces normal stacks with Radiance stacks at R1 and R5', () => {
    const stacks = getCondition(getWeapon('sword', 'SpikedStake'), 'weapon_spiked_stake_stacks');

    let stats = stacks.getStats({weapon_refine: 1, weapon_spiked_stake_mode: 'normal'}, 3);
    expect(stats.get('atk_percent')).toBe(12);
    expect(stats.get('mastery')).toBe(60);
    expect(stats.get('dmg_stellarconduct')).toBe(0);
    expect(stats.get('dmg_stellarswirl')).toBe(0);

    stats = stacks.getStats({weapon_refine: 5, weapon_spiked_stake_mode: 'radiance'}, 3);
    expect(stats.get('atk_percent')).toBe(36);
    expect(stats.get('mastery')).toBe(0);
    expect(stats.get('dmg_stellarconduct')).toBe(48);
    expect(stats.get('dmg_stellarswirl')).toBe(48);
});

test('Fajian caps its two independently timed stacks and keeps R1/R5 values', () => {
    const stacks = getCondition(getWeapon('sword', 'Fajian'), 'weapon_fajian_stacks');

    expect(stacks.getStats({weapon_refine: 1}, 2).get('mastery')).toBe(104);
    expect(stacks.getStats({weapon_refine: 5}, 2).get('mastery')).toBe(208);
    const settings = {weapon_refine: 5, weapon_fajian_stacks: 3};
    expect(stacks.getData(settings).stats.get('mastery')).toBe(208);
    expect(settings.weapon_fajian_stacks).toBe(2);
});

test('Samosvist exposes the three-step attention cycle at R1 and R5', () => {
    const cycle = getCondition(getWeapon('sword', 'Samosvist'), 'weapon_samosvist_attention');

    expect(cycle.getData({weapon_refine: 1, weapon_samosvist_attention: 'blazing'})
        .stats.get('crit_dmg')).toBe(48);
    expect(cycle.getData({weapon_refine: 5, weapon_samosvist_attention: 'blazing'})
        .stats.get('crit_dmg')).toBe(104);
    expect(cycle.getData({weapon_refine: 1, weapon_samosvist_attention: 'dazzling'})
        .stats.get('dmg_stellarswirl')).toBe(28);
    expect(cycle.getData({weapon_refine: 5, weapon_samosvist_attention: 'dazzling'})
        .stats.get('dmg_stellarswirl')).toBe(56);
    expect(cycle.getData({weapon_refine: 1, weapon_samosvist_attention: 'radiant'})
        .stats.get('text_number_energy')).toBe(3);
    expect(cycle.getData({weapon_refine: 5, weapon_samosvist_attention: 'radiant'})
        .stats.get('text_number_energy')).toBe(5);
});

test('FrostScepter counts Cryo first, caps at four, and adds Radiance bonuses', () => {
    const effect = getWeapon('catalyst', 'FrostScepter').getConditions()[1];
    const party = {
        char_element: 'cryo',
        resonance_element_1: 'electro',
        resonance_element_2: 'cryo',
        resonance_element_3: 'electro',
    };

    let stats = effect.getStats({weapon_refine: 1, ...party});
    expect(stats.get('mastery')).toBe(48);
    expect(stats.get('atk_percent')).toBeCloseTo(9.6);
    expect(stats.get('dmg_stellarconduct')).toBe(0);

    stats = effect.getStats({weapon_refine: 1, weapon_frost_scepter_radiance: true, ...party});
    expect(stats.get('mastery')).toBe(128);
    expect(stats.get('atk_percent')).toBeCloseTo(9.6);
    expect(stats.get('dmg_stellarconduct')).toBe(24);
    expect(stats.get('dmg_stellarswirl')).toBe(24);

    stats = effect.getStats({
        weapon_refine: 5,
        weapon_frost_scepter_radiance: true,
        char_element: 'cryo',
        resonance_element_1: 'cryo',
        resonance_element_2: 'cryo',
        resonance_element_3: 'electro',
        resonance_element_4: 'electro',
    });
    expect(stats.get('mastery')).toBe(304);
    expect(stats.get('atk_percent')).toBeCloseTo(9.6);
    expect(stats.get('dmg_stellarconduct')).toBe(48);
});

test('Bludnye models Hymn/Triumph holder HP and off-field party ATK without a loop', () => {
    const weapon = getWeapon('catalyst', 'Bludnye');
    const staticEffect = weapon.getConditions()[0];
    const stacks = getCondition(weapon, 'weapon_bludnye_stacks');
    const party = WeaponBuffs.getConditions().find(
        (condition) => condition.getName() === 'weapon_other.weapon_bludnye',
    );

    expect(staticEffect.getStats({weapon_refine: 1}).get('healing')).toBe(8);
    expect(staticEffect.getStats({weapon_refine: 5}).get('healing')).toBe(16);
    expect(stacks.getStats({weapon_refine: 1, weapon_bludnye_mode: 'hymn'}, 3)
        .get('hp_percent')).toBe(15);
    expect(stacks.getStats({weapon_refine: 1, weapon_bludnye_mode: 'triumph'}, 3)
        .get('hp_percent')).toBeCloseTo(26.25);

    expect(party.getStats({
        'weapon_other.weapon_bludnye': 1,
        weapon_bludnye_holder_hp: 40999,
        'weapon_other.weapon_bludnye_mode': 'hymn_3',
    }).get('atk_percent')).toBe(0);
    expect(party.getStats({
        'weapon_other.weapon_bludnye': 1,
        weapon_bludnye_holder_hp: 60000,
        'weapon_other.weapon_bludnye_mode': 'hymn_3',
    }).get('atk_percent')).toBe(15);
    expect(party.getStats({
        'weapon_other.weapon_bludnye': 1,
        weapon_bludnye_holder_hp: 60000,
        'weapon_other.weapon_bludnye_mode': 'triumph_3',
    }).get('atk_percent')).toBeCloseTo(26.25);
    expect(party.getStats({
        'weapon_other.weapon_bludnye': 5,
        weapon_bludnye_holder_hp: 150000,
        'weapon_other.weapon_bludnye_mode': 'triumph_3',
    }).get('atk_percent')).toBeCloseTo(57.75);

    const activeHymn = weapon.getPostEffects().filter((effect) => effect.isActive({
        weapon_bludnye_stacks: 3,
        weapon_bludnye_mode: 'hymn',
    }));
    const activeTriumph = weapon.getPostEffects().filter((effect) => effect.isActive({
        weapon_bludnye_stacks: 3,
        weapon_bludnye_mode: 'triumph',
    }));
    expect(activeHymn).toHaveLength(1);
    expect(activeHymn[0].params.statCap.getValue(1)).toBe(15);
    expect(activeTriumph).toHaveLength(1);
    expect(activeTriumph[0].params.statCap.getValue(5)).toBeCloseTo(57.75);
});

test('Windtalker threshold refreshes one non-stacking party bonus at R1/R5', () => {
    const weapon = getWeapon('bow', 'Windtalker');
    const staticEffect = weapon.getConditions()[0];
    const threshold = weapon.getConditions()[2];
    const party = WeaponBuffs.getConditions().find(
        (condition) => condition.getName() === 'weapon_other.weapon_windtalker',
    );

    expect(staticEffect.getStats({weapon_refine: 1}).get('recharge')).toBe(20);
    expect(staticEffect.getStats({weapon_refine: 5}).get('recharge')).toBe(40);
    expect(threshold.getData({weapon_refine: 1, weapon_windtalker_points: 2})
        .stats.get('dmg_stellarswirl')).toBe(0);
    expect(threshold.getData({weapon_refine: 1, weapon_windtalker_points: 3})
        .stats.get('dmg_stellarswirl')).toBe(24);
    expect(threshold.getData({weapon_refine: 1, weapon_windtalker_points: 9})
        .stats.get('dmg_stellarswirl')).toBe(24);
    expect(party.getStats({'weapon_other.weapon_windtalker': 5})
        .get('dmg_stellarconduct')).toBe(48);
    expect(party.getStats({'weapon_other.weapon_windtalker': 5})
        .get('dmg_stellarswirl')).toBe(48);
});

test('Bludnye and Windtalker party controls use normal condition handling', () => {
    const wrappers = WeaponBuffs.getConditions().filter((condition) => [
        'weapon_other.weapon_bludnye',
        'weapon_other.weapon_windtalker',
    ].includes(condition.getName()));
    expect(wrappers).toHaveLength(2);

    const controls = Condition.unwrap(wrappers);
    expect(controls).toHaveLength(4);
});
