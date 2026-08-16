import { DB } from "../src/js/db/DB";

function getWeapon(type, key) {
    return DB.Weapons.get(type).get(key);
}

function getCondition(weapon, name) {
    return weapon.getConditions().find((condition) => condition.getName() === name);
}

test.each([
    ['sword', 'HereticsMoltenBlade', 246, 11435, 510, 'crit_rate_base', 27.6],
    ['sword', 'Emberwell', 247, 11436, 510, 'mastery_base', 165.384],
    ['sword', 'WhitelakeFrostfeather', 248, 11520, 674, 'crit_rate_base', 22.1],
    ['sword', 'ExaiphanesBlade', 249, 11521, 608, 'crit_rate_base', 33.1],
    ['claymore', 'ForgedByTheGoldenMelody', 250, 12435, 510, 'crit_rate_base', 27.6],
    ['claymore', 'BladeOfAtonement', 251, 12436, 565, 'atk_percent', 27.6],
    ['polearm', 'Frostbreath', 252, 13435, 510, 'recharge_base', 45.9],
    ['polearm', 'SongOfTheVigil', 253, 13436, 565, 'mastery_base', 110.256],
    ['catalyst', 'ClashOfKings', 254, 14435, 510, 'crit_rate_base', 27.6],
    ['catalyst', 'EchoesOfTheHeart', 255, 14436, 565, 'atk_percent', 27.6],
    ['bow', 'JadeVista', 256, 15435, 510, 'crit_rate_base', 27.6],
    ['bow', 'CovenantOfFrostAndSnow', 257, 15436, 510, 'def_percent', 51.7],
])('%s %s has stable 7.0 identity and L90 stats', (
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

test('stable reaction weapons expose both ordinary and Stellar Glimmer branches', () => {
    const emberwell = getWeapon('sword', 'Emberwell');
    expect(getCondition(emberwell, 'weapon_emberwell_reaction')
        .getStats({weapon_refine: 1}).get('atk_percent')).toBe(16);
    expect(getCondition(emberwell, 'weapon_emberwell_stellarglimmer')
        .getStats({weapon_refine: 5}).get('dmg_stellarglimmer')).toBe(32);

    const atonement = getWeapon('claymore', 'BladeOfAtonement');
    expect(getCondition(atonement, 'weapon_blade_of_atonement_reaction')
        .getStats({weapon_refine: 1}).get('mastery')).toBe(64);
    expect(getCondition(atonement, 'weapon_blade_of_atonement_stellarglimmer')
        .getStats({weapon_refine: 5}).get('atk_percent')).toBe(32);

    const echoes = getWeapon('catalyst', 'EchoesOfTheHeart');
    expect(getCondition(echoes, 'weapon_echoes_of_the_heart_reaction')
        .getStats({weapon_refine: 5}).get('mastery')).toBe(120);
    expect(getCondition(echoes, 'weapon_echoes_of_the_heart_stellarglimmer')
        .getStats({weapon_refine: 1}).get('dmg_stellarglimmer')).toBe(16);
});

test('Whitelake Frostfeather applies its threshold only at three stacks', () => {
    const weapon = getWeapon('sword', 'WhitelakeFrostfeather');
    const [stacks, threshold] = weapon.getConditions();

    expect(stacks.getStats({weapon_refine: 5}, 3).get('atk_percent')).toBe(48);
    expect(threshold.getData({weapon_refine: 5, weapon_whitelake_frostfeather: 2})
        .stats.get('crit_dmg_stellarglimmer')).toBe(0);
    expect(threshold.getData({weapon_refine: 5, weapon_whitelake_frostfeather: 3})
        .stats.get('crit_dmg_stellarglimmer')).toBe(110);
});

test('simple stable 7.0 passives retain their R1 and R5 values', () => {
    const frostbreath = getCondition(getWeapon('polearm', 'Frostbreath'), 'weapon_frostbreath');
    expect(frostbreath.getStats({weapon_refine: 1}).get('atk_percent')).toBe(20);
    expect(frostbreath.getStats({weapon_refine: 5}).get('text_number_energy')).toBe(12);

    const vigil = getCondition(getWeapon('polearm', 'SongOfTheVigil'), 'weapon_song_of_the_vigil_stellarglimmer');
    expect(vigil.getStats({weapon_refine: 1}).get('atk_percent')).toBe(20);
    expect(vigil.getStats({weapon_refine: 5}).get('atk_percent')).toBe(40);

    const clash = getCondition(getWeapon('catalyst', 'ClashOfKings'), 'weapon_clash_of_kings');
    expect(clash.getStats({weapon_refine: 1}).get('mastery')).toBe(100);
    expect(clash.getStats({weapon_refine: 5}).get('atk_percent')).toBe(40);

    const covenant = getCondition(getWeapon('bow', 'CovenantOfFrostAndSnow'), 'weapon_covenant_of_frost_and_snow');
    expect(covenant.getStats({weapon_refine: 1}).get('mastery')).toBe(120);
    expect(covenant.getStats({weapon_refine: 5}).get('mastery')).toBe(240);
});

test("Heretic's Molten Blade interpolates its refine-aware movement buff and removes it off-field", () => {
    const weapon = getWeapon('sword', 'HereticsMoltenBlade');
    const effect = getCondition(weapon, 'weapon_heretics_molten_blade');

    expect(effect.getData({
        weapon_refine: 1,
        weapon_heretics_molten_blade: true,
        weapon_heretics_molten_blade_distance: 0,
    }).stats.get('atk_percent')).toBeCloseTo(18);
    expect(effect.getData({
        weapon_refine: 1,
        weapon_heretics_molten_blade: true,
        weapon_heretics_molten_blade_distance: 3.5,
    }).stats.get('atk_percent')).toBeCloseTo(27);
    expect(effect.getData({
        weapon_refine: 1,
        weapon_heretics_molten_blade: true,
        weapon_heretics_molten_blade_distance: 8,
    }).stats.get('atk_percent')).toBeCloseTo(36);
    expect(effect.getData({
        weapon_refine: 5,
        weapon_heretics_molten_blade: true,
        weapon_heretics_molten_blade_distance: 7,
    }).stats.get('atk_percent')).toBeCloseTo(72);
    expect(effect.getData({
        weapon_refine: 5,
        weapon_heretics_molten_blade: false,
        weapon_heretics_molten_blade_distance: 7,
    }).stats.get('atk_percent')).toBe(0);
});

test('Exaiphanes Blade is Traveler-only and keeps its R1 resonance bonus at zero', () => {
    const weapon = getWeapon('sword', 'ExaiphanesBlade');
    const hit = getCondition(weapon, 'weapon_exaiphanes_blade_hit');
    const resonance = getCondition(weapon, 'weapon_exaiphanes_blade_resonated_elements');

    expect(hit.getData({
        char_name: 'traveler_anemo',
        weapon_refine: 1,
        weapon_exaiphanes_blade_hit: true,
    }).stats.get('atk_percent')).toBe(16);
    expect(hit.getData({
        char_name: 'traveler_cryo',
        weapon_refine: 5,
        weapon_exaiphanes_blade_hit: true,
    }).stats.get('atk_percent')).toBe(40);
    expect(hit.getData({
        char_name: 'traveler_cryo',
        weapon_refine: 5,
        weapon_exaiphanes_blade_hit: true,
    }).stats.get('text_number_energy')).toBe(5);
    expect(hit.getData({
        char_name: 'albedo',
        weapon_refine: 5,
        weapon_exaiphanes_blade_hit: true,
    }).stats.get('atk_percent')).toBe(0);

    expect(resonance.getData({
        char_name: 'traveler_dendro',
        weapon_refine: 1,
        weapon_exaiphanes_blade_resonated_elements: 7,
    }).stats.get('crit_dmg')).toBe(0);
    expect(resonance.getData({
        char_name: 'traveler_dendro',
        weapon_refine: 2,
        weapon_exaiphanes_blade_resonated_elements: 1,
    }).stats.get('crit_dmg')).toBe(6);
    expect(resonance.getData({
        char_name: 'traveler_dendro',
        weapon_refine: 5,
        weapon_exaiphanes_blade_resonated_elements: 8,
    }).stats.get('crit_dmg')).toBe(42);
    expect(resonance.getData({
        char_name: 'albedo',
        weapon_refine: 5,
        weapon_exaiphanes_blade_resonated_elements: 7,
    }).stats.get('crit_dmg')).toBe(0);
});

test('Forged by the Golden Melody cycles and stacks a matching copied mode', () => {
    const weapon = getWeapon('claymore', 'ForgedByTheGoldenMelody');
    const active = getCondition(weapon, 'weapon_forged_by_the_golden_melody_active');
    const copied = getCondition(weapon, 'weapon_forged_by_the_golden_melody_copied');

    expect(active.getData({weapon_refine: 1}).stats.get('atk_percent')).toBe(18);
    expect(active.getData({
        weapon_refine: 5,
        weapon_forged_by_the_golden_melody_active: 'mastery',
    }).stats.get('mastery')).toBe(240);
    expect(active.getData({
        weapon_refine: 1,
        weapon_forged_by_the_golden_melody_active: 'stellarglimmer',
    }).stats.get('dmg_stellarglimmer')).toBe(28);
    expect(copied.getData({weapon_refine: 5}).stats.get('atk_percent')).toBe(0);

    const activeAtk = active.getData({
        weapon_refine: 5,
        weapon_forged_by_the_golden_melody_active: 'atk',
    }).stats.get('atk_percent');
    const copiedAtk = copied.getData({
        weapon_refine: 5,
        weapon_forged_by_the_golden_melody_copied: 'atk',
    }).stats.get('atk_percent');
    expect(activeAtk + copiedAtk).toBe(72);
});

test('Jade Vista counts at most three party members and separates same-element first', () => {
    const weapon = getWeapon('bow', 'JadeVista');
    const [elements, , same, different] = weapon.getConditions();

    function partyStats(refine, party) {
        const settings = {
            weapon_refine: refine,
            char_element: 'cryo',
            ...party,
        };
        Object.assign(settings, elements.getData(settings).settings);
        return {
            same: same.getData(settings).stats,
            different: different.getData(settings).stats,
        };
    }

    let stats = partyStats(1, {
        resonance_element_1: 'cryo',
        resonance_element_2: 'cryo',
        resonance_element_3: 'hydro',
    });
    expect(stats.same.get('mastery')).toBe(128);
    expect(stats.different.get('atk_percent')).toBe(12);

    stats = partyStats(5, {
        resonance_element_1: 'cryo',
        resonance_element_2: 'cryo',
        resonance_element_3: 'cryo',
        resonance_element_4: 'hydro',
    });
    expect(stats.same.get('mastery')).toBe(384);
    expect(stats.different.get('atk_percent')).toBe(0);

    stats = partyStats(5, {
        resonance_element_1: 'hydro',
        resonance_element_2: 'pyro',
        resonance_element_3: 'electro',
        resonance_element_4: 'anemo',
    });
    expect(stats.same.get('mastery')).toBe(0);
    expect(stats.different.get('atk_percent')).toBe(72);

    const overCap = {
        weapon_refine: 1,
        party_elements_same: 2,
        party_elements_different: 3,
    };
    expect(same.getData(overCap).stats.get('mastery')).toBe(128);
    expect(different.getData(overCap).stats.get('atk_percent')).toBe(12);
});
