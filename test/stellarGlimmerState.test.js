import { BuildSettings } from "../src/js/classes/Build/Settings";
import { CalcObject } from "../src/js/classes/CalcObject";
import { CalcSet } from "../src/js/classes/CalcSet";
import {
    ConditionRadianceStellarGlimmer,
    RADIANCE_STELLARCONDUCT,
    RADIANCE_STELLARSWIRL,
    getRadianceStellarGlimmerMode,
} from "../src/js/classes/Condition/RadianceStellarGlimmer";
import { Diona } from "../src/js/db/Char/Diona";
import { Mizuki } from "../src/js/db/Char/Mizuki";
import { Odette } from "../src/js/db/Char/Odette";
import { Qiqi } from "../src/js/db/Char/Qiqi";
import { Sandrone } from "../src/js/db/Char/Sandrone";
import { TravelerCryo } from "../src/js/db/Char/TravelerCryo";
import { Vesna } from "../src/js/db/Char/Vesna";
import { DB } from "../src/js/db/DB";

const conductName = 'test_radiance_stellarconduct';
const swirlName = 'test_radiance_stellarswirl';

test('normalizing a Conduct state does not synthesize its Swirl sibling', () => {
    const settings = new BuildSettings({[conductName]: true});

    expect(settings[conductName]).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(settings, swirlName)).toBe(false);
});

test('Radiance: Stellar-Conduct wins whenever both mode flags qualify', () => {
    const settings = new BuildSettings({
        [conductName]: true,
        [swirlName]: true,
        'party.test_radiance_stellarconduct': true,
        'party.test_radiance_stellarswirl': true,
    });

    expect(settings[conductName]).toBe(true);
    expect(settings[swirlName]).toBe(false);
    expect(settings['party.test_radiance_stellarconduct']).toBe(true);
    expect(settings['party.test_radiance_stellarswirl']).toBe(false);
});

test('Radiance settings remain exclusive across set and concat updates', () => {
    const settings = new BuildSettings({[conductName]: true});

    settings.set(swirlName, true);
    expect(settings[swirlName]).toBe(false);

    settings.set(conductName, false);
    settings.set(swirlName, true);
    expect(settings[swirlName]).toBe(true);

    settings.concat({[conductName]: true});
    expect(settings[conductName]).toBe(true);
    expect(settings[swirlName]).toBe(false);
});

test('shared Radiance condition helper applies Conduct priority to plain saved settings', () => {
    const saved = {[conductName]: true, [swirlName]: true};
    const conduct = new ConditionRadianceStellarGlimmer({
        conductName,
        swirlName,
        mode: RADIANCE_STELLARCONDUCT,
    });
    const swirl = new ConditionRadianceStellarGlimmer({
        conductName,
        swirlName,
        mode: RADIANCE_STELLARSWIRL,
    });

    expect(getRadianceStellarGlimmerMode(saved, conductName, swirlName)).toBe(RADIANCE_STELLARCONDUCT);
    expect(conduct.isActive(saved)).toBe(true);
    expect(swirl.isActive(saved)).toBe(false);
});

test('stored Radiance state does not restore Swirl after Conduct is turned off', () => {
    const object = new CalcObject();

    object.setSettings({[swirlName]: true});
    object.modifySettings({[conductName]: true});
    expect(object.getSettings()).toMatchObject({
        [conductName]: true,
        [swirlName]: false,
    });

    object.modifySettings({[conductName]: false});
    expect(object.getSettings()).toMatchObject({
        [conductName]: false,
        [swirlName]: false,
    });
});

test('addSettings persists the same Conduct-priority exclusivity as other updates', () => {
    const object = new CalcObject();

    object.addSettings({[swirlName]: true});
    object.addSettings({[conductName]: true});
    expect(object.getSettings()).toMatchObject({
        [conductName]: true,
        [swirlName]: false,
    });
});

test.each([
    [
        'Diona',
        'party.diona_cats_tail_radiance_stellarconduct',
        'party.diona_cats_tail_radiance_stellarswirl',
    ],
    [
        'Qiqi',
        'party.qiqi_herald_of_frost_radiance_stellarconduct',
        'party.qiqi_herald_of_frost_radiance_stellarswirl',
    ],
])('%s party settings retain Conduct priority under paired mode names', (
    character,
    partyConductName,
    partySwirlName,
) => {
    const object = new CalcObject();

    object.setSettings({
        [partyConductName]: true,
        [partySwirlName]: true,
    });
    expect(object.getSettings()).toMatchObject({
        [partyConductName]: true,
        [partySwirlName]: false,
    });
});

function getNamedCondition(conditions, name) {
    const condition = conditions.find((item) => item.getName() === name);
    expect(condition).toBeDefined();
    return condition;
}

test.each([
    ['Diona', Diona, 'diona_radiance_stellarconduct', 'diona_radiance_stellarswirl'],
    ['Qiqi', Qiqi, 'qiqi_radiance_stellarconduct', 'qiqi_radiance_stellarswirl'],
    ['Sandrone', Sandrone, 'sandrone_radiance_stellarconduct', 'sandrone_radiance_stellarswirl'],
    ['Traveler Cryo', TravelerCryo, 'traveler_cryo_radiance_stellarconduct', 'traveler_cryo_radiance_stellarswirl'],
    ['Odette', Odette, 'odette_radiance_stellarconduct', 'odette_radiance_stellarswirl'],
])('%s self Radiance controls use Conduct-priority red-cross gates', (
    characterName,
    character,
    selfConductName,
    selfSwirlName,
) => {
    const conditions = character.getAllConditions();
    const conduct = getNamedCondition(conditions, selfConductName);
    const swirl = getNamedCondition(conditions, selfSwirlName);

    expect(conduct.checkSubconditions({polestar_field: true})).toBe(true);
    expect(conduct.checkSubconditions({
        polestar_field: true,
        [selfSwirlName]: true,
    })).toBe(true);
    expect(swirl.checkSubconditions({})).toBe(true);
    expect(swirl.checkSubconditions({[selfConductName]: true})).toBe(false);
});

test.each([
    [
        'Odette',
        Odette,
        'party.odette_radiance_stellarconduct',
        'party.odette_radiance_stellarswirl',
        true,
    ],
    [
        'Diona',
        Diona,
        'party.diona_cats_tail_radiance_stellarconduct',
        'party.diona_cats_tail_radiance_stellarswirl',
        false,
    ],
    [
        'Qiqi',
        Qiqi,
        'party.qiqi_herald_of_frost_radiance_stellarconduct',
        'party.qiqi_herald_of_frost_radiance_stellarswirl',
        false,
    ],
])('%s party Radiance controls use Conduct-priority red-cross gates', (
    characterName,
    character,
    partyConductName,
    partySwirlName,
    requiresPolestar,
) => {
    const conditions = character.getPartyConditions();
    const conduct = getNamedCondition(conditions, partyConductName);
    const swirl = getNamedCondition(conditions, partySwirlName);
    const baseSettings = requiresPolestar ? {polestar_field: true} : {};

    expect(conduct.checkSubconditions(baseSettings)).toBe(true);
    expect(conduct.checkSubconditions({
        ...baseSettings,
        [partySwirlName]: true,
    })).toBe(true);
    expect(swirl.checkSubconditions({})).toBe(true);
    expect(swirl.checkSubconditions({[partyConductName]: true})).toBe(false);
});

test.each([
    ['Mizuki', Mizuki, 'mizuki_radiance_stellarswirl'],
    ['Vesna', Vesna, 'vesna_radiance_stellarswirl'],
])('%s Swirl control becomes a red cross while Polestar Field is active', (
    characterName,
    character,
    selfSwirlName,
) => {
    const swirl = getNamedCondition(character.getAllConditions(), selfSwirlName);

    expect(swirl.checkSubconditions({})).toBe(true);
    expect(swirl.checkSubconditions({polestar_field: true})).toBe(false);
});

test.each([
    ['Mizuki', 'mizuki_radiance_stellarswirl'],
    ['Vesna', 'vesna_radiance_stellarswirl'],
])('%s Swirl state stays cleared after Polestar Field is turned off', (
    character,
    selfSwirlName,
) => {
    const previousDB = global.DB;
    global.DB = DB;

    try {
        const calc = new CalcSet();

        calc.setCharSettings({[selfSwirlName]: true});
        calc.modifyBuffsSettings({polestar_field: true});
        expect(calc.char.getSettings()[selfSwirlName]).toBe(false);

        calc.modifyBuffsSettings({polestar_field: false});
        expect(calc.char.getSettings()[selfSwirlName]).toBe(false);
    } finally {
        global.DB = previousDB;
    }
});

test('rotation-style addSettings updates cannot restore a Polestar-blocked Swirl state', () => {
    const previousDB = global.DB;
    global.DB = DB;

    try {
        const calc = new CalcSet();
        const swirlSettings = {
            mizuki_radiance_stellarswirl: true,
            vesna_radiance_stellarswirl: true,
        };

        calc.char.addSettings(swirlSettings);
        calc.buffs.addSettings({polestar_field: true});
        calc.normalizeRadianceStellarGlimmerSettings();
        expect(calc.char.getSettings()).toMatchObject({
            mizuki_radiance_stellarswirl: false,
            vesna_radiance_stellarswirl: false,
        });

        calc.buffs.addSettings({polestar_field: false});
        calc.normalizeRadianceStellarGlimmerSettings();
        expect(calc.char.getSettings()).toMatchObject({
            mizuki_radiance_stellarswirl: false,
            vesna_radiance_stellarswirl: false,
        });
    } finally {
        global.DB = previousDB;
    }
});
