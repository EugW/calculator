import fs from "fs";
import path from "path";

import { EnkaApi } from "../src/js/classes/API/Enka";
import { CalcObjectWeapon } from "../src/js/classes/CalcObject/Weapon";
import { DB } from "../src/js/db/DB";
import {
    getWeaponScenarioContextSettings,
    normalizeWeaponScenarioList,
} from "../src/js/ui/Tab/WeaponSuggest/utils";

global.DB = DB;

const WEAPONS = [
    ['sword', 'DullBlade', 264, 11101, 10000002, 'sword_blunt'],
    ['claymore', 'WasterGreatsword', 265, 12101, 10000016, 'claymore_aniki'],
    ['polearm', 'BeginnersProtector', 266, 13101, 10000023, 'pole_gewalt'],
    ['catalyst', 'ApprenticesNotes', 267, 14101, 10000014, 'catalyst_apprentice'],
    ['bow', 'HuntersBow', 268, 15101, 10000021, 'bow_hunters'],
];

test.each(WEAPONS)('%s %s has its imported 1-star identity and limits', (
    type,
    key,
    serializeId,
    gameId,
) => {
    const weapon = DB.Weapons.get(type).get(key);

    expect(weapon).toBeDefined();
    expect(weapon.getId()).toBe(serializeId);
    expect(weapon.getGameId()).toBe(gameId);
    expect(weapon.getRarity()).toBe(1);
    expect(weapon.getMaxLevel()).toBe(70);
    expect(weapon.getMaxAscension()).toBe(4);
    expect(weapon.getMaxRefinement()).toBe(1);
    expect(weapon.getConditions()).toHaveLength(0);
    expect(weapon.statTable).toHaveLength(1);
    expect(weapon.statTable[0].getName()).toBe('atk_base');
    expect(weapon.statTable[0].getValue(1, 0)).toBeCloseTo(23.245, 3);
    expect(weapon.statTable[0].getValue(70, 4)).toBeCloseTo(185, 0);
});

test.each(WEAPONS)('%s %s clamps and round-trips its supported progression', (
    type,
    key,
) => {
    const weapon = DB.Weapons.get(type).get(key);
    const calcWeapon = new CalcObjectWeapon();
    calcWeapon.set(weapon);
    calcWeapon.setLevels({level: 90, ascension: 6, refine: 5});

    expect(calcWeapon.getLevels()).toEqual({level: 70, ascension: 4, refine: 1});

    const serialized = calcWeapon.serialize({});
    const restored = CalcObjectWeapon.deserialize([...serialized]);
    expect(restored.get().getGameId()).toBe(weapon.getGameId());
    expect(restored.getLevels()).toEqual({level: 70, ascension: 4, refine: 1});

    expect(CalcObjectWeapon.deserialize([
        weapon.getId(),
        71,
        4,
        1,
        0,
    ])).toBeNull();
});

test('weapon suggestions expose one meaningful refinement for 1-star weapons', () => {
    const weapon = DB.Weapons.get('sword').get('DullBlade');
    const scenario = normalizeWeaponScenarioList(
        weapon,
        {},
        {weapon_refine: 5},
        weapon.getRarity(),
    )[''];

    expect(scenario.refine).toEqual({
        1: true,
        2: false,
        3: false,
        4: false,
        5: false,
    });
    expect(getWeaponScenarioContextSettings(
        weapon,
        scenario,
        {weapon_refine: 5},
    ).weapon_refine).toBe(1);
});

test('Enka imports every equipped 1-star weapon and respects its source cap', () => {
    const avatarInfoList = WEAPONS.map(([
        ,
        ,
        ,
        weaponGameId,
        avatarId,
    ]) => ({
        avatarId: avatarId,
        propMap: {
            '1002': {ival: '6'},
            '4001': {ival: '90'},
        },
        equipList: [{
            itemId: weaponGameId,
            weapon: {
                level: 90,
                promoteLevel: 6,
                affixMap: {},
            },
        }],
        talentIdList: [],
        skillLevelMap: {},
    }));

    const result = new EnkaApi().processData(
        JSON.stringify({avatarInfoList: avatarInfoList}),
        'uid',
    );

    expect(result.characters).toHaveLength(WEAPONS.length);
    expect(result.characters.map(({set}) => ({
        gameId: set.getWeapon().get().getGameId(),
        levels: set.getWeapon().getLevels(),
    }))).toEqual(WEAPONS.map(([, , , gameId]) => ({
        gameId: gameId,
        levels: {level: 70, ascension: 4, refine: 1},
    })));
});

test.each(WEAPONS)('%s %s has source, display, and sprite image assets', (
    type,
    key,
    _serializeId,
    _gameId,
    _avatarId,
    imageName,
) => {
    const root = process.cwd();
    const sourcePath = path.join(root, 'data/images/weapons', `UI_EquipIcon_${
        imageName.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join('_')
    }.png`);
    const displayPath = path.join(root, `src/images/weapons/${type}/${imageName}.png`);
    const display2xPath = path.join(root, `src/images/weapons/${type}/${imageName}_2x.png`);
    const css = fs.readFileSync(
        path.join(root, `src/css/generated/icons_weapons_${type}.css`),
        'utf8',
    );

    for (const filePath of [sourcePath, displayPath, display2xPath]) {
        const data = fs.readFileSync(filePath);
        expect([...data.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    }
    expect(fs.readFileSync(displayPath).readUInt32BE(16)).toBe(80);
    expect(fs.readFileSync(display2xPath).readUInt32BE(16)).toBe(160);
    expect(css).toContain(DB.Weapons.get(type).get(key).getIcon());
});
