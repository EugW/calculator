import { Backup } from "../src/js/classes/Backup";
import { Serializer } from "../src/js/classes/Serializer";
import { Storage } from "../src/js/classes/Storage";
import { StorageItemChar } from "../src/js/classes/StorageItem/Char";
import { StorageItemTeam } from "../src/js/classes/StorageItem/Team";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { enemyOf, makeBuild } from "./support/team";

global.DB = DB;

function createTeam() {
    const team = Team.fromMember(makeBuild('Hutao'));
    team.setMember(2, makeBuild('Xingqiu'));
    team.setOnFieldMember(team.getMember(2));
    team.enemy.setLevels({level: 77});
    team.getMember(2).setCharLevels({level: 80, ascension: 6, constellation: 4});
    return team;
}

function createStorage() {
    const app = {getSetting: () => 123, refresh: jest.fn()};
    app.storage = new Storage(app);
    return app;
}

beforeEach(() => {
    const values = new Map();
    global.localStorage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
    };
    global.UI = {Lang: {get: (key) => key}, Sync: {setStatus: jest.fn()}};
});

test('named teams persist independent snapshots with empty slots, field state and enemy', () => {
    const team = createTeam();
    const expected = team.serialize();
    const storage = new StorageItemTeam();
    storage.add(team, {title: 'Vaporize'});
    team.getMember(2).setCharLevels({constellation: 6});

    const reloaded = new StorageItemTeam();
    expect(reloaded.get(0).title).toBe('Vaporize');
    expect(reloaded.getItem(0).serialize()).toEqual(expected);
    const firstLoad = reloaded.getItem(0);
    firstLoad.removeMember(2);
    expect(reloaded.getItem(0).getMember(2)).toBeTruthy();
});

test('renaming and overwriting preserve the title while changing the complete team', () => {
    const storage = new StorageItemTeam();
    storage.add(createTeam(), {title: 'Original'});
    storage.setTitle(0, 'Updated');
    const replacement = Team.fromMember(makeBuild('Bennet'));
    storage.replace(0, replacement);
    const reloaded = new StorageItemTeam();
    expect(reloaded.get(0).title).toBe('Updated');
    expect(reloaded.getItem(0).serialize()).toEqual(replacement.serialize());
    reloaded.remove(0);
    expect(new StorageItemTeam().list()).toEqual([]);
});

test('backup round-trip includes named teams and replaces or appends without duplicate names and data', () => {
    const source = createStorage();
    source.storage.team.add(createTeam(), {title: 'Vaporize'});
    source.storage.team.add(createTeam(), {title: 'Alternate'});
    const backup = Backup.fromString(source.storage.createBackup().stringify());
    expect(backup.getTeams()).toHaveLength(2);
    expect(backup.getLastModified()).toBe(123);

    source.storage.team.clear();
    source.storage.team.add(Team.fromMember(makeBuild('Bennet')), {title: 'Old'});
    source.storage.loadBackup(backup);
    expect(source.storage.team.list().map((item) => item.title)).toEqual(['Vaporize', 'Alternate']);
    expect(source.storage.team.getItem(0).serialize()).toEqual(createTeam().serialize());
    source.storage.loadBackup(backup, {addTeams: true});
    expect(source.storage.team.list()).toHaveLength(2);
});

test('partial backups preserve saved teams while an explicitly empty team backup clears them', () => {
    const {storage} = createStorage();
    storage.team.add(createTeam(), {title: 'Keep'});
    const partial = Backup.fromString(storage.createBackup({saveArts: true}).stringify());
    expect(partial.getTeams()).toBeUndefined();
    storage.loadBackup(partial);
    expect(storage.team.list()).toHaveLength(1);

    storage.loadBackup(Backup.fromString(JSON.stringify({version: 1, teams: []})));
    expect(storage.team.list()).toEqual([]);
});

test('a team-only backup leaves other libraries intact and full empty backups clear them', () => {
    const {storage} = createStorage();
    storage.char.add(makeBuild('Bennet'), {title: 'Keep character'});
    const teamOnly = Backup.fromString(storage.createBackup({saveTeams: true}).stringify());
    storage.loadBackup(teamOnly);
    expect(storage.char.list()).toHaveLength(1);
    expect(teamOnly.getArtifacts()).toBeUndefined();
    expect(teamOnly.getRotations()).toBeUndefined();

    const empty = Backup.fromString(JSON.stringify({version: 1, chars: [], teams: [], artifacts: [], rotations: []}));
    storage.loadBackup(empty);
    expect(storage.char.list()).toEqual([]);
});

test('invalid and empty teams are ignored when reading a backup or listing the library', () => {
    const valid = {title: 'Valid', data: Serializer.pack(createTeam())};
    const bad = [{data: '!'}, {data: Serializer.pack(new Team())}, null];
    const backup = Backup.fromString(JSON.stringify({version: 1, teams: [...bad, valid]}));
    expect(backup.getTeams()).toEqual([valid]);
    localStorage.setItem('teams', JSON.stringify([...bad, valid]));
    expect(new StorageItemTeam().listDecoded(true).map((item) => item.title)).toEqual(['Valid']);
});

test('a team containing beta content follows the library visibility setting', () => {
    const storage = new StorageItemTeam();
    const team = Team.fromMember(makeBuild('Hutao'));
    team.getMember(0).hasBetaContent = () => true;
    storage.items = [{data: 'fixture', title: 'Beta team'}];
    storage.decodeItem = () => team;
    expect(storage.listDecoded(false)).toEqual([]);
    expect(storage.listDecoded(true)).toHaveLength(1);
});

test('saved character builds detach from their source team and keep only the selected member', () => {
    const team = createTeam();
    const storage = new StorageItemChar();
    storage.add(team.getMember(2), {title: 'Xingqiu'});
    const saved = storage.getItem(0);
    expect(saved.team).toBeNull();
    expect(saved.char.getId()).toBe(team.getMember(2).char.getId());
    expect(saved.getSettings().char_constellation).toBe(4);
    expect(enemyOf(Team.solo(saved)).enemy_level).not.toBe(77);
    expect(team.getMember(2).team).toBe(team);
    expect(enemyOf(team.getMember(2)).enemy_level).toBe(77);
});

test('Drive upload and download use the same complete team backup', async () => {
    const app = createStorage();
    app.storage.team.add(createTeam(), {title: 'Synced'});
    const sync = app.storage.sync;
    sync.backupFileId = async () => 'backup-id';
    sync.api.upload = jest.fn(async () => {});
    sync.processError = (error) => { throw error; };
    await sync.storageSyncUpload();
    const [fileId, payload] = sync.api.upload.mock.calls[0];
    expect(fileId).toBe('backup-id');
    const backup = Backup.fromString(payload);
    expect(backup.getTeams()[0].title).toBe('Synced');
    app.storage.team.clear();
    await sync.storageSyncDownload(backup);
    expect(app.storage.team.getItem(0).serialize()).toEqual(createTeam().serialize());
    expect(app.refresh).toHaveBeenCalled();
});
