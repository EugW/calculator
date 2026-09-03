import { artifactInitialRollOptions, artifactRollCounts, artifactRollDraft, artifactRollTotalOptions } from '../src/js/classes/ArtifactRollDraft';
import { DB } from '../src/js/db/DB';

global.DB = DB;

test.each([1, 2, 3, 4, 5])('rarity %i slider options contain all and only attainable totals, with valid roll pills', rarity => {
    for (const stat of DB.Artifacts.Substats.getKeys()) {
        const data = DB.Artifacts.Substats.get(stat);
        const tiers = data.rolls[rarity - 1];
        const maximum = DB.Artifacts.Rarity[rarity - 1].maxUpgrades;
        const scale = data.type === 'percent' ? 10 : 1;
        const display = units => Math.round((units / 100 + 1e-8) * scale) / scale;
        const expected = new Set();
        let sums = new Set([0]);
        for (let count = 1; count <= maximum; ++count) {
            sums = new Set([...sums].flatMap(sum => tiers.map(tier => sum + Math.round(tier * 100))));
            for (const sum of sums) expected.add(display(sum));
        }
        const options = artifactRollTotalOptions(stat, rarity);
        expect(options.map(option => option.total)).toEqual([...expected].sort((a, b) => a - b));
        for (const option of options) {
            expect(option.steps.length).toBeGreaterThan(0);
            expect(option.steps.length).toBeLessThanOrEqual(maximum);
            const raw = option.steps.reduce((sum, step) => {
                const tier = tiers[step.rarity - 2];
                expect(Number(step.value)).toBe(display(Math.round(tier * 100)));
                return sum + Math.round(tier * 100);
            }, 0);
            expect(display(raw)).toBe(option.total);
        }
    }
});

test('crit sliders skip gaps and roll pills preserve rounding after summation', () => {
    expect(artifactRollTotalOptions('crit_rate', 5).slice(0, 5).map(option => option.total))
        .toEqual([2.7, 3.1, 3.5, 3.9, 5.4]);
    const damage = artifactRollTotalOptions('crit_dmg', 5).find(option => option.total === 15.5);
    expect(damage.steps.map(step => Number(step.value))).toEqual([7.8, 7.8]);
});

test('rounded and precise ATK% initials select one stable option, with identical constraints', () => {
    const rounded = artifactInitialRollOptions('atk_percent', 5, 4.1);
    expect(rounded).toEqual(artifactInitialRollOptions('atk_percent', 5, 4.08));
    expect(rounded.map(option => option.label)).toEqual(['4.1%', '4.7%', '5.3%', '5.8%']);
    expect(rounded.filter(option => option.selected)).toEqual([{value: 4.08, label: '4.1%', selected: true}]);
    expect(artifactRollDraft('atk_percent', 5, 16.3, 4.1).totals)
        .toEqual(artifactRollDraft('atk_percent', 5, 16.3, 4.08).totals);
});

test('flat initial values use the same option identity at imported and exact precision', () => {
    expect(artifactInitialRollOptions('atk', 5, 14)).toEqual(artifactInitialRollOptions('atk', 5, 13.62));
});

test('indistinguishable low-rarity tiers share an option without inventing exact precision', () => {
    const options = artifactInitialRollOptions('atk', 3, 7);
    expect(new Set(options.map(option => option.label)).size).toBe(options.length);
    expect(options.find(option => option.selected)).toEqual({value: 7, label: '7', selected: true});
    expect(artifactInitialRollOptions('atk', 3, 6.54)).toEqual(options);
    expect(artifactInitialRollOptions('atk', 3, 7.47)).toEqual(options);
});

test('automatic multi-roll breakdowns do not fabricate an initial value', () => {
    const draft = artifactRollDraft('crit_rate', 5, 7.8);
    expect(draft.steps).toHaveLength(2);
    expect(draft.last).toBe(0);
    expect(draft.initialValue).toBeUndefined();
    expect(artifactRollDraft('crit_rate', 5, 3.9).initialValue).toBe(3.9);
    expect(artifactRollDraft('atk', 3, 7).initialValue).toBe(7);
});

test('the first roll stays first, even when enhancements have lower tiers', () => {
    const draft = artifactRollDraft('crit_rate', 5, 6.6, 3.89);
    expect(draft.steps.map(step => Number(step.value))).toEqual([3.9, 2.7]);
    expect(draft.total).toBe(6.6);
    expect(draft.last).toBe(0);
});

test('forcing an incompatible initial roll finds the closest reachable total', () => {
    const draft = artifactRollDraft('crit_rate', 5, 7.8, 2.72);
    expect(draft.total).toBe(8.2);
    expect(draft.last).toBe(-0.4);
    expect(draft.initialValue).toBe(2.72);
    expect(artifactRollDraft('crit_rate', 5, draft.total, 2.72).last).toBe(0);
    expect(artifactRollDraft('crit_rate', 5, 0, 3.89).total).toBe(3.9);
    expect(artifactRollDraft('crit_rate', 5, 999, 2.72).total).toBe(22.2);
});

test('raw rolls are added before rounding, for both percent and flat stats', () => {
    expect(artifactRollDraft('crit_dmg', 5, 15.5, 7.77).total).toBe(15.5);
    expect(artifactRollDraft('def', 5, 46, 23.15).total).toBe(46);
    expect(artifactRollDraft('def', 5, 93, 23.15).total).toBe(93);
});

test('display-rounded imported values are preserved while constraining canonical tiers', () => {
    const draft = artifactRollDraft('crit_rate', 5, 7.8, 3.9);
    expect(draft.initialValue).toBe(3.9);
    expect(draft.total).toBe(7.8);
    expect(draft.last).toBe(0);
    const rounded = artifactRollDraft('atk', 3, 7, 7);
    expect(rounded.initialValue).toBe(7);
    expect(rounded.totals).toContain(13);
    expect(rounded.totals).toContain(15);
});

test('releasing a lock restores automatic inference without retaining a fabricated first roll', () => {
    const locked = artifactRollDraft('crit_rate', 5, 7.8, 2.72);
    const automatic = artifactRollDraft('crit_rate', 5, locked.total);
    expect(automatic.total).toBe(8.2);
    expect(automatic.initialValue).toBeUndefined();
    expect(automatic.totals).toBeUndefined();
});

test.each([1, 2, 3, 4, 5])('rarity %i reachable totals agree with an independent chronological enumeration', rarity => {
    for (const stat of ['crit_rate', 'atk', 'def']) {
        const tiers = DB.Artifacts.Substats.get(stat).rolls[rarity - 1];
        const count = DB.Artifacts.Rarity[rarity - 1].maxUpgrades;
        const scale = DB.Artifacts.Substats.get(stat).type === 'percent' ? 10 : 1;
        for (const first of tiers) {
            const totals = new Set();
            let units = new Set([Math.round(first * 100)]);
            for (let rolls = 1; rolls <= count; ++rolls) {
                for (const value of units) totals.add(Math.round((value / 100 + 1e-8) * scale) / scale);
                units = new Set([...units].flatMap(value => tiers.map(tier => value + Math.round(tier * 100))));
            }
            const actual = artifactRollDraft(stat, rarity, 10, first);
            expect(actual.totals).toEqual([...totals].sort((a, b) => a - b));
            for (const value of actual.totals) {
                const draft = artifactRollDraft(stat, rarity, value, first);
                expect(draft.last).toBe(0);
                expect(Number(draft.steps[0].value)).toBe(Math.round((first + 1e-8) * scale) / scale);
                expect(draft.steps.length).toBeLessThanOrEqual(count);
            }
        }
    }
});

test('roll counts from a known first roll are listed only when the displayed total allows them', () => {
    expect(artifactRollCounts('crit_rate', 5, 7.0, 3.9)).toEqual([2]);
    // 3.9 + 3 rolls and 3.9 + 4 rolls can both show 15.2.
    expect(artifactRollCounts('crit_rate', 5, 15.2, 3.9)).toEqual([4, 5]);
    expect(artifactRollCounts('crit_rate', 5, 1.0, 3.9)).toEqual([]);
});
