import fs from 'fs';
import { Artifact } from '../src/js/classes/Artifact';
import { Serializer } from '../src/js/classes/Serializer';
import { ImporterGood, CODES } from '../src/js/classes/Importer/Good';
import { planArtifactImport } from '../src/js/classes/Importer/Good';
import { StorageItemArtifacts } from '../src/js/classes/StorageItem/Artifacts';
import { StorageItemChar } from '../src/js/classes/StorageItem/Char';
import { migrateArtifactPersistence } from '../src/js/classes/StorageMigration/Artifacts';
import { CalcSet } from '../src/js/classes/CalcSet';
import { importEnkaArtifact, EnkaApi } from '../src/js/classes/API/Enka';
import { DB } from '../src/js/db/DB';
import { visitMaxUpgradeVariants } from '../src/js/classes/ArtifactUpgradePredictor';

global.DB = DB;
global.UI = {Lang: {get: () => ''}};

// Representative record, no account identifiers, from the Irminsul GOOD v3 export.
function craftedGood(overrides = {}) {
    return {
        setKey: 'FinaleOfTheDeepGalleries', slotKey: 'goblet', mainStatKey: 'cryo_dmg_',
        level: 20, rarity: 5, lock: true, totalRolls: 8, elixerCrafted: true,
        substats: [
            {key: 'critRate_', value: 11.3, initialValue: 3.9},
            {key: 'critDMG_', value: 13.2, initialValue: 6.2},
            {key: 'atk', value: 27, initialValue: 14},
            {key: 'enerRech_', value: 5.8, initialValue: 5.8},
        ],
        ...overrides,
    };
}

function legacyArtifact() {
    const data = craftedGood();
    delete data.totalRolls;
    delete data.elixerCrafted;
    for (const stat of data.substats) delete stat.initialValue;
    return Artifact.fromGood(data);
}

class MemoryStorage {
    data = {};
    getItem(key) { return this.data[key] ?? null; }
    setItem(key, value) { this.data[key] = String(value); }
}
beforeEach(() => { global.localStorage = new MemoryStorage(); });
afterEach(() => { delete global.localStorage; });

test.each([1, 2, 3, 99])('GOOD version %s accepts compatible records and optional future fields', version => {
    const result = new ImporterGood().process(JSON.stringify({format: 'GOOD', version, future: true, artifacts: [craftedGood()]}));
    expect(result.counts).toEqual({success: 1, errors: 0});
    expect(result.items[0].getInitialLineCount()).toBe(3);
});

test('metadata survives storage, clone, replacement, GOOD export and reordered substats', () => {
    const art = Artifact.fromGood(craftedGood());
    art.setGroups(['Crafted']);
    expect(art.serialize()[0]).toBe(3);
    expect(art.isCrafted()).toBe(true);
    expect(art.getMetadata()).toEqual({
        initialValues: {crit_rate: 3.9, crit_dmg: 6.2, atk: 14, recharge: 5.8},
        totalRolls: 8, elixirCrafted: true,
        definedSubstats: ['crit_dmg', 'crit_rate'],
    });
    const clone = art.clone();
    expect(clone.getHash()).toBe(art.getHash());
    expect(clone.getGroups()).toEqual(['Crafted']);
    expect(clone.isLocked()).toBe(true);
    clone.subStats.reverse();
    expect(clone.getStatsHash()).toBe(art.getStatsHash());
    expect(clone.getHash()).toBe(art.getHash());
    const exported = ImporterGood.export([clone]);
    expect(exported.version).toBe(3);
    expect(exported.artifacts[0].elixirCrafted).toBe(true);
    expect(exported.artifacts[0].substats.slice(0, 2).map(ss => ss.key).sort()).toEqual(['critDMG_', 'critRate_']);
    const reimported = Artifact.fromGood(exported.artifacts[0]);
    expect(reimported.getMetadata()).toEqual(art.getMetadata());
    expect(reimported.isLocked()).toBe(true);
    const replaced = legacyArtifact();
    replaced.replace(art);
    expect(replaced.getMetadata()).toEqual(art.getMetadata());
});

test('legacy payloads stay v2 and export no fabricated initial values or roll counts', () => {
    const legacy = legacyArtifact();
    expect(legacy.serialize()[0]).toBe(2);
    expect(legacy.getInitialLineCount()).toBeUndefined();
    const good = legacy.toGood();
    expect(good.totalRolls).toBeUndefined();
    expect(good.elixirCrafted).toBeUndefined();
    expect(good.substats.every(ss => ss.initialValue === undefined)).toBe(true);
    const v1 = legacy.serialize();
    v1[0] = 1;
    v1.pop();
    expect(Artifact.deserialize(v1).getStatsHash()).toBe(legacy.getStatsHash());
});

test('crafted false and crafted unknown pair remain distinct from ordinary/unknown data', () => {
    const ordinary = Artifact.fromGood(craftedGood({elixirCrafted: false}));
    expect(ordinary.getMetadata().definedSubstats).toBeUndefined();
    expect(ordinary.clone().toGood().elixirCrafted).toBe(false);
    const unknownPair = Artifact.fromGood(craftedGood({definedSubstats: []}));
    expect(unknownPair.isCrafted()).toBe(true);
    expect(Artifact.fromGood(unknownPair.toGood()).getMetadata().definedSubstats).toBeUndefined();
});

test('invalid optional metadata is ignored, while malformed records are isolated', () => {
    const data = craftedGood({totalRolls: 99, definedSubstats: ['hp', 'hp']});
    data.substats[0].initialValue = 11.3; // old exporter used upgraded totals as initials
    const art = Artifact.fromGood(data);
    expect(art.getMetadata().initialValues.crit_rate).toBeUndefined();
    expect(art.getMetadata().initialValues.crit_dmg).toBe(6.2);
    expect(art.getMetadata().totalRolls).toBeUndefined();
    expect(art.getMetadata().definedSubstats).toBeUndefined();
    const result = new ImporterGood().process(JSON.stringify({format: 'GOOD', artifacts: [
        null, {}, craftedGood({level: -1}), craftedGood({rarity: 7}), craftedGood(),
    ]}));
    expect(result.counts).toEqual({success: 1, errors: 4});
    expect(new ImporterGood().process('null').code).toBe(CODES.ERROR_INVALID_FORMAT);
});

test('initial values for inactive rows survive activation and lower rarity import', () => {
    const data = craftedGood({level: 0, totalRolls: 3, elixerCrafted: false});
    data.substats = data.substats.slice(0, 3).map(ss => ({...ss, value: ss.initialValue}));
    data.unactivatedSubstats = [{key: 'enerRech_', value: 5.8, initialValue: 5.8}];
    const art = Artifact.fromGood(data);
    expect(art.clone().getMetadata().initialValues.recharge).toBe(5.8);
    expect(art.getInitialLineCount()).toBe(3);
    data.level = 4;
    data.totalRolls = 4;
    const activated = Artifact.fromGood(data);
    expect(activated.getUnactivatedSubStats()).toHaveLength(0);
    expect(activated.clone().getMetadata().initialValues.recharge).toBe(5.8);
    const low = Artifact.fromGood({setKey: 'Berserker', slotKey: 'flower', mainStatKey: 'hp', rarity: 3, level: 0,
        totalRolls: 2, substats: [{key: 'atk', value: 8, initialValue: 8}, {key: 'def', value: 9, initialValue: 9}]});
    expect(low.getInitialLineCount()).toBe(2);
    expect(low.clone().getMetadata()).toEqual(low.getMetadata());
});

test('v3 framing round-trips embedded artifacts and rejects truncated/invalid suffixes', () => {
    const art = Artifact.fromGood(craftedGood());
    const base = art.serialize();
    const combined = [...base, ...legacyArtifact().serialize()];
    expect(Artifact.deserialize(combined).getHash()).toBe(art.getHash());
    expect(Artifact.deserialize(combined).getHash()).toBe(legacyArtifact().getHash());
    expect(combined).toHaveLength(0);
    for (let length = 0; length < base.length; ++length) expect(Artifact.deserialize(base.slice(0, length))).toBeNull();
    const malformed = [...base];
    malformed[malformed.length - 1] = 999999;
    expect(Artifact.deserialize(malformed)).toBeNull();
    const build = new CalcSet();
    build.setChar(DB.Chars.getFirst());
    build.setWeapon(DB.Weapons.get(DB.Chars.getFirst().weapon).getFirst());
    build.setEnemy(DB.Enemies.getFirst().getFirst());
    build.setArtifact(art);
    const packed = Serializer.pack(build);
    expect(CalcSet.deserialize(Serializer.unpack(packed)).getArtifacts().goblet.getMetadata()).toEqual(art.getMetadata());
    localStorage.setItem('char', JSON.stringify([{title: 'metadata', data: packed}]));
    localStorage.setItem('artifact_pool', JSON.stringify([{data: art.getHash(), locked: true, group: ['x']}]));
    expect(migrateArtifactPersistence(localStorage).changed).toBe(false);
});

test('reimports enrich once, preserve locks/groups, and never erase known data', () => {
    const old = legacyArtifact();
    old.setLocked(true);
    old.setGroups(['Keep']);
    const fresh = Artifact.fromGood(craftedGood({lock: false}));
    const store = new StorageItemArtifacts();
    store.addArtifacts([old]);
    const plan = planArtifactImport(store.listArtifacts(), [fresh]);
    expect(plan.updated).toHaveLength(1);
    expect(plan.added).toHaveLength(0);
    expect(plan.missing).toHaveLength(0);
    store.updateMetadata(plan.updated);
    store.addArtifacts([fresh, fresh]);
    store.addArtifacts([old]);
    expect(store.listArtifacts()).toHaveLength(1);
    const saved = new StorageItemArtifacts().listArtifacts()[0];
    expect(saved.getMetadata()).toEqual(fresh.getMetadata());
    expect(saved.isLocked()).toBe(true);
    expect(saved.getGroups()).toEqual(['Keep']);
    expect(store.getByHash(old.getHash()).isCrafted()).toBe(true);
    const build = {getArtifacts: () => ({goblet: old})};
    store.enrichBuild(build);
    expect(old.getMetadata()).toEqual(fresh.getMetadata());
    expect(planArtifactImport([saved], [legacyArtifact()]).missing).toHaveLength(0);
});

test('conflicting known initial values are not merged', () => {
    const a = Artifact.fromGood(craftedGood());
    const data = craftedGood();
    data.substats[0].initialValue = 3.5;
    const b = Artifact.fromGood(data);
    expect(a.enrichFrom(b)).toBeNull();
    const storage = new StorageItemArtifacts();
    storage.addArtifacts([a]);
    storage.addArtifacts([b]);
    expect(storage.listArtifacts()).toHaveLength(2);
});

test('saved-build locks and usage resolve a legacy hash after provenance enrichment', () => {
    const store = new StorageItemArtifacts();
    const old = legacyArtifact();
    old.setLocked(false);
    const hash = old.getHash();
    store.addArtifacts([old]);
    const build = new CalcSet();
    build.setChar(DB.Chars.get('Jean'));
    build.setArtifact(old);
    const characters = new StorageItemChar();
    characters.add(build, {});
    store.addArtifacts([Artifact.fromGood(craftedGood())]);
    const currentHash = store.getByHash(hash).getHash();
    expect(currentHash).not.toBe(hash);
    store.setLocked([hash], true);
    expect(store.getByHash(hash).isLocked()).toBe(true);
    expect(characters.savedHashes(store)[currentHash]).toEqual([build.getChar().object.getIcon()]);
    store.setLocked([hash], false);
    expect(store.getByHash(hash).isLocked()).toBe(false);
});

test('ambiguous old hashes cannot lock either provenance-distinct artifact', () => {
    const store = new StorageItemArtifacts();
    const a = Artifact.fromGood(craftedGood({lock: false}));
    const data = craftedGood({lock: false});
    data.substats[0].initialValue = 3.5;
    store.addArtifacts([a, Artifact.fromGood(data)]);
    const hash = legacyArtifact().getHash();
    expect(store.getByHash(hash)).toBeUndefined();
    store.setLocked([hash], true);
    expect(store.listArtifacts().every(artifact => !artifact.isLocked())).toBe(true);
});

test('same-batch conflicts cannot overwrite a single legacy entry twice', () => {
    const a = Artifact.fromGood(craftedGood());
    const data = craftedGood();
    data.substats[0].initialValue = 3.5;
    const b = Artifact.fromGood(data);
    const plan = planArtifactImport([legacyArtifact()], [a, b]);
    expect(plan.updated).toHaveLength(1);
    expect(plan.added).toHaveLength(1);
    expect(plan.updated[0].artifact.getMetadata()).toEqual(a.getMetadata());
    expect(plan.added[0].getMetadata()).toEqual(b.getMetadata());
    const lessInformed = planArtifactImport([a, b], [legacyArtifact()]);
    expect(lessInformed.added).toHaveLength(0);
    expect(lessInformed.missing).toHaveLength(0);
    expect(lessInformed.updated).toHaveLength(0);
});

test('precise and displayed initial rolls are both stored as displayed values', () => {
    const rounded = Artifact.fromGood(craftedGood());
    const data = craftedGood();
    data.substats[0].initialValue = 3.89;
    const precise = Artifact.fromGood(data);
    expect(precise.getHash()).toBe(rounded.getHash());
    expect(rounded.enrichFrom(precise).getMetadata().initialValues.crit_rate).toBe(3.9);
});

test('level-up variants preserve starting lines instead of retaining a stale roll count', () => {
    const art = Artifact.fromGood(craftedGood({level: 16, totalRolls: 8}));
    expect(art.getInitialLineCount()).toBe(4);
    let count = 0;
    visitMaxUpgradeVariants(art, ({artifact: variant}) => {
        ++count;
        expect(variant.getInitialLineCount()).toBe(4);
        expect(variant.getMetadata().totalRolls).toBe(9);
        expect(variant.clone().getMetadata().definedSubstats).toEqual(['crit_dmg', 'crit_rate']);
    });
    expect(count).toBeGreaterThan(0);
    expect(art.getMetadata().totalRolls).toBe(8);
});

function enkaItem(ids = [501204, 501224, 501054, 501234]) {
    return {
        itemId: DB.Artifacts.Sets.get('FinaleOfTheDeepGalleries').itemIds[0],
        reliquary: {level: 1, appendPropIdList: ids},
        flat: {rankLevel: 5, equipType: 'EQUIP_RING', reliquaryMainstat: {mainPropId: 'FIGHT_PROP_ICE_ADD_HURT'},
            reliquarySubstats: [
                {appendPropId: 'FIGHT_PROP_CRITICAL', statValue: 3.9},
                {appendPropId: 'FIGHT_PROP_CRITICAL_HURT', statValue: 7.8},
                {appendPropId: 'FIGHT_PROP_ATTACK', statValue: 19},
                {appendPropId: 'FIGHT_PROP_CHARGE_EFFICIENCY', statValue: 6.5},
            ]},
    };
}

test('Enka imports validated roll counts and only order-independent initial values', () => {
    const item = enkaItem();
    const art = importEnkaArtifact(item);
    expect(art.getInitialLineCount()).toBe(4);
    expect(art.getMetadata().initialValues).toEqual({crit_rate: 3.9, crit_dmg: 7.8, atk: 19, recharge: 6.5});
    expect(art.getMetadata().elixirCrafted).toBeUndefined();
    item.reliquary.level = 5;
    item.reliquary.appendPropIdList.push(501201);
    item.flat.reliquarySubstats[0].statValue = 6.6;
    const upgraded = importEnkaArtifact(item);
    expect(upgraded.getInitialLineCount()).toBe(4);
    expect(upgraded.getMetadata().initialValues.crit_rate).toBeUndefined();
    expect(upgraded.getMetadata().initialValues.crit_dmg).toBe(7.8);
    item.reliquary.appendPropIdList.reverse();
    expect(importEnkaArtifact(item).getMetadata()).toEqual(upgraded.getMetadata());
});

test.each([undefined, [999999], [401201, 501224, 501054, 501234], [501201, 501224, 501054, 501234]])(
    'legacy/invalid Enka roll IDs %p keep combat stats and only what +0 itself proves', ids => {
        const item = enkaItem();
        item.reliquary.appendPropIdList = ids;
        const art = importEnkaArtifact(item);
        expect(art).not.toBeNull();
        // Below +4 no upgrade has happened: the lines are the start and their own first rolls.
        expect(art.getMetadata()).toEqual({totalRolls: 4, initialValues: {crit_rate: 3.9, crit_dmg: 7.8, atk: 19, recharge: 6.5}});
    },
);

test('bad Enka artifact does not discard remaining items or the character', () => {
    const char = DB.Chars.getFirst();
    const avatar = {avatarId: char.gameId, skillDepotId: char.skillDepotId,
        propMap: {'4001': {ival: '90'}, '1002': {ival: '6'}}, skillLevelMap: {},
        equipList: [null, {reliquary: {}, flat: {}}, enkaItem()]};
    // Use a known character game ID independently of the DB display order.
    avatar.avatarId = 10000114;
    const result = new EnkaApi().processData(JSON.stringify({avatarInfoList: [avatar]}), 'uid');
    expect(result.characters).toHaveLength(1);
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].getMetadata().totalRolls).toBe(4);
});

// Opt-in local integration test; never commits the account's inventory to the repository.
(process.env.ARTIFACT_GOOD_FIXTURE ? test : test.skip)('complete real GOOD export survives storage and round-trip without losing metadata', () => {
    const text = fs.readFileSync(process.env.ARTIFACT_GOOD_FIXTURE, 'utf8').replace(/^\uFEFF/, '');
    const source = JSON.parse(text);
    const result = new ImporterGood().process(text);
    expect(result.counts.errors).toBe(0);
    expect(result.items).toHaveLength(source.artifacts.length);
    for (let i = 0; i < source.artifacts.length; ++i) {
        const input = source.artifacts[i];
        const art = result.items[i];
        expect(art.getMetadata().totalRolls).toBe(input.totalRolls);
        expect(art.isCrafted()).toBe(input.elixirCrafted ?? input.elixerCrafted);
        expect(Object.keys(art.getMetadata().initialValues || {})).toHaveLength(input.substats.length + (input.unactivatedSubstats?.length || 0));
        expect(art.clone().getHash()).toBe(art.getHash());
        expect(Artifact.fromGood(art.toGood()).getStatsHash()).toBe(art.getStatsHash());
        expect(Artifact.fromGood(art.toGood()).getMetadata()).toEqual(art.getMetadata());
    }
    const store = new StorageItemArtifacts();
    const legacy = result.items.map(art => { const copy = art.clone(); copy.setMetadata({}); return copy; });
    store.addArtifacts(legacy);
    store.addArtifacts(result.items);
    store.addArtifacts(legacy);
    expect(store.listArtifacts()).toHaveLength(result.items.length);
    expect(store.listArtifacts().filter(art => art.isCrafted()))
        .toHaveLength(source.artifacts.filter(art => (art.elixirCrafted ?? art.elixerCrafted) === true).length);
});

test('GOOD import follows the game: unactivated lines only on 5★, and below +4 the lines are the start', () => {
    const good = {setKey: 'GladiatorsFinale', slotKey: 'flower', mainStatKey: 'hp', rarity: 5, level: 0,
        substats: [{key: 'critRate_', value: 3.9}, {key: 'critDMG_', value: 7.8}, {key: 'atk', value: 19}],
        unactivatedSubstats: [{key: 'enerRech_', value: 6.5}]};
    const art = Artifact.fromGood(good);
    expect(art.getSubStats()).toHaveLength(3);
    expect(art.getUnactivatedSubStats()).toEqual([{stat: 'recharge', value: 6.5}]);
    expect(art.getTotalRolls()).toBe(3);
    expect(art.getMetadata().initialValues).toEqual({crit_rate: 3.9, crit_dmg: 7.8, atk: 19, recharge: 6.5});
    expect(Artifact.fromGood({...good, setKey: 'Instructor', rarity: 4}).getUnactivatedSubStats()).toEqual([]);
    // From +4 nothing is estimated without totalRolls.
    const leveled = Artifact.fromGood({...good, level: 20});
    expect(leveled.getSubStats()).toHaveLength(4);
    expect(leveled.getTotalRolls()).toBeUndefined();
});

test('Irminsul half-way totals are restored to the game value on import and migration', () => {
    // In game: DEF +19.0%. Irminsul exported 18.9 (6.56 + 5.83 + 6.56 = 18.95 summed in float32).
    const plume = {setKey: 'ScarletProof', slotKey: 'plume', level: 20, rarity: 5, mainStatKey: 'atk', totalRolls: 9,
        substats: [{key: 'critRate_', value: 7, initialValue: 3.9}, {key: 'eleMas', value: 23, initialValue: 23},
            {key: 'critDMG_', value: 21, initialValue: 7.8}, {key: 'def_', value: 18.9, initialValue: 6.6}]};
    const art = Artifact.fromGood(plume);
    expect(art.getSubStats().map(sub => sub.value)).toEqual([7, 23, 21, 19]);
    expect(art.getErrors()).toEqual([]);
    // Flat stats too: 298.75 + 298.75 = 597.5 shows as 598.
    expect(Artifact.fromGood({...plume, substats: [{key: 'hp', value: 597}]}).getSubStats()[0].value).toBe(598);
    // Reachable values, and unreachable ones without a half-way total, are untouched.
    for (const [key, value] of [['def_', 18.2], ['def_', 19], ['critRate_', 1], ['hp', 598]]) {
        expect(Artifact.fromGood({...plume, substats: [{key, value}]}).getSubStats()[0].value).toBe(value);
    }
    const id = stat => DB.Artifacts.Substats.getId(stat);
    const header = [DB.Artifacts.Sets.getId('ScarletProof'), 5, 20, DB.Artifacts.Slots.getId('plume'),
        DB.Artifacts.Mainstats.getId('atk')];
    const legacy = Artifact.deserialize([2, ...header, 4, id('crit_rate'), 70, id('mastery'), 23,
        id('crit_dmg'), 210, id('def_percent'), 189, 0]);
    expect(legacy.getSubStats().map(sub => sub.value)).toEqual([7, 23, 21, 19]);
});

test('public-main v1/v2 records keep only what their level and stored lines prove', () => {
    const id = stat => DB.Artifacts.Substats.getId(stat);
    const header = level => [DB.Artifacts.Sets.getId('GladiatorFinale'), 5, level, DB.Artifacts.Slots.getId('flower'),
        DB.Artifacts.Mainstats.getId('hp')];
    const rows = [id('crit_rate'), 39, id('crit_dmg'), 78, id('atk'), 19];
    // Below +4 the lines are the start and each value its first roll.
    const zero = Artifact.deserialize([2, ...header(0), 3, ...rows, 1, id('recharge'), 65]);
    expect(zero.getTotalRolls()).toBe(3);
    expect(zero.getMetadata().initialValues).toEqual({crit_rate: 3.9, crit_dmg: 7.8, atk: 19, recharge: 6.5});
    expect(Artifact.deserialize([1, ...header(2), 3, ...rows]).getTotalRolls()).toBe(3);
    // A stored unactivated line proves a 3-line start after it activates.
    const four = Artifact.deserialize([2, ...header(4), 3, ...rows, 1, id('recharge'), 65]);
    expect(four.getSubStats()).toHaveLength(4);
    expect(four.getInitialLineCount()).toBe(3);
    expect(four.getMetadata().initialValues).toEqual({recharge: 6.5});
    // Anything else stays unknown, and the record stays byte-stable v2.
    const plain = Artifact.deserialize([2, ...header(20), 4, ...rows, id('recharge'), 65, 0]);
    expect(plain.getMetadata()).toEqual({});
    expect(plain.serialize()[0]).toBe(2);
});
