import { Artifact } from '../src/js/classes/Artifact';
import { describeManualProvenance, initialTierMatches } from '../src/js/classes/ArtifactMetadata';
import { DB } from '../src/js/db/DB';

global.DB = DB;
global.UI = {Lang: {get: () => ''}};

// Level-0 5-star flower: three active single-roll lines, values above tiers.
function lineArtifact({level = 0, inactive = null} = {}) {
    const art = new Artifact(5, level, 'flower', 'GladiatorFinale', 'hp');
    art.addStat('crit_rate', 7.0);
    art.addStat('crit_dmg', 14.0);
    art.addStat('atk_percent', 11.6);
    if (inactive) art.addUnactivatedStat(inactive.stat, inactive.value);
    return art;
}

function fullForm(overrides = {}) {
    return {
        lines: 3, crafted: false, pair: [],
        initials: {crit_rate: 3.5, crit_dmg: 7.0, atk_percent: 5.8},
        ...overrides,
    };
}

test('complete 3-line draft normalizes cleanly and serializes as v3', () => {
    const art = lineArtifact();
    const {input, errors} = describeManualProvenance(art, fullForm());
    expect(errors).toEqual([]);
    expect(input).toEqual({
        totalRolls: 3, elixirCrafted: false,
        initialValues: {crit_rate: 3.5, crit_dmg: 7.0, atk_percent: 5.8},
    });
    art.setMetadata(input);
    expect(art.serialize()[0]).toBe(3);
    expect(art.getInitialLineCount()).toBe(3);
});

test('totalRolls derives from level, inactive fourth row stays allowed', () => {
    const art = lineArtifact({inactive: {stat: 'recharge', value: 5.2}});
    const {input, errors} = describeManualProvenance(art, fullForm({lines: 3}));
    expect(errors).toEqual([]);
    expect(input.totalRolls).toBe(3);
    const leveled = lineArtifact({level: 8});
    leveled.addStat('recharge', 15.6);
    const leveledForm = fullForm({initials: {...fullForm().initials, recharge: 5.2}});
    expect(describeManualProvenance(leveled, leveledForm).input.totalRolls).toBe(5);
});

test('missing line count is reported and drops totalRolls', () => {
    const {input, errors} = describeManualProvenance(lineArtifact(), fullForm({lines: null}));
    expect(input.totalRolls).toBeUndefined();
    expect(errors).toContain('provenance_lines');
});

test('line count inconsistent with entered rows is reported', () => {
    const art = lineArtifact();
    art.addStat('recharge', 5.2);
    const {input, errors} = describeManualProvenance(art, fullForm({lines: 3}));
    expect(input.totalRolls).toBeUndefined();
    expect(errors).toContain('provenance_lines');
});

test('missing initial roll for any active row is reported', () => {
    const {input, errors} = describeManualProvenance(lineArtifact(),
        fullForm({initials: {crit_rate: 3.5, crit_dmg: 7.0}}));
    expect(input.initialValues?.atk_percent).toBeUndefined();
    expect(errors).toContain('provenance_initial');
    expect(errors).not.toContain('provenance_lines');
});

test('impossible initial tier is rejected per row', () => {
    const {input, errors} = describeManualProvenance(lineArtifact(),
        fullForm({initials: {crit_rate: 99, crit_dmg: 7.0, atk_percent: 5.8}}));
    expect(input.initialValues?.crit_rate).toBeUndefined();
    expect(errors).toContain('provenance_initial');
});

test('crafted pair is required when crafted, kept sorted, ignored when ordinary', () => {
    const art = lineArtifact();
    expect(describeManualProvenance(art, fullForm({crafted: true})).errors).toContain('provenance_pair');
    expect(describeManualProvenance(art, fullForm({crafted: true, pair: ['crit_rate']})).errors)
        .toContain('provenance_pair');
    const {input, errors} = describeManualProvenance(art,
        fullForm({crafted: true, pair: ['crit_dmg', 'crit_rate']}));
    expect(errors).toEqual([]);
    expect(input).toMatchObject({elixirCrafted: true, definedSubstats: ['crit_dmg', 'crit_rate']});
    art.setMetadata(input);
    expect(art.isCrafted()).toBe(true);
    const ordinary = describeManualProvenance(lineArtifact(), fullForm({pair: ['crit_dmg', 'crit_rate']}));
    expect(ordinary.errors).toEqual([]);
    expect(ordinary.input.definedSubstats).toBeUndefined();
});

test('stored v3 draft round-trips through serialization', () => {
    const art = lineArtifact();
    const {input, errors} = describeManualProvenance(art, fullForm());
    expect(errors).toEqual([]);
    art.setMetadata(input);
    const clone = Artifact.deserialize(art.serialize());
    expect(clone.getMetadata()).toEqual(art.getMetadata());
    expect(clone.getInitialLineCount()).toBe(3);
});

test('display-rounded initials match their literal tier and are preserved verbatim', () => {
    expect(initialTierMatches(13.62, 14, 1)).toBe(true);
    expect(initialTierMatches(5.83, 5.8, 10)).toBe(true);
    expect(initialTierMatches(3.5, 3.5, 10)).toBe(true);
    expect(initialTierMatches(5.25, 5.2, 10)).toBe(false);
    expect(initialTierMatches(2.72, 3.5, 10)).toBe(false);
    const art = lineArtifact();
    art.addStat('recharge', 5.8);
    const {input, errors} = describeManualProvenance(art, fullForm({
        lines: 4, initials: {...fullForm().initials, recharge: 5.8},
    }));
    expect(errors).toEqual([]);
    expect(input.initialValues.atk_percent).toBe(5.8);
    art.setMetadata(input);
    expect(Artifact.deserialize(art.serialize()).getMetadata()).toEqual(art.getMetadata());
});
