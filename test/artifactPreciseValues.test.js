import fs from 'fs';
import { Artifact } from '../src/js/classes/Artifact';
import { ImporterGood } from '../src/js/classes/Importer/Good';
import { importEnkaArtifact } from '../src/js/classes/API/Enka';
import { describeManualProvenance } from '../src/js/classes/ArtifactMetadata';
import { artifactActionOutcomeKey } from '../src/js/classes/ArtifactActionUnion';
import { visitMaxUpgradeVariants } from '../src/js/classes/ArtifactUpgradePredictor';
import { DB } from '../src/js/db/DB';

global.DB = DB;
global.UI = {Lang: {get: () => ''}};

// Scarlet Proof plume from the user's Irminsul roll-ID export: DEF% rolls 6.56, 5.83, 6.56
// total 18.95; Irminsul exported 18.9, the game shows 19.0.
const PLUME_IDS = [501204, 501244, 501224, 501093, 501092, 501222, 501202, 501093, 501223];

function plumeGood() {
    return {
        setKey: 'ScarletProof', slotKey: 'plume', mainStatKey: 'atk', level: 20, rarity: 5, totalRolls: 9,
        substats: [
            {key: 'critRate_', value: 7, initialValue: 3.9},
            {key: 'eleMas', value: 23, initialValue: 23},
            {key: 'critDMG_', value: 21, initialValue: 7.8},
            {key: 'def_', value: 18.9, initialValue: 6.6},
        ],
    };
}

function plumeEnka(ids = [...PLUME_IDS]) {
    return {
        itemId: DB.Artifacts.Sets.get('ScarletProof').itemIds[0],
        reliquary: {level: 21, appendPropIdList: ids},
        flat: {rankLevel: 5, equipType: 'EQUIP_NECKLACE', reliquaryMainstat: {mainPropId: 'FIGHT_PROP_ATTACK'},
            reliquarySubstats: [
                {appendPropId: 'FIGHT_PROP_CRITICAL', statValue: 7},
                {appendPropId: 'FIGHT_PROP_ELEMENT_MASTERY', statValue: 23},
                {appendPropId: 'FIGHT_PROP_CRITICAL_HURT', statValue: 21},
                {appendPropId: 'FIGHT_PROP_DEFENSE_PERCENT', statValue: 18.9},
            ]},
    };
}

const precise = art => Object.fromEntries(art.getSubStats().map((sub, i) => [sub.stat, art.getPreciseSubStatValues()[i]]));

// CRIT DMG 28.0 from a first roll of 7.0 in 4 rolls is 27.96 or 27.97; the other lines
// have one possible count, so totalRolls fixes CRIT DMG at 4 rolls.
function ambiguousGood(overrides = {}) {
    return {
        setKey: 'ShimenawasReminiscence', slotKey: 'plume', mainStatKey: 'atk', level: 20, rarity: 5, totalRolls: 9,
        substats: [
            {key: 'critDMG_', value: 28, initialValue: 7},
            {key: 'hp', value: 209, initialValue: 209},
            {key: 'def', value: 16, initialValue: 16},
            {key: 'eleMas', value: 49, initialValue: 16},
        ],
        ...overrides,
    };
}

test('Enka roll IDs give each line its exact total', () => {
    const art = importEnkaArtifact(plumeEnka());
    expect(art.getMetadata().appendPropIdList).toEqual(PLUME_IDS);
    // The imported 18.9 is corrected to the game's 19.0, which the IDs confirm.
    expect(art.getSubStats().map(sub => sub.value)).toEqual([7, 23, 21, 19]);
    const values = precise(art);
    expect(values.crit_rate).toBeCloseTo(7.00, 10);
    expect(values.mastery).toBeCloseTo(23.31, 10);
    expect(values.crit_dmg).toBeCloseTo(20.98, 10); // 7.77 + 6.22 + 6.99; the table says 20.977
    expect(values.def_percent).toBeCloseTo(18.95, 10);
});

test('first roll and roll count give the only possible total, as the IDs do', () => {
    const inferred = Artifact.fromGood(plumeGood());
    expect(inferred.getMetadata().appendPropIdList).toBeUndefined();
    expect(inferred.getPreciseSubStatValues()).toEqual(importEnkaArtifact(plumeEnka()).getPreciseSubStatValues());
});

test('ambiguous totals take their weighted mean, and roll IDs settle them', () => {
    // 27.96 is 6.99 four times (1 roll sequence of 64); 27.97 is 6.99 plus 5.44, 7.77,
    // 7.77 or 6.22, 6.99, 7.77 in any order (9 of 64). The table would say 27.973.
    const art = Artifact.fromGood(ambiguousGood());
    expect(precise(art).crit_dmg).toBeCloseTo((27.96 + 27.97 * 9) / 10, 10);
    expect(precise(art).mastery).toBeCloseTo(48.96, 10);

    // CRIT DMG 6.99, 6.99, 7.77, 6.22 = 27.97; HP 209.13; DEF 16.2; EM 16.32 × 3.
    const withIds = Artifact.fromGood(ambiguousGood());
    withIds.setMetadata({...withIds.getMetadata(), appendPropIdList: [501223, 501021, 501081, 501241, 501223, 501241, 501224, 501241, 501222]});
    expect(withIds.getMetadata().appendPropIdList).toHaveLength(9);
    expect(precise(withIds).crit_dmg).toBeCloseTo(27.97, 10);
});

test('without a roll count the table is used', () => {
    const data = plumeGood();
    delete data.totalRolls;
    const art = Artifact.fromGood(data);
    expect(art.getPreciseSubStatValues()).toEqual(art.getSubStats().map(sub =>
        DB.Artifacts.Substats.get(sub.stat).getPreciseValue(sub.value, 5)));
});

test.each([
    ['a value that no longer matches', (art, metadata) => { art.subStats[2].value = 21.8; return metadata; }],
    ['a different roll count', (art, metadata) => ({...metadata, totalRolls: 8})],
    ['a removed line', (art, metadata) => { art.subStats.pop(); return metadata; }],
])('the roll list is dropped after %s', (_, change) => {
    const art = importEnkaArtifact(plumeEnka());
    art.setMetadata(change(art, art.getMetadata()));
    expect(art.getMetadata().appendPropIdList).toBeUndefined();
});

test.each([[[999999]], [[401204, ...PLUME_IDS.slice(1)]], [PLUME_IDS.slice(1)], [[...PLUME_IDS, 501201]]])(
    'invalid roll IDs %p are not stored', ids => {
        const art = importEnkaArtifact(plumeEnka(ids));
        expect(art).not.toBeNull();
        expect(art.getMetadata().appendPropIdList).toBeUndefined();
    });

test('roll IDs are stored as v4; artifacts without them keep their format', () => {
    const art = importEnkaArtifact(plumeEnka());
    const serialized = art.serialize();
    expect(serialized[0]).toBe(4);
    const restored = Artifact.deserialize([...serialized]);
    expect(restored.getMetadata()).toEqual(art.getMetadata());
    expect(restored.serialize()).toEqual(serialized);
    expect(precise(restored)).toEqual(precise(art));

    const plain = Artifact.fromGood(plumeGood());
    expect(plain.serialize()[0]).toBe(3);

    // A v4 record must carry a list that still matches, and a v3 record none.
    const broken = [...serialized];
    broken[broken.length - 1] = 501224;
    expect(Artifact.deserialize(broken)).toBeNull();
    expect(Artifact.deserialize([3, ...serialized.slice(1)])).toBeNull();
});

test('the editor keeps the roll list on an unchanged save and drops it after an edit', () => {
    const art = importEnkaArtifact(plumeEnka());
    const form = {lines: 4, crafted: undefined, pair: [], initials: art.getMetadata().initialValues,
        appendPropIdList: art.getMetadata().appendPropIdList};
    expect(describeManualProvenance(art, form).input.appendPropIdList).toEqual(PLUME_IDS);

    const edited = art.clone();
    edited.subStats[0].value = 7.4;
    expect(describeManualProvenance(edited, form).input.appendPropIdList).toBeUndefined();
});

test('optimizer lowering uses the same exact values as calcStats', () => {
    const art = importEnkaArtifact(plumeEnka());
    const used = ['atk', 'crit_rate', 'crit_dmg', 'crit_value', 'def_percent', 'mastery'];
    const {keys, values, length} = Artifact.createOptimizerStatsLowering(used)(art);
    const stats = art.calcOptimizerStats(used);
    expect(length).toBe(Object.keys(stats).filter(key => used.includes(key)).length);
    for (let i = 0; i < length; ++i) expect(values[i]).toBe(stats[keys[i]]);
    expect(stats.crit_dmg).toBeCloseTo(0.2098, 12);
});

test('upgrade variants keep the exact value of every line they did not roll', () => {
    // A +0 3-line piece: every line is one roll, and the 4th line is known.
    const art = Artifact.fromGood({
        setKey: 'ShimenawasReminiscence', slotKey: 'plume', mainStatKey: 'atk', level: 0, rarity: 5, totalRolls: 3,
        substats: [
            {key: 'critDMG_', value: 7.8, initialValue: 7.8},
            {key: 'critRate_', value: 3.9, initialValue: 3.9},
            {key: 'atk_', value: 5.8, initialValue: 5.8},
        ],
        elixirCrafted: false,
        unactivatedSubstats: [{key: 'hp', value: 299, initialValue: 299}],
    });
    art.setMetadata({...art.getMetadata(), appendPropIdList: [501224, 501204, 501064]});
    expect(art.getMetadata().appendPropIdList).toHaveLength(3);
    const source = precise(art);
    expect(source.crit_dmg).toBeCloseTo(7.77, 10);

    let unchanged = 0;
    visitMaxUpgradeVariants(art, ({artifact: variant}) => {
        const values = precise(variant);
        for (const sub of art.getSubStats()) {
            if (variant.getSubStats().find(item => item.stat === sub.stat).value !== sub.value) continue;
            expect(values[sub.stat]).toBe(source[sub.stat]);
            ++unchanged;
        }
        expect(precise(variant.clone())).toEqual(values);
        expect(artifactActionOutcomeKey(variant, ['crit_value'])).toBe(artifactActionOutcomeKey(variant.clone(), ['crit_value']));
    });
    expect(unchanged).toBeGreaterThan(0);
});

test("GOOD roll IDs set the values, first rolls and roll count", () => {
    const art = Artifact.fromGood({...plumeGood(), appendPropIdList: [...PLUME_IDS]});
    expect(art.getMetadata().appendPropIdList).toEqual(PLUME_IDS);
    expect(art.getSubStats().map(sub => sub.value)).toEqual([7, 23, 21, 19]);
    expect(precise(art)).toEqual(precise(importEnkaArtifact(plumeEnka())));
    expect(art.serialize()[0]).toBe(4);

    // Without totalRolls or initial values, the IDs supply both.
    const bare = plumeGood();
    delete bare.totalRolls;
    for (const sub of bare.substats) delete sub.initialValue;
    const fromIds = Artifact.fromGood({...bare, appendPropIdList: [...PLUME_IDS]});
    expect(fromIds.getMetadata()).toEqual(art.getMetadata());

    // The roll IDs go back out on export and survive a round trip.
    const good = art.toGood();
    expect(good.appendPropIdList).toEqual(PLUME_IDS);
    expect(Artifact.fromGood(good).getMetadata()).toEqual(art.getMetadata());
    expect(Artifact.fromGood(plumeGood()).toGood().appendPropIdList).toBeUndefined();
});

test("GOOD roll IDs repair a half-way total that looks valid", () => {
    // CRIT DMG 5.44, 5.44, 6.99, 6.22, 6.22, 5.44 = 35.75: Irminsul adds these in float32
    // and exports 35.7, a value other rolls can reach, so only the IDs reveal 35.8.
    const good = {setKey: "ShimenawasReminiscence", slotKey: "plume", mainStatKey: "atk", level: 20, rarity: 5, totalRolls: 9,
        substats: [
            {key: "critDMG_", value: 35.7, initialValue: 5.4},
            {key: "hp", value: 209, initialValue: 209},
            {key: "def", value: 16, initialValue: 16},
            {key: "eleMas", value: 16, initialValue: 16},
        ]};
    expect(Artifact.fromGood(good).getSubStats()[0].value).toBe(35.7);
    const art = Artifact.fromGood({...good, appendPropIdList: [501221, 501021, 501081, 501241, 501221, 501223, 501222, 501222, 501221]});
    expect(art.getSubStats()[0].value).toBe(35.8);
    expect(precise(art).crit_dmg).toBeCloseTo(35.75, 10);
});

test.each([
    ["a value the rolls cannot show", good => { good.substats[2].value = 21.8; }],
    ["a first roll the rolls contradict", good => { good.substats[0].initialValue = 3.5; }],
    ["a roll count that differs", good => { good.totalRolls = 8; }],
    ["a roll of another rarity", good => { good.appendPropIdList[0] = 401204; }],
])("GOOD roll IDs are ignored for %s", (_, change) => {
    const good = {...plumeGood(), appendPropIdList: [...PLUME_IDS]};
    change(good);
    const art = Artifact.fromGood(good);
    expect(art).not.toBeNull();
    expect(art.getMetadata().appendPropIdList).toBeUndefined();
});

// Opt-in: an Irminsul export with roll IDs (appendPropIdList). The IDs are the truth;
// without them a line gets that exact value, or a weighted mean of candidate totals
// that on 4★ and 5★ lines differ by at most 0.01.
(process.env.ARTIFACT_GOOD_FIXTURE ? test : test.skip)("real roll IDs import and agree with the inferred values", () => {
    const text = fs.readFileSync(process.env.ARTIFACT_GOOD_FIXTURE, "utf8").replace(/^﻿/, "");
    const source = JSON.parse(text);
    const items = new ImporterGood().process(text).items;
    const stripped = JSON.parse(text);
    for (const input of stripped.artifacts) delete input.appendPropIdList;
    const plain = new ImporterGood().process(JSON.stringify(stripped)).items;
    const counts = {artifacts: 0, lines: 0, exact: 0, estimated: 0, maxError: 0, repaired: 0};
    source.artifacts.forEach((input, i) => {
        // A line-less artifact has an empty list, which carries nothing and is not stored.
        if (!input.appendPropIdList?.length) return;
        ++counts.artifacts;
        expect(items[i].getMetadata().appendPropIdList).toEqual(input.appendPropIdList);
        expect(Artifact.fromGood(items[i].toGood()).getMetadata()).toEqual(items[i].getMetadata());
        const truth = precise(items[i]), inferred = precise(plain[i]);
        for (const {stat, value} of items[i].getSubStats()) {
            ++counts.lines;
            if (plain[i].getSubStats().find(sub => sub.stat === stat).value !== value) { ++counts.repaired; continue; }
            if (inferred[stat] === truth[stat]) ++counts.exact;
            else {
                const error = Math.abs(inferred[stat] - truth[stat]);
                // 3★ ATK rolls of 6.54 and 7.47 both show as 7, so a +0 line can be 0.465 off.
                expect(error).toBeLessThan(items[i].rarity >= 4 ? 0.01 : 0.5);
                if (items[i].rarity >= 4) counts.maxError = Math.max(counts.maxError, +error.toFixed(4));
                ++counts.estimated;
            }
        }
    });
    expect(counts.artifacts).toBeGreaterThan(0);
    console.log(JSON.stringify(counts));
});
