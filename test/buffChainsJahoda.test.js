import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild } from './support/team';

global.DB = DB;

// md/buff_chains.md: Jahoda's C6 CRIT (CRIT Rate +5%, CRIT DMG +40% for
// Moonsign characters at Ascendant Gleam) is a flat bonus the game writes
// into the extra part (Avatar_Jahoda_Constellation_6_buff:
// Actor_CriticalExtraDelta, Actor_CriticalHurtExtraDelta). It counts in the
// receivers' totals and not in their premod values.
//
// Jahoda and Flins are Nod-Krai characters: two of them give Ascendant
// Gleam. Rosaria and Bennett are not Moonsign characters.

function setup(constellation, settings, second = 'Flins') {
    const jahoda = makeBuild('Jahoda');
    jahoda.setCharLevels({level: 90, ascension: 6, constellation});
    jahoda.setCharSettings(settings);
    const other = makeBuild(second);
    const rosaria = makeBuild('Rosaria');
    const team = Team.fromMember(jahoda);
    team.setMember(1, other);
    team.setMember(2, rosaria);
    team.setMember(3, makeBuild('Bennet'));
    team.setOnFieldMember(jahoda);
    return {jahoda, other, rosaria};
}

function crit(build) {
    const stats = finalStats(build);
    return {
        rate: stats.get('crit_rate'),
        dmg: stats.get('crit_dmg'),
        rateExtra: stats.get('crit_rate_extra') || 0,
        dmgExtra: stats.get('crit_dmg_extra') || 0,
    };
}

const ON = {jahoda_c6_crit_bonus: true};

test('C6 at Ascendant Gleam: Jahoda and a Moonsign member gain extra CRIT', () => {
    const off = setup(6, {});
    const on = setup(6, ON);
    for (const member of ['jahoda', 'other']) {
        const before = crit(off[member]);
        const after = crit(on[member]);
        expect(after.rate - before.rate).toBeCloseTo(0.05, 9);
        expect(after.dmg - before.dmg).toBeCloseTo(0.4, 9);
        expect(after.rateExtra - before.rateExtra).toBeCloseTo(0.05, 9);
        expect(after.dmgExtra - before.dmgExtra).toBeCloseTo(0.4, 9);
    }
});

test('C6 does not reach a member who is not a Moonsign character', () => {
    const off = crit(setup(6, {}).rosaria);
    const on = crit(setup(6, ON).rosaria);
    expect(on.rate).toBeCloseTo(off.rate, 9);
    expect(on.dmg).toBeCloseTo(off.dmg, 9);
    expect(on.rateExtra).toBeCloseTo(off.rateExtra, 9);
});

test('C6 gives nothing below Ascendant Gleam or below C6', () => {
    // Jahoda alone among Moonsign characters: Nascent Gleam.
    const nascentOff = crit(setup(6, {}, 'Xiangling').jahoda);
    const nascentOn = crit(setup(6, ON, 'Xiangling').jahoda);
    expect(nascentOn.rate).toBeCloseTo(nascentOff.rate, 9);
    expect(nascentOn.rateExtra).toBeCloseTo(nascentOff.rateExtra, 9);

    const c5Off = crit(setup(5, {}).jahoda);
    const c5On = crit(setup(5, ON).jahoda);
    expect(c5On.rate).toBeCloseTo(c5Off.rate, 9);
    expect(c5On.dmg).toBeCloseTo(c5Off.dmg, 9);
});
