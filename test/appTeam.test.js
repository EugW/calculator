import { App } from "../src/js/classes/App";
import { CalcSet, defaultBuild } from "../src/js/classes/CalcSet";
import { Serializer } from "../src/js/classes/Serializer";
import { Team, TEAM_FORMAT } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { makeBuild } from "./support/team";
import released from "./fixtures/public-main-builds.json";

global.DB = DB;

/** An App without the browser: settings in a plain object, no UI. */
function makeApp(settings = {}) {
    global.UI = {Layout: {refresh: jest.fn()}};
    const store = Object.assign({}, settings);
    const app = Object.create(App.prototype);
    app.storage = {
        settings: {
            get: (name) => store[name],
            set: (name, value) => { store[name] = value; },
            showBetaContent: () => true,
        },
        artifacts: {enrichBuild: () => {}},
    };
    app.team = Team.fromMember(makeBuild('Hutao'));
    app.viewedSlot = 0;
    return {app, store};
}

const ids = (team) => team.getSlots().map((member) => member ? member.char.getId() : 0);

test("the viewed member is the current build", () => {
    const {app} = makeApp();
    app.newMember(2, DB.Chars.get('Xingqiu'));
    // A filled slot is viewed.
    expect(app.getViewedSlot()).toBe(2);
    expect(app.currentSet().char.getId()).toBe(DB.Chars.get('Xingqiu').getId());
    app.viewMember(0);
    expect(app.currentSet().char.getId()).toBe(DB.Chars.get('Hutao').getId());
    // An empty slot is not.
    app.viewMember(1);
    expect(app.getViewedSlot()).toBe(0);
});

test("the team is saved and loaded as a team, with the field state", () => {
    const {app, store} = makeApp();
    app.newMember(1, DB.Chars.get('Xingqiu'));
    app.setOnFieldMember(1);
    expect(store.last_team).toBeTruthy();

    const other = makeApp({last_team: store.last_team}).app;
    expect(other.loadSerialized(Serializer.unpack(store.last_team))).toBe(true);
    expect(ids(other.getTeam())).toEqual(ids(app.getTeam()));
    expect(other.getTeam().getOnFieldMember().char.getId()).toBe(DB.Chars.get('Xingqiu').getId());
});

test("a released link loads its enemy, and its party as virtual characters with their inputs", () => {
    const {app} = makeApp();
    expect(app.loadSerialized(Serializer.unpack(released.fixtures.hutaoBennett.packed))).toBe(true);
    const team = app.getTeam();
    expect(team.getMembers().map((member) => member.char.getId())).toEqual([DB.Chars.get('Hutao').getId()]);
    const [bennett] = team.legacy.getEntries();
    expect(bennett.getSourceId()).toBe(DB.Chars.get('Bennet').getId());
    expect(bennett.char.getSettings().bennet_fantastic_voyage).toBe(true);
    expect(bennett.stated).toEqual({atk_base: 800});
    expect(team.enemy.getLevels().level).toBe(90);
    expect(Number(team.enemy.getSettings()['enemy.def_reduce'])).toBe(30);
});

test("a released saved build loads in full as its link does, and stays as it was saved", () => {
    const packed = released.fixtures.hutaoBennett.packed;
    const saved = CalcSet.deserialize(Serializer.unpack(packed));
    const {app} = makeApp();
    app.newMember(1, DB.Chars.get('Xingqiu'));

    expect(app.loadSavedTeam(saved)).toBe(true);
    const team = app.getTeam();
    expect(ids(team)).toEqual([DB.Chars.get('Hutao').getId(), 0, 0, 0]);
    expect(app.getViewedSlot()).toBe(0);
    expect(team.legacy.getEntries().map((entry) => entry.getSourceId())).toEqual([DB.Chars.get('Bennet').getId()]);
    expect(team.enemy.getLevels().level).toBe(90);

    const linked = makeApp().app;
    linked.loadSerialized(Serializer.unpack(packed));
    expect(team.serialize()).toEqual(linked.getTeam().serialize());

    // The saved build is in no team: it loads again, and into a slot as its character only.
    expect(saved.team).toBeFalsy();
    expect(saved.legacyTeam).toBeTruthy();
    const other = makeApp().app;
    other.fillSlot(1, saved);
    expect(ids(other.getTeam())).toEqual([DB.Chars.get('Hutao').getId(), 0, 0, 0]);
    expect(other.getTeam().legacy.getEntries()).toEqual([]);
    expect(app.loadSavedTeam(saved)).toBe(true);
    expect(app.getTeam().legacy.getEntries()).toHaveLength(1);
});

test("a saved build whose team has beta content is not loaded in full while beta content is hidden", () => {
    const saved = CalcSet.deserialize(Serializer.unpack(released.fixtures.hutaoBennett.packed));
    const {app} = makeApp();
    const before = app.getTeam();
    app.storage.settings.showBetaContent = () => false;
    const beta = jest.spyOn(Team.prototype, 'hasBetaContent').mockReturnValue(true);

    expect(app.loadSavedTeam(saved)).toBe(false);
    expect(app.getTeam()).toBe(before);
    beta.mockRestore();
});

test("a released last_build is retained after its team is saved", () => {
    const original = released.fixtures.hutaoBennett.packed;
    const {app, store} = makeApp({last_build: original});
    expect(app.loadSerialized(Serializer.unpack(store.last_build))).toBe(true);
    expect(store.last_build).toBe(original);
    const team = Team.deserialize(Serializer.unpack(store.last_team));
    expect(team.getMembers()).toHaveLength(1);
    expect(team.legacy.getEntries()).toHaveLength(1);
    expect(team.enemy.getLevels().level).toBe(90);
    app.refresh();
    expect(store.last_build).toBe(original);
});

test("a build of a character already in the team replaces that member", () => {
    const {app} = makeApp();
    app.newMember(1, DB.Chars.get('Xingqiu'));
    app.viewMember(0);
    const xingqiu = makeBuild('Xingqiu');
    xingqiu.setCharLevels({level: 90, ascension: 6, constellation: 6});

    app.replaceSet(xingqiu);
    expect(ids(app.getTeam())).toEqual([DB.Chars.get('Hutao').getId(), DB.Chars.get('Xingqiu').getId(), 0, 0]);
    expect(app.getViewedSlot()).toBe(1);
    expect(app.currentSet().getSettings().char_constellation).toBe(6);
});

test("a suggestion copy of the viewed member replaces it in the real team", () => {
    const {app} = makeApp();
    app.newMember(1, DB.Chars.get('Xingqiu'));
    app.viewMember(0);
    const team = app.getTeam();
    const copy = app.currentSet().clone();
    expect(copy.team).not.toBe(team);
    copy.setCharLevels({level: 80, ascension: 5, constellation: 1});

    app.replaceSet(copy);
    expect(app.getTeam()).toBe(team);
    expect(app.currentSet().team).toBe(team);
    expect(app.currentSet().getSettings().char_level).toBe(80);
    expect(ids(team)[1]).toBe(DB.Chars.get('Xingqiu').getId());
});

test("removing members keeps one and moves the view", () => {
    const {app} = makeApp();
    app.newMember(3, DB.Chars.get('Xingqiu'));
    app.viewMember(0);
    app.removeMember(0);
    expect(app.getViewedSlot()).toBe(3);
    app.removeMember(3);
    expect(app.getTeam().getMembers().length).toBe(1);
    expect(app.currentSet()).toBeInstanceOf(CalcSet);
});

test("resetting the team starts over: one default build, the default enemy, nothing else", () => {
    global.document = {location: {hash: '#link'}};
    try {
        const {app, store} = makeApp();
        // A released link: its enemy, its DEF reduction and a virtual character.
        expect(app.loadSerialized(Serializer.unpack(released.fixtures.hutaoBennett.packed))).toBe(true);
        app.newMember(1, DB.Chars.get('Xingqiu'));
        app.setOnFieldMember(1);
        app.modifyTeamSettings({on_field_shield: true});

        app.resetTeam();

        const team = app.getTeam();
        expect(ids(team)).toEqual([DB.Chars.getFirst().getId(), 0, 0, 0]);
        expect(team.legacy.getEntries()).toHaveLength(0);
        expect(team.serialize()).toEqual(Team.fromMember(defaultBuild()).serialize());
        expect(app.getViewedSlot()).toBe(0);
        expect(store.last_team).toBe(Serializer.pack(team));
        // A reload does not bring the link's team back.
        expect(document.location.hash).toBe('');
    } finally {
        delete global.document;
    }
});

describe("a character added to an empty slot", () => {
    const saved = (store) => ids(Team.deserialize(Serializer.unpack(store.last_team)));
    const hutao = () => DB.Chars.get('Hutao').getId();
    const xingqiu = () => DB.Chars.get('Xingqiu').getId();

    test("is a member at once: viewed, evaluated in the team and saved", () => {
        const {app, store} = makeApp();
        app.newMember(2, DB.Chars.get('Xingqiu'));
        expect(app.getViewedSlot()).toBe(2);
        expect(app.currentSet().char.getId()).toBe(xingqiu());
        expect(app.currentSet().team).toBe(app.getTeam());
        expect(saved(store)).toEqual([hutao(), 0, xingqiu(), 0]);
    });

    test("stays when another slot is viewed, until it is removed", () => {
        const {app, store} = makeApp();
        app.newMember(2, DB.Chars.get('Xingqiu'));
        app.viewMember(0);
        expect(ids(app.getTeam())).toEqual([hutao(), 0, xingqiu(), 0]);

        app.removeMember(2);
        expect(app.getViewedSlot()).toBe(0);
        expect(saved(store)).toEqual([hutao(), 0, 0, 0]);
    });
});


test("recipient input changes save the team", () => {
    const {app, store} = makeApp();
    app.newMember(1, DB.Chars.get('Bennet'));
    const source = app.getTeam().getMember(1).char.getId();
    const receiver = app.getTeam().getMember(0).char.getId();
    app.setConditionValue(source, receiver, 'bennet_fantastic_voyage', false);
    const copy = Team.deserialize(Serializer.unpack(store.last_team));
    expect(copy.getConditionValues(source, receiver).bennet_fantastic_voyage).toBe(false);
    expect(copy.getMember(1).getSettings().bennet_fantastic_voyage).toBeUndefined();
});
