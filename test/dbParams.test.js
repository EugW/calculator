import { percent, plus, times } from '../src/js/db/Params';
import { charTalentTables } from '../src/js/db/generated/CharTalentTables';
import { weaponPassiveTables } from '../src/js/db/generated/WeaponPassiveTables';
import { artifactSetTables } from '../src/js/db/generated/ArtifactSetTables';

describe('percent() turns a raw game param into the calculator percent', () => {
    test('it is exact where multiplying by 100 is not', () => {
        // The plain product carries float noise that would reach stats and
        // description numbers.
        expect(0.022 * 100).not.toBe(2.2);
        expect(1.1 * 100).not.toBe(110);
        expect(0.07 * 100).not.toBe(7);
        expect(percent(0.022)).toBe(2.2);
        expect(percent(1.1)).toBe(110);
        expect(percent(0.07)).toBe(7);
        expect(percent(0.004)).toBe(0.4);
        expect(percent(-0.15)).toBe(-15);
    });

    test('small ratios keep their digits', () => {
        // 0.0035% of ATK per point (a Stellar base bonus ratio).
        expect(percent(0.000035)).toBe(0.0035);
        expect(percent(0.00007)).toBe(0.007);
    });

    test('a weapon param is scaled for every refinement', () => {
        expect(percent([0.008, 0.01, 0.012, 0.014, 0.016])).toEqual([0.8, 1, 1.2, 1.4, 1.6]);
    });

    test('generated values scale to the numbers typed by hand so far', () => {
        // Sigewinne C6: 0.4% CRIT Rate and 2.2% CRIT DMG per 1,000 HP.
        const c6 = charTalentTables.Sigewinne.c6;
        expect(percent(c6.p1)).toBe(0.4);
        expect(percent(c6.p2)).toBe(2.2);
        expect(percent(c6.p4)).toBe(20);
        expect(percent(c6.p5)).toBe(110);
        // Staff of Homa: 0.8%..1.6% of Max HP as ATK; its HP bonus is given by
        // the passive itself and is already in percent.
        expect(percent(weaponPassiveTables.StaffofHoma.p2)).toEqual([0.8, 1, 1.2, 1.4, 1.6]);
        expect(weaponPassiveTables.StaffofHoma.hp_percent).toEqual([20, 25, 30, 35, 40]);
        expect(artifactSetTables.BlizzardStrayer.pc2.dmg_cryo).toBe(15);
        expect(percent(artifactSetTables.BlizzardStrayer.pc4.p1)).toBe(20);
    });
});

describe('times() and plus() combine game params without float noise', () => {
    test('the plain operations are not exact', () => {
        expect(0.56 * 0.75 * 100).not.toBe(42);
        expect(24 * 0.003).not.toBe(0.072);
        expect(0.1 + 0.2).not.toBe(0.3);
    });

    test('numbers', () => {
        expect(times(0.24, 0.3)).toBe(0.072);
        expect(times(24, 0.003)).toBe(0.072);
        expect(percent(times(0.56, 0.75))).toBe(42);
        expect(plus(0.1, 0.2)).toBe(0.3);
        expect(plus(1, 0.1)).toBe(1.1);
        expect(times(0.2, plus(1, 0.75))).toBe(0.35);
        expect(times(0.0035, 400, 100)).toBe(140);
        expect(times(30000, 1)).toBe(30000);
        expect(times(0.000035, 2)).toBe(0.00007);
    });

    test('a list with a number: every refinement', () => {
        // "Increased by 100% while shielded", a negated list, a team's 30% share.
        expect(percent(times([0.04, 0.05, 0.06, 0.07, 0.08], 2))).toEqual([8, 10, 12, 14, 16]);
        expect(percent(times([0.1, 0.1, 0.1, 0.1, 0.1], -1))).toEqual([-10, -10, -10, -10, -10]);
        expect(times([0.24, 0.3, 0.36, 0.42, 0.48], 0.3)).toEqual([0.072, 0.09, 0.108, 0.126, 0.144]);
        expect(plus([0.36, 0.42, 0.48, 0.54, 0.6], 0.1)).toEqual([0.46, 0.52, 0.58, 0.64, 0.7]);
    });

    test('two lists: element by element', () => {
        expect(percent(times([0.2, 0.25, 0.3, 0.35, 0.4], [0.75, 0.75, 0.75, 0.75, 0.75])))
            .toEqual([15, 18.75, 22.5, 26.25, 30]);
        expect(plus([1, 2, 3], [0.1, 0.2, 0.3])).toEqual([1.1, 2.2, 3.3]);
        // A per-stack value by its stack counts.
        expect(times(percent(0.06), [1, 2, 3, 4])).toEqual([6, 12, 18, 24]);
    });

    test('lists of different lengths are an error', () => {
        expect(() => times([1, 2, 3], [1, 2])).toThrow();
        expect(() => plus([1], [1, 2, 3, 4, 5])).toThrow();
    });

    test('generated values', () => {
        // Wandering Evenstar: 24%..48% of EM as ATK, 30% of that to the party.
        const evenstar = weaponPassiveTables.WanderingEvenstar;
        expect(times(evenstar.p2, evenstar.p4)).toEqual([0.072, 0.09, 0.108, 0.126, 0.144]);
    });
});
