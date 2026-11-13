import { BuildData } from "../src/js/classes/Build/Data";
import { LEGACY_WEAPON_ROWS } from "../src/js/classes/Legacy/Floating";
import { Team } from "../src/js/classes/Team";
import { RECEIVERS } from "../src/js/classes/Team/Receivers";
import { DB } from "../src/js/db/DB";
import { Lang } from "../src/js/ui/Lang";
import { finalStats, makeBuild } from "./support/team";

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

const charKeys = DB.Chars.getKeys(true);
const moonsignKeys = charKeys.filter((key) => DB.Chars.get(key).getOrigin() === 'nodkrai');

/**
 * The weapon on a character that is not from Nod-Krai, in a team with that
 * many Nod-Krai members: Moonsign is the team's (0 none, 1 Nascent Gleam, 2
 * Ascendant Gleam).
 *
 * @returns {CalcSet} the wielder
 */
function wield(type, key, refine, moonsign, settings = {}) {
    const holder = charKeys.find((charKey) => DB.Chars.get(charKey).weapon === type && !moonsignKeys.includes(charKey));
    const build = makeBuild(holder);
    build.setWeapon(weapon(type, key));
    build.setWeaponLevels({level: 90, ascension: 6, refine});
    build.setWeaponSettings(settings);
    const team = Team.fromMember(build);
    moonsignKeys.slice(0, moonsign).forEach((charKey, index) => team.setMember(index + 1, makeBuild(charKey)));
    expect(build.getBuildData().settings.party_moonsign || 0).toBe(moonsign);
    return build;
}

/**
 * What the weapon's passive gives its wielder in such a team, in the units
 * of its description: against the same team with the passive's control off,
 * or (plain) with a weapon of the same type that has no passive.
 */
function passive(type, key, refine, moonsign, stat, toggle, plain) {
    const on = finalStats(wield(type, key, refine, moonsign, toggle ? {[toggle]: true} : {})).get(stat);
    const off = finalStats(toggle ? wield(type, key, refine, moonsign) : wield(type, plain, 1, moonsign)).get(stat);
    return (on - off) * (stat === 'mastery' ? 1 : 100);
}

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

// The released Buffs tab had rows of its own for these two weapons; what
// they give the team is the weapons' own controls now (Legacy/Floating).
test('the effects that reach the team use the generated descriptions', () => {
    const control = (type, key, name) => weapon(type, key).getConditions().find((condition) => condition.getName() === name);
    const nightweaver = control('catalyst', 'NightweaversLookingGlass', 'weapon_nightweavers_looking_glass_3');
    const athame = control('sword', 'AthameArtis', 'weapon_athame_artis');
    expect(nightweaver.params.receivers).toBe(RECEIVERS.TEAM);
    expect(nightweaver.params.description).toBe('talent_descr.weapon_nightweavers_looking_glass_3');
    expect(athame.params.description).toBe('talent_descr.weapon_athame_artis_2');

    const athameText = athame.getDescription(athame.getStats({weapon_refine: 5}));
    expect(athameText).toContain('40%');
    expect(athameText).toContain('32%');
    expect(athameText).not.toContain('?');

    const nightweaverText = nightweaver.getDescription(nightweaver.getStats({weapon_refine: 1}));
    expect(nightweaverText).toContain('120%');
    expect(nightweaverText).toContain('80%');
    expect(nightweaverText).toContain('40%');
    const athameR1 = athame.getDescription(athame.getStats({weapon_refine: 1}));
    expect(athameR1).toContain('20%');
    expect(athameR1).toContain('16%');
});

test('every weapon of the released Buffs tab renders its descriptions at each refinement', () => {
    const broken = [];
    for (const row of LEGACY_WEAPON_ROWS) {
        const item = weapon(row.type, row.weapon);
        for (const condition of item.getConditions().filter((cond) => cond.params.description)) {
            for (let refine = 1; refine <= item.getMaxRefinement(); ++refine) {
                if (condition.getDescription(condition.getStats({weapon_refine: refine})).includes('?')) {
                    broken.push(row.weapon + ' R' + refine + ' ' + condition.params.description);
                }
            }
        }
    }
    expect(broken).toEqual([]);
});

test.each([
    ['sword', 'SerenitysCall', 'weapon_serenitys_call', 'hp_percent', 16, 32],
    ['bow', 'SnareHook', 'weapon_snare_hook', 'mastery', 60, 120],
    ['claymore', 'MasterKey', 'weapon_master_key', 'mastery', 60, 120],
])('%s %s: Moonsign: Ascendant Gleam doubles the reaction bonus', (type, key, toggle, stat, r1, r5) => {
    // Without the control the weapon gives nothing, whatever the Moonsign.
    expect(finalStats(wield(type, key, 1, 2)).get(stat)).toBeCloseTo(finalStats(wield(type, key, 1, 0)).get(stat), 10);
    expect(passive(type, key, 1, 1, stat, toggle)).toBeCloseTo(r1, 8);
    expect(passive(type, key, 1, 2, stat, toggle)).toBeCloseTo(r1 * 2, 8);
    expect(passive(type, key, 5, 2, stat, toggle)).toBeCloseTo(r5 * 2, 8);
});

test("Blackmarrow Lantern and Prospector's Shovel use release values and the Ascendant Gleam bonus", () => {
    const lantern = (refine, moonsign, stat) => passive('catalyst', 'BlackmarrowLantern', refine, moonsign, stat, null, 'ApprenticesNotes');
    expect(lantern(1, 1, 'dmg_reaction_bloom')).toBeCloseTo(48, 8);
    expect(lantern(1, 1, 'dmg_reaction_lunarbloom')).toBeCloseTo(12, 8);
    expect(lantern(5, 2, 'dmg_reaction_bloom')).toBeCloseTo(96, 8);
    expect(lantern(5, 2, 'dmg_reaction_lunarbloom')).toBeCloseTo(48, 8);

    const shovel = (refine, moonsign, stat) => passive('polearm', 'ProspectorsShovel', refine, moonsign, stat, null, 'BeginnersProtector');
    expect(shovel(1, 1, 'dmg_reaction_electrocharged')).toBeCloseTo(48, 8);
    expect(shovel(1, 1, 'dmg_reaction_lunarcharged')).toBeCloseTo(12, 8);
    expect(shovel(1, 2, 'dmg_reaction_lunarcharged')).toBeCloseTo(24, 8);
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

test('Ascendant Gleam follows the members of the team', () => {
    const holderKey = moonsignKeys.find((key) => DB.Chars.get(key).weapon === 'catalyst');
    const teammateKey = moonsignKeys.find((key) => key !== holderKey);
    expect(DB.Chars.get('Albedo').getOrigin()).not.toBe('nodkrai');

    function buildData(weaponKey, teammate) {
        const build = makeBuild(holderKey);
        build.setWeapon(weapon('catalyst', weaponKey));
        Team.fromMember(build).setMember(1, makeBuild(teammate));
        return build.getBuildData();
    }
    // Blackmarrow Lantern's own Lunar-Bloom contribution, measured against a passive-less catalyst.
    function lanternLunarBloom(teammate) {
        const lantern = buildData('BlackmarrowLantern', teammate);
        const plain = buildData('ApprenticesNotes', teammate);
        return {
            moonsign: lantern.settings.party_moonsign,
            bonus: lantern.stats.get('dmg_reaction_lunarbloom') - plain.stats.get('dmg_reaction_lunarbloom'),
        };
    }

    // Full builds store percent stats as fractions (12% -> 0.12).
    const nascent = lanternLunarBloom('Albedo');
    expect(nascent.moonsign).toBe(1);
    expect(nascent.bonus).toBeCloseTo(0.12, 6);
    const ascendant = lanternLunarBloom(teammateKey);
    expect(ascendant.moonsign).toBe(2);
    expect(ascendant.bonus).toBeCloseTo(0.24, 6);
});
