import { App } from "../src/js/classes/App";
import { CalcSet } from "../src/js/classes/CalcSet";
import { Condition } from "../src/js/classes/Condition";
import { Rotation } from "../src/js/classes/Rotation";
import { Serializer } from "../src/js/classes/Serializer";
import { StorageItemChar } from "../src/js/classes/StorageItem/Char";
import { migrateArtifactPersistence } from "../src/js/classes/StorageMigration/Artifacts";
import { Team, TEAM_FORMAT } from "../src/js/classes/Team";
import { FloatingSet, VirtualCharacter } from "../src/js/classes/Team/Legacy";
import { DB } from "../src/js/db/DB";
import { makeSetArtifacts } from "./support/baseline";
import { makeBuild } from "./support/team";
import released from "./fixtures/public-main-builds.json";

global.DB = DB;

// A character is saved with the additional buffs of its team (the legacy
// source), as a team of one: Team.withOnly, App.buildToSave, and the storage
// of characters, which holds such a team beside builds on their own.

const VOYAGE_ID = 2;
const HIT = 'attack.normal_hit_1';
const id = (source) => source.getSourceId();
const ids = (team) => team.getSlots().map((member) => member ? member.char.getId() : 0);
const format = (packed) => Serializer.unpack(packed)[0];

function hit(member) {
    return {type: 'feature', charId: id(member), feature: HIT, count: 1, reaction: 0};
}

function step(source, receiver) {
    const item = {type: 'condition', subtype: 'member', charId: id(source), object: 'char', itemId: id(source), conditionId: VOYAGE_ID, value: 1};
    if (receiver) item.receiverId = id(receiver);
    return item;
}

/**
 * Xingqiu and Hu Tao (in the third slot) with a virtual Bennett and a
 * floating set, an enemy and a toggle of their own, and choices that name
 * each of them.
 */
function makeTeam() {
    const xingqiu = makeBuild('Xingqiu');
    const hutao = makeBuild('Hutao');
    const team = Team.fromMember(xingqiu);
    team.setMember(2, hutao);

    const bennett = team.addLegacy(new VirtualCharacter(DB.Chars.get('Bennet')));
    bennett.setStated('atk_base', 800);
    const noblesse = team.addLegacy(new FloatingSet('NoblesseOblige'));

    team.enemy.setLevels({level: 95});
    team.modifySettings({polestar_field: true});
    team.setOnFieldMember(xingqiu);

    team.setConditionValue(id(bennett), id(hutao), 'bennet_fantastic_voyage', false);
    team.setConditionValue(id(bennett), id(xingqiu), 'bennet_fantastic_voyage', false);
    team.conditionValues[id(xingqiu)] = {[id(hutao)]: {bennet_fantastic_voyage: true}};

    team.stackChoices = {
        ['millennial_movement_atk']: id(bennett),
        ['celestial_gift_4@' + id(hutao)]: id(noblesse),
        ['celestial_gift_4@' + id(xingqiu)]: id(bennett),
        ['noblesse_oblige_4']: id(xingqiu),
    };

    team.setRotation(new Rotation({items: [hit(hutao), hit(xingqiu), step(bennett), step(xingqiu), hit(hutao)]}));
    return {team, xingqiu, hutao, bennett, noblesse};
}

/** An App without the browser, as in appTeam. */
function makeApp(team) {
    global.UI = {Layout: {refresh: () => {}}};
    const app = Object.create(App.prototype);
    app.storage = {
        settings: {get: () => undefined, set: () => {}, showBetaContent: () => true},
        artifacts: {enrichBuild: () => {}},
    };
    app.team = team || Team.fromMember(makeBuild('Hutao'));
    app.viewedSlot = app.team.getSlots().findIndex((member) => !!member);
    return app;
}

/** The storage of characters over a plain object. */
function makeStorage(items = []) {
    const data = {char: JSON.stringify(items)};
    global.localStorage = {
        getItem: (key) => data[key] === undefined ? null : data[key],
        setItem: (key, value) => { data[key] = value; },
    };
    return {storage: new StorageItemChar(), data};
}

afterEach(() => {
    delete global.localStorage;
});

describe("a team's copy with one member alone", () => {
    test("keeps the member, the enemy, the toggles and the additional buffs", () => {
        const {team, hutao, bennett, noblesse} = makeTeam();
        const copy = team.withOnly(hutao);

        expect(ids(copy)).toEqual([id(hutao), 0, 0, 0]);
        expect(copy.getMember(0)).not.toBe(hutao);
        expect(copy.getMember(0).team).toBe(copy);
        expect(copy.legacy.serialize()).toEqual(team.legacy.serialize());
        expect(copy.legacy.getBySourceId(id(bennett)).stated).toEqual({atk_base: 800});
        expect(copy.enemy.getLevels().level).toBe(95);
        expect(copy.getSettings().polestar_field).toBe(true);

        // The team it was made from is as it was.
        expect(ids(team)).toEqual([id(team.getMember(0)), 0, id(hutao), 0]);
        expect(hutao.team).toBe(team);
        expect(team.getRotation().getItems()).toHaveLength(5);
        expect(noblesse).toBe(team.legacy.getEntries()[1]);
    });

    test("leaves out what names the other members", () => {
        const {team, xingqiu, hutao, bennett, noblesse} = makeTeam();
        const copy = team.withOnly(hutao);

        // Xingqiu was on the field: the member alone is.
        expect(copy.getSettings().on_field_char).toBe(0);
        expect(copy.getOnFieldMember()).toBe(copy.getMember(0));

        expect(copy.conditionValues).toEqual({[id(bennett)]: {[id(hutao)]: {bennet_fantastic_voyage: false}}});
        expect(copy.stackChoices).toEqual({
            ['millennial_movement_atk']: id(bennett),
            ['celestial_gift_4@' + id(hutao)]: id(noblesse),
        });
        // Its hits, and the steps of the additional buffs.
        expect(copy.getRotation().getItems().map((item) => item.charId)).toEqual([id(hutao), id(bennett), id(hutao)]);

        expect(team.getSettings().on_field_char).toBe(id(xingqiu));
        expect(Object.keys(team.stackChoices)).toHaveLength(4);
        expect(Object.keys(team.conditionValues)).toHaveLength(2);
    });

    test("is saved and read as a team", () => {
        const {team, hutao} = makeTeam();
        const copy = team.withOnly(hutao);
        const read = Team.deserialize(copy.serialize());

        expect(ids(read)).toEqual(ids(copy));
        expect(read.serialize()).toEqual(copy.serialize());
        expect(() => team.withOnly(makeBuild('Sucrose'))).toThrow('The member is not in the team');
    });
});

describe("what is saved for the viewed member", () => {
    test("a character alone while the team has no additional buffs", () => {
        const app = makeApp();
        app.newMember(1, DB.Chars.get('Xingqiu'));
        app.team.enemy.setLevels({level: 95});

        const saved = app.buildToSave();
        expect(saved).toBeInstanceOf(CalcSet);
        expect(saved.team).toBeNull();
        expect(saved.char.getId()).toBe(DB.Chars.get('Xingqiu').getId());
    });

    test("the character with the additional buffs of its team, without its teammates", () => {
        const {team, hutao, bennett} = makeTeam();
        const app = makeApp(team);
        app.viewMember(2);

        const saved = app.buildToSave();
        expect(saved).toBeInstanceOf(Team);
        expect(ids(saved)).toEqual([id(hutao), 0, 0, 0]);
        expect(saved.legacy.getEntries().map(id)).toEqual(team.legacy.getEntries().map(id));
        expect(saved.legacy.getBySourceId(id(bennett))).not.toBe(bennett);
    });
});

describe("the storage of characters", () => {
    test("holds a character with its additional buffs as a team of one, and gives its member", () => {
        const {team, hutao, bennett} = makeTeam();
        const app = makeApp(team);
        app.viewMember(2);
        const {storage, data} = makeStorage();

        storage.add(app.buildToSave(), {title: 'With buffs'});
        storage.add(makeBuild('Sucrose'), {title: 'Alone'});

        const stored = JSON.parse(data.char);
        expect(stored.map((item) => [item.title, format(item.data)])).toEqual([['With buffs', TEAM_FORMAT], ['Alone', 3]]);

        const [withBuffs, alone] = storage.listDecoded(true).map((item) => item.data);
        expect(withBuffs.char.getId()).toBe(id(hutao));
        expect(withBuffs.team.legacy.getBySourceId(id(bennett)).stated).toEqual({atk_base: 800});
        expect(withBuffs.team.enemy.getLevels().level).toBe(95);
        expect(alone.team).toBeNull();

        // A list shows it in its own team, with its buffs.
        expect(Team.solo(withBuffs)).toBe(withBuffs);
    });

    test("loads it into a slot as its character, and in full as it was saved", () => {
        const {team, hutao, bennett} = makeTeam();
        const saving = makeApp(team);
        saving.viewMember(2);
        const {storage} = makeStorage();
        storage.add(saving.buildToSave(), {});
        const saved = storage.getItem(0);

        const app = makeApp(Team.fromMember(makeBuild('Sucrose')));
        app.fillSlot(1, saved);
        expect(ids(app.getTeam())).toEqual([DB.Chars.get('Sucrose').getId(), id(hutao), 0, 0]);
        expect(app.getTeam().legacy.getEntries()).toEqual([]);
        expect(app.getTeam().enemy.getLevels().level).not.toBe(95);

        expect(app.loadSavedTeam(saved)).toBe(true);
        expect(ids(app.getTeam())).toEqual([id(hutao), 0, 0, 0]);
        expect(app.getTeam().legacy.getEntries().map(id)).toEqual([id(bennett), id(team.legacy.getEntries()[1])]);
        expect(app.getTeam().enemy.getLevels().level).toBe(95);

        // The open team is a copy: the saved one loads again as it was.
        expect(app.getTeam()).not.toBe(saved.team);
        app.getTeam().legacy.remove(app.getTeam().legacy.getEntries()[0]);
        app.getTeam().enemy.setLevels({level: 1});
        expect(app.loadSavedTeam(saved)).toBe(true);
        expect(app.getTeam().legacy.getEntries()).toHaveLength(2);
        expect(app.getTeam().enemy.getLevels().level).toBe(95);
    });

    test("overwriting a save of the released calculator keeps its enemy and its additional buffs", () => {
        const packed = released.fixtures.hutaoBennett.packed;
        const {storage} = makeStorage([{title: 'Released', data: packed}]);

        const app = makeApp();
        expect(app.loadSavedTeam(storage.getItem(0))).toBe(true);
        const loaded = app.getTeam().serialize();
        expect(app.getTeam().legacy.getEntries()).toHaveLength(1);

        storage.replace(0, app.buildToSave());
        expect(storage.items[0].title).toBe('Released');
        expect(format(storage.items[0].data)).toBe(TEAM_FORMAT);

        const other = makeApp(Team.fromMember(makeBuild('Sucrose')));
        expect(other.loadSavedTeam(storage.getItem(0))).toBe(true);
        expect(other.getTeam().serialize()).toEqual(loaded);
    });

    test("takes it from a backup as it is stored", () => {
        const {team, hutao} = makeTeam();
        const packed = Serializer.pack(team.withOnly(hutao));
        const {storage} = makeStorage();

        storage.fromBackup([{title: 'With buffs', data: packed}]);
        expect(storage.items).toEqual([{title: 'With buffs', data: packed}]);
        expect(storage.getItem(0).team.legacy.getEntries()).toHaveLength(2);
    });

    test("does not read a team of several members as a character", () => {
        const {team} = makeTeam();
        const {storage} = makeStorage([{title: 'A team', data: Serializer.pack(team)}]);

        expect(storage.getItem(0)).toBeNull();
        expect(storage.listDecoded(true)).toEqual([]);
    });

    test("the startup migration of artifacts leaves it as stored", () => {
        const {team, hutao} = makeTeam();
        hutao.replaceArtifacts(makeSetArtifacts('NoblesseOblige'));
        const packed = Serializer.pack(team.withOnly(hutao));
        const {data} = makeStorage([{title: 'With buffs', data: packed}]);

        const report = migrateArtifactPersistence(global.localStorage);
        expect(report.errors).toEqual([]);
        expect(JSON.parse(data.char)).toEqual([{title: 'With buffs', data: packed}]);
    });
});

describe("the rotation of a character saved with virtual characters", () => {
    /** A step on the first control of a virtual character. */
    function entryStep(entry) {
        const cond = Condition.unwrap(entry.char.get().getAllConditions()).find((item) => item.getName() && item.getId());
        return {type: 'condition', subtype: 'member', charId: id(entry), object: 'char', itemId: id(entry), conditionId: cond.getId(), value: 1};
    }

    /** Every hit and step of a rotation, blocks opened, by its owner (0 for the enemy's and the team's). */
    function owners(rotation) {
        const result = [];
        const walk = (items) => items.forEach((item) => {
            if (item.type == 'repeat') return walk(item.items);
            if (item.type == 'uptime') return walk(item.conditions.concat(item.features));
            result.push(item.type + ':' + (item.charId || 0));
        });
        walk(rotation.getItems());
        return result;
    }

    /** Hu Tao with three virtual characters, whose steps are in every kind of block. */
    function makeLegacy() {
        const hutao = makeBuild('Hutao');
        const team = Team.fromMember(hutao);
        const [bennett, xingqiu, sucrose] = ['Bennet', 'Xingqiu', 'Sucrose'].map((key) => team.addLegacy(new VirtualCharacter(DB.Chars.get(key))));
        const enemy = DB.Conditions.Enemy.find((item) => item.getName() == 'enemy.def_reduce');

        team.setRotation(new Rotation({items: [
            hit(hutao),
            entryStep(bennett),
            {type: 'uptime', percent: 50, conditions: [entryStep(xingqiu)], features: [hit(hutao)]},
            {type: 'repeat', count: 2, items: [entryStep(sucrose), hit(hutao)]},
            {type: 'condition', subtype: 'enemy', itemId: team.enemy.object.getId(), conditionId: enemy.getId(), value: 30},
        ]}));
        return {team, hutao, entries: [bennett, xingqiu, sucrose]};
    }

    test("is saved whole and comes back whole with a full load", () => {
        const {team, hutao, entries} = makeLegacy();
        const whole = team.getRotation().serialize();
        expect(owners(team.getRotation())).toEqual([
            'feature:' + id(hutao), 'condition:' + id(entries[0]), 'condition:' + id(entries[1]), 'feature:' + id(hutao),
            'condition:' + id(entries[2]), 'feature:' + id(hutao), 'condition:0',
        ]);

        const {storage} = makeStorage();
        storage.add(makeApp(team).buildToSave(), {});
        expect(format(storage.items[0].data)).toBe(TEAM_FORMAT);

        const app = makeApp(Team.fromMember(makeBuild('Sucrose')));
        app.setRotation(new Rotation({items: [hit(app.currentSet())]}));
        expect(app.loadSavedTeam(storage.getItem(0))).toBe(true);
        expect(app.getRotation().serialize()).toEqual(whole);
    });

    test("loaded into a slot it brings the character's own hits, without the virtual characters' steps, into a team that has no rotation", () => {
        const {team, hutao} = makeLegacy();
        const {storage} = makeStorage();
        storage.add(makeApp(team).buildToSave(), {});

        const empty = makeApp(Team.fromMember(makeBuild('Noelle')));
        empty.fillSlot(1, storage.getItem(0));
        expect(empty.getTeam().legacy.getEntries()).toEqual([]);
        expect(owners(empty.getRotation())).toEqual(['feature:' + id(hutao), 'feature:' + id(hutao), 'feature:' + id(hutao), 'condition:0']);

        // A team that has a rotation keeps its own.
        const busy = makeApp(Team.fromMember(makeBuild('Noelle')));
        busy.setRotation(new Rotation({items: [hit(busy.currentSet())]}));
        busy.fillSlot(1, storage.getItem(0));
        expect(owners(busy.getRotation())).toEqual(['feature:' + id(busy.getTeam().getMember(0))]);
    });

    test("saved out of a team with a teammate it leaves the teammate's hits and steps, and a block that has no hits left", () => {
        const {team, hutao, entries} = makeLegacy();
        const noelle = makeBuild('Noelle');
        team.setMember(1, noelle);
        team.getRotation().addItem(hit(noelle));
        team.getRotation().addItem({type: 'uptime', percent: 50, conditions: [entryStep(entries[0])], features: [hit(noelle)]});

        const saved = team.withOnly(hutao);
        expect(owners(saved.getRotation())).toEqual([
            'feature:' + id(hutao), 'condition:' + id(entries[0]), 'condition:' + id(entries[1]), 'feature:' + id(hutao),
            'condition:' + id(entries[2]), 'feature:' + id(hutao), 'condition:0',
        ]);
        expect(owners(team.getRotation())).toHaveLength(10);
    });
});
