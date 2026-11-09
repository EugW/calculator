import { BuildData } from "../src/js/classes/Build/Data";
import { CalcSet } from "../src/js/classes/CalcSet";
import { Weapons as PartyWeaponBuffs } from "../src/js/db/Buffs/Weapons";
import { DB } from "../src/js/db/DB";
import { Lang } from "../src/js/ui/Lang";

global.window = {};
global.localStorage = {};
require("../src/js/lang/eng.js");
global.UI = {Lang: new Lang()};
global.DB = DB;

function weapon(type, key) {
    return DB.Weapons.get(type).get(key);
}

function applyWeapon(item, settings) {
    const data = new BuildData(settings, {});
    for (const condition of item.getConditions()) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }
    return data.stats;
}

const moonsignChars = DB.Chars.getKeys(true)
    .map((key) => DB.Chars.get(key))
    .filter((char) => char.getOrigin() === 'nodkrai');
const nascentGleam = {char_id: moonsignChars[0].getId()};
const ascendantGleam = {char_id: moonsignChars[0].getId(), party_char_1: moonsignChars[1].getId()};

const generatedPassives = [
    ['sword', 'AthameArtis'],
    ['sword', 'SerenitysCall'],
    ['sword', 'MoonweaversDawn'],
    ['bow', 'TheDaybreakChronicles'],
    ['bow', 'SnareHook'],
    ['bow', 'RainbowSerpentsRainBow'],
    ['claymore', 'MasterKey'],
    ['catalyst', 'NightweaversLookingGlass'],
    ['catalyst', 'ReliquaryOfTruth'],
    ['catalyst', 'EtherlightSpindlelute'],
    ['catalyst', 'BlackmarrowLantern'],
    ['catalyst', 'DawningFrost'],
    ['polearm', 'BloodsoakedRuins'],
    ['polearm', 'ProspectorsShovel'],
    ['polearm', 'SacrificersStaff'],
];

test.each(generatedPassives)('%s %s renders its generated passive at R1 and R5', (type, key) => {
    const item = weapon(type, key);
    const described = item.getConditions().filter((condition) => condition.params.description);
    expect(described.length).toBeGreaterThan(0);
    for (const refine of [1, 5]) {
        for (const condition of described) {
            expect(condition.getTitle()).toBeTruthy();
            const text = condition.getDescription(condition.getStats({weapon_refine: refine}));
            expect(text).toBeTruthy();
            expect(text).not.toContain('?');
            expect(text).not.toContain('%{');
        }
    }
});

test('party weapon buffs reuse the generated descriptions', () => {
    const buffs = PartyWeaponBuffs.getConditions();
    const nightweaver = buffs.find((condition) => condition.getName() === 'weapon_other.weapon_nightweavers_looking_glass');
    const athame = buffs.find((condition) => condition.getName() === 'weapon_other.weapon_athame_artis');
    expect(nightweaver.params.description).toBe('talent_descr.weapon_nightweavers_looking_glass_3');
    expect(athame.params.description).toBe('talent_descr.weapon_athame_artis_2');

    const athameText = athame.getDescription(athame.getStats({'weapon_other.weapon_athame_artis': 5}));
    expect(athameText).toContain('40%');
    expect(athameText).toContain('32%');
    expect(athameText).not.toContain('?');

    // Before a refinement is picked the panel falls back to R1 values.
    const nightweaverText = nightweaver.getDescription(nightweaver.getStats({}));
    expect(nightweaverText).toContain('120%');
    expect(nightweaverText).toContain('80%');
    expect(nightweaverText).toContain('40%');
    const athameIdle = athame.getDescription(athame.getStats({}));
    expect(athameIdle).toContain('20%');
    expect(athameIdle).toContain('16%');
});

test('every party weapon buff description renders before a refinement is picked', () => {
    const broken = PartyWeaponBuffs.getConditions()
        .filter((condition) => condition.params.description)
        .filter((condition) => condition.getDescription(condition.getStats({})).includes('?'))
        .map((condition) => condition.getName());
    expect(broken).toEqual([]);
});

test.each([
    ['sword', 'SerenitysCall', 'weapon_serenitys_call', 'hp_percent', 16, 32],
    ['bow', 'SnareHook', 'weapon_snare_hook', 'mastery', 60, 120],
    ['claymore', 'MasterKey', 'weapon_master_key', 'mastery', 60, 120],
])('%s %s: Moonsign: Ascendant Gleam doubles the reaction bonus', (type, key, toggle, stat, r1, r5) => {
    const item = weapon(type, key);
    expect(applyWeapon(item, {weapon_refine: 1, ...ascendantGleam}).get(stat)).toBe(0);
    expect(applyWeapon(item, {weapon_refine: 1, ...nascentGleam, [toggle]: true}).get(stat)).toBe(r1);
    expect(applyWeapon(item, {weapon_refine: 1, ...ascendantGleam, [toggle]: true}).get(stat)).toBe(r1 * 2);
    expect(applyWeapon(item, {weapon_refine: 5, ...ascendantGleam, [toggle]: true}).get(stat)).toBe(r5 * 2);
});

test("Blackmarrow Lantern and Prospector's Shovel use release values and the Ascendant Gleam bonus", () => {
    const lantern = weapon('catalyst', 'BlackmarrowLantern');
    let stats = applyWeapon(lantern, {weapon_refine: 1, ...nascentGleam});
    expect(stats.get('dmg_reaction_bloom')).toBe(48);
    expect(stats.get('dmg_reaction_lunarbloom')).toBe(12);
    stats = applyWeapon(lantern, {weapon_refine: 5, ...ascendantGleam});
    expect(stats.get('dmg_reaction_bloom')).toBe(96);
    expect(stats.get('dmg_reaction_lunarbloom')).toBe(48);

    const shovel = weapon('polearm', 'ProspectorsShovel');
    stats = applyWeapon(shovel, {weapon_refine: 1, ...nascentGleam});
    expect(stats.get('dmg_reaction_electrocharged')).toBe(48);
    expect(stats.get('dmg_reaction_lunarcharged')).toBe(12);
    expect(applyWeapon(shovel, {weapon_refine: 1, ...ascendantGleam}).get('dmg_reaction_lunarcharged')).toBe(24);
});

test.each([
    ['Keqing', 1, 20 + 28],
    ['Furina', 1, 20 + 16],
    ['Ayaka', 1, 20],
    ['Skirk', 1, 20],
    ['Keqing', 5, 40 + 56],
])("Moonweaver's Dawn on %s at R%i gives %i%% Burst DMG from Energy Capacity", (charKey, refine, expected) => {
    const settings = {weapon_refine: refine, char_id: DB.Chars.get(charKey).getId()};
    expect(applyWeapon(weapon('sword', 'MoonweaversDawn'), settings).get('dmg_burst')).toBe(expected);
});

test('Ascendant Gleam follows the party members picked in the Buffs tab in a full build', () => {
    const holder = moonsignChars.find((char) => char.weapon === 'catalyst');
    const moonsignTeammate = moonsignChars.find((char) => char !== holder);
    const outsider = DB.Chars.get('Albedo');
    expect(outsider.getOrigin()).not.toBe('nodkrai');

    function buildData(weaponKey, partyIds) {
        const build = new CalcSet();
        build.setChar(holder);
        build.setCharLevels({level: 90, ascension: 6, constellation: 0});
        build.setWeapon(weapon('catalyst', weaponKey));
        build.setEnemy(DB.Enemies.getFirst().getFirst());
        build.setPartyChars(partyIds);
        return build.getBuildData();
    }
    // Blackmarrow Lantern's own Lunar-Bloom contribution, measured against a passive-less catalyst.
    function lanternLunarBloom(partyIds) {
        const lantern = buildData('BlackmarrowLantern', partyIds);
        const plain = buildData('ApprenticesNotes', partyIds);
        return {
            moonsign: lantern.settings.party_moonsign,
            bonus: lantern.stats.get('dmg_reaction_lunarbloom') - plain.stats.get('dmg_reaction_lunarbloom'),
        };
    }

    // Full builds store percent stats as fractions (12% -> 0.12).
    const nascent = lanternLunarBloom([outsider.getId()]);
    expect(nascent.moonsign).toBe(1);
    expect(nascent.bonus).toBeCloseTo(0.12, 6);
    const ascendant = lanternLunarBloom([moonsignTeammate.getId()]);
    expect(ascendant.moonsign).toBe(2);
    expect(ascendant.bonus).toBeCloseTo(0.24, 6);
});
