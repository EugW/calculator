import { CHANNELS } from '../src/js/classes/PostEffect/Channels';
import { PostEffectStats } from '../src/js/classes/PostEffect/Stats';
import { StatTable } from '../src/js/classes/StatTable';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery, withSource } from './support/team';

global.DB = DB;

// md/buff_chains.md: Furina's C2 Fanfare-overflow HP% is a premod (non-extra)
// write (game: UNIQUE_Furina_Constellation_6_Buff writes Actor_MaxHPRatio),
// and her A4 Unheard Confession reads total HP (game:
// Furina_PermanentSkill_2_Handler reads FIGHT_PROP_MAX_HP).
//
// Game-formula constants used below (ability data / game text):
// - overflow point = 1 Fanfare above 400, worth 0.35% Max HP, capped at 140%.
// - Key of Khaj-Nisut R1: self EM 0.12% of max HP per Grand Hymn stack,
//   party EM 0.2% of the wielder's max HP at 3 stacks.
// - A4: Salon Member DMG +0.7% per 1000 Max HP (0.000007 per HP), cap 28%.
// Only the builds' base inputs (hp_base, base EM) are read from the engine;
// every expected number is computed from those formulas.

// Furina (Key of Khaj-Nisut R1, 3 Grand Hymn stacks) plus Xiangling, fresh
// builds every time so post-effects apply exactly once.
function makeTeam(fanfare, constellation) {
    const furina = makeBuild('Furina');
    furina.setCharLevels({level: 90, ascension: 6, constellation});
    furina.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    furina.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    furina.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    furina.setCharSettings({furina_fanfare_stacks: fanfare});
    const team = Team.fromMember(furina);
    const xiangling = makeBuild('Xiangling');
    xiangling.setWeapon(DB.Weapons.get('polearm').get('Catch'));
    xiangling.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(1, xiangling);
    team.setOnFieldMember(furina);
    return {furina, xiangling};
}

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

describe('Furina C2 overflow HP (premod write)', () => {
    test('fanfare at the 400 limit writes no HP; Key and A4 match the no-overflow values', () => {
        const {furina, xiangling} = makeTeam(400, 2);
        const stats = finalStats(furina);

        // No extra-lane HP anywhere: the C2 write is premod.
        expect(stats.get('hp_percent_extra') || 0).toBeCloseTo(0, 9);
        expect(stats.get('hp_extra') || 0).toBeCloseTo(0, 9);

        const hp = totalHp(stats);
        // Key R1 at 3 stacks: self 3 x 0.12% and party 0.2% of her HP.
        expect(totalMastery(stats) - stats.get('mastery_base')).toBeCloseTo(0.0056 * hp, 6);
        const mate = finalStats(xiangling);
        expect(totalMastery(mate) - mate.get('mastery_base')).toBeCloseTo(0.002 * hp, 6);
        // A4: 0.000007 per HP.
        expect(stats.get('dmg_skill_furina')).toBeCloseTo(Math.min(0.28, 0.000007 * hp), 9);
    });

    test('800 fanfare writes +140% premod HP, counted by Key EM and her own A4', () => {
        const atCap = makeTeam(400, 2);
        const baseStats = finalStats(atCap.furina);
        const baseHp = baseStats.get('hp_base');
        const hpAt400 = totalHp(baseStats);

        const {furina, xiangling} = makeTeam(800, 2);
        const stats = finalStats(furina);

        // Game formula: (800 - 400) x 0.35% = 140%, capped at 140%, of base HP.
        const expectedHp = hpAt400 + baseHp * 1.4;
        expect(totalHp(stats)).toBeCloseTo(expectedHp, 6);
        // Still a premod write: nothing lands in the extra lanes.
        expect(stats.get('hp_percent_extra') || 0).toBeCloseTo(0, 9);
        expect(stats.get('hp_extra') || 0).toBeCloseTo(0, 9);

        // The Key (total HP read, buff/keyofkhajnisut) now counts the C2 HP.
        expect(totalMastery(stats) - stats.get('mastery_base')).toBeCloseTo(0.0056 * expectedHp, 6);
        const mate = finalStats(xiangling);
        expect(totalMastery(mate) - mate.get('mastery_base')).toBeCloseTo(0.002 * expectedHp, 6);
        // Her own A4 (total HP read) counts it too.
        expect(stats.get('dmg_skill_furina')).toBeCloseTo(Math.min(0.28, 0.000007 * expectedHp), 9);
    });

    test('below the limit (300 fanfare) C2 is exactly C0: no phantom HP', () => {
        const c2 = makeTeam(300, 2);
        const c0 = makeTeam(300, 0);
        const stats2 = finalStats(c2.furina);
        const stats0 = finalStats(c0.furina);

        expect(totalHp(stats2)).toBeCloseTo(totalHp(stats0), 9);
        expect(stats2.get('dmg_skill_furina')).toBeCloseTo(stats0.get('dmg_skill_furina'), 9);
        expect(totalMastery(stats2)).toBeCloseTo(totalMastery(stats0), 9);
    });
});

describe('Furina A4 reads total HP', () => {
    // No shipped character, weapon or set writes extra HP (md/buff_chains.md),
    // so the only way to tell a total HP read from a premod one apart is a
    // synthetic extra HP% write scaling on total ATK (nothing here writes
    // ATK, so the base is stable). The premod control next to it pins the rig.
    function syntheticHp(writes) {
        const furina = makeBuild('Furina');
        furina.setCharLevels({level: 90, ascension: 6, constellation: 0});
        furina.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        furina.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        furina.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        furina.setCharSettings({furina_fanfare_stacks: 0});
        withSource(furina, [], [
            new PostEffectStats({
                from: 'atk*',
                // 0.0005 per ATK; the +HP fraction is read back below from
                // the same build's total ATK, so no number is hardcoded.
                percent: new StatTable('hp_percent', [0.05]),
                writes,
            }),
        ], {}, []);
        Team.fromMember(furina);
        return furina;
    }

    function plainSolo() {
        const furina = makeBuild('Furina');
        furina.setCharLevels({level: 90, ascension: 6, constellation: 0});
        furina.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        furina.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        furina.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        furina.setCharSettings({furina_fanfare_stacks: 0});
        Team.fromMember(furina);
        return furina;
    }

    test('A4 counts an extra HP write; the Key counts it too (total HP read)', () => {
        const plain = finalStats(plainSolo());
        const plainHp = totalHp(plain);
        const hpBase = plain.get('hp_base');
        // The synthetic write's HP fraction, from the game formula with the
        // build's own total ATK as the input (0.05% per ATK).
        const added = hpBase * (0.05 / 100) * totalAtk(plain);

        const stats = finalStats(syntheticHp(CHANNELS.TOTAL));
        expect(totalHp(stats)).toBeCloseTo(plainHp + added, 6);
        // Total read: the A4 bonus grows with the extra HP.
        expect(stats.get('dmg_skill_furina')).toBeCloseTo(
            Math.min(0.28, 0.000007 * (plainHp + added)), 9);
        // Total read too (the Key, buff/keyofkhajnisut): the game computes
        // both Key EM parts from FIGHT_PROP_MAX_HP
        // (UNIQUE_Sword_Deshret_Stack_MasteryUp and
        // UNIQUE_Sword_Deshret_MasteryUp_Team), so the extra HP is counted:
        // R1 self 3 x 0.12% plus party 0.2% of it.
        expect(totalMastery(stats)).toBeCloseTo(totalMastery(plain) + 0.0056 * added, 6);
    });

    test('control: a premod HP write is counted by both', () => {
        const plain = finalStats(plainSolo());
        const plainHp = totalHp(plain);
        const hpBase = plain.get('hp_base');
        const added = hpBase * (0.05 / 100) * totalAtk(plain);

        const stats = finalStats(syntheticHp(CHANNELS.PREMOD));
        const expectedHp = plainHp + added;
        expect(totalHp(stats)).toBeCloseTo(expectedHp, 6);
        expect(stats.get('dmg_skill_furina')).toBeCloseTo(Math.min(0.28, 0.000007 * expectedHp), 9);
        expect(totalMastery(stats) - totalMastery(plain)).toBeCloseTo(0.0056 * added, 6);
    });
});
