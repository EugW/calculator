import { CalcSet } from "../src/js/classes/CalcSet";
import { Serializer } from "../src/js/classes/Serializer";
import { StorageItemChar } from "../src/js/classes/StorageItem/Char";
import { Team } from "../src/js/classes/Team";
import { LEGACY_KINDS } from "../src/js/classes/Team/Legacy";
import { DB } from "../src/js/db/DB";
import { makeSetArtifacts, numbersClose } from "./support/baseline";
import { enemyOf, finalStats, makeBuild, stackKeys, stackSource } from "./support/team";
import released from "./fixtures/public-main-builds.json";
import references from "./fixtures/public-main-references.json";

global.DB = DB;
global.UI ||= {Lang: {get: () => ''}};

// Released links (format 1) load as they are: the link's character is the
// one member, its party rows are virtual characters and its weapon and set
// rows floating entries of the team's legacy source (Team/Legacy,
// Legacy/Team.loadLegacyTeam). The fixtures are builds of the released
// branch with the results its engine gave them (public-main-references.json:
// every feature and the final stats, recorded there).

const fixtures = references.fixtures;
const decode = (fixture) => CalcSet.deserialize(Serializer.unpack(fixture.packed));
const charId = (key) => DB.Chars.get(key).getId();
const charIds = (team) => team.getMembers().map((member) => member.char.getId());
const virtualIds = (team) => team.legacy.getEntries().filter((entry) => entry.kind == LEGACY_KINDS.CHAR)
    .map((entry) => entry.getSourceId());
const entryOf = (team, key) => team.legacy.getBySourceId(charId(key));
const floating = (team, kind) => team.legacy.getEntries().filter((entry) => entry.kind == kind);

/**
 * @param {CalcSet} build the link's character in its team
 * @param {Object} expected recorded features of the released engine
 * @param {Array.<string>} [ignore] features that differ for a stated reason
 * @returns {Array.<string>} mismatches
 */
function compareFeatures(build, expected, ignore = []) {
    const actual = build.getFeatures(build.getBuildData());
    const mismatches = [];
    for (const name of Object.keys(expected)) {
        if (ignore.includes(name)) continue;
        if (!actual[name]) {
            mismatches.push(name + ' is missing');
            continue;
        }
        for (const field of ['normal', 'crit', 'average']) {
            const value = Number.isFinite(actual[name][field]) ? actual[name][field] : null;
            if (!numbersClose(value, expected[name][field])) {
                mismatches.push(`${name}.${field} expected=${expected[name][field]} actual=${value}`);
            }
        }
    }
    // The rotation's own-hits total did not exist; nothing else is new.
    for (const name of Object.keys(actual)) {
        if (!expected[name] && name != 'rotation_self.total') mismatches.push(name + ' is new');
    }
    return mismatches;
}

test.each(Object.entries(released.fixtures))("released %s payload is genuine format 1 and retains its enemy", (name, fixture) => {
    expect(Serializer.unpack(fixture.packed)).toEqual(fixture.raw);
    expect(fixture.raw[0]).toBe(1);
    // The references were recorded from the same payloads.
    expect(fixtures[name].packed).toBe(fixture.packed);
    expect(fixtures[name].features[fixture.reference.feature].normal).toBe(fixture.reference.result.normal);

    const build = decode(fixture);
    expect(build).not.toBeNull();
    const team = Team.fromMember(build);
    expect(team.enemy.getLevels()).toEqual(fixture.enemy.levels);
    expect(team.enemy.getResistances()).toEqual(fixture.enemy.resistances);
    expect(team.enemy.object?.getId() || 0).toBe(fixture.enemy.id);
    for (const [setting, value] of Object.entries(fixture.enemy.settings)) {
        // The old enemy put raw resistances in settings as well as stats.
        if (!setting.startsWith('enemy_res_')) expect(team.enemy.getSettings()[setting]).toEqual(value);
    }
    const reduction = fixture.buffs['custom_buffs.enemy_def_reduce'];
    if (reduction !== undefined) {
        expect(Number(team.enemy.getSettings()['enemy.def_reduce'])).toBe(reduction);
        expect(finalStats(build).get('enemy__def_reduce')).toBeCloseTo(reduction / 100, 10);
    }
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(charIds(copy)).toEqual(charIds(team));
    expect(copy.enemy.getResistances()).toEqual(team.enemy.getResistances());
    expect(copy.enemy.getLevels()).toEqual(team.enemy.getLevels());
});

describe("a released link reproduces the released results", () => {
    // Every feature of the link's character, against the released engine.
    test.each([
        'hutaoBennett', 'talentsAndEnemy', 'dropdowns', 'resonances', 'renamed', 'partyOrderUnique',
    ])("%s", (name) => {
        const build = decode(fixtures[name]);
        const team = Team.fromMember(build);
        expect(charIds(team)).toEqual([build.char.getId()]);
        expect(compareFeatures(build, fixtures[name].features)).toEqual([]);
        expect(build.getBuildData().settings.party_size).toBe(fixtures[name].partySize);
        expect(team.migration.dropped).toEqual([]);

        // And again after the team is saved and loaded.
        const copy = Team.deserialize(team.serialize()).getMember(0);
        expect(compareFeatures(copy, fixtures[name].features)).toEqual([]);
    });

    test("additionalSupports: three party rows, seven additional supports, weapon and set rows", () => {
        const fixture = fixtures.additionalSupports;
        const build = decode(fixture);
        const team = Team.fromMember(build);

        expect(charIds(team)).toEqual([charId('Skirk')]);
        expect(virtualIds(team)).toEqual(fixture.party);
        expect(team.evaluate().fillers.map((entry) => entry.getSourceId())).toEqual(fixture.party.slice(0, 3));
        expect(floating(team, LEGACY_KINDS.SET).map((entry) => entry.getSet())).toEqual([
            'NoblesseOblige', 'ViridescentVenerer', 'Instructor', 'TenacityofMillelith', 'ScrollOfTheEmberedCitysHero',
        ]);
        expect(floating(team, LEGACY_KINDS.WEAPON).map((entry) => [entry.weapon.object.name, entry.getRefine(), entry.stated])).toEqual([
            ['thrilling_tales_of_dragon_slayers', 5, {}],
            ['key_of_khaj_nisut', 5, {hp: 80000}],
            ['peak_patrol_song', 5, {def: 3200}],
            ['starcallers_watch', 1, {}],
        ]);
        expect(team.migration.dropped).toEqual([]);
        expect(team.getRotation().getItems()).toHaveLength(1);

        // Nahida's old row had her C2 DEF reduction on and its CRIT part off.
        // The CRIT of Burning and the Bloom reactions is her second
        // constellation itself now, as the game has it: their CRIT values differ.
        const nahidaC2 = ['reaction.burgeon', 'reaction.burning'];
        expect(compareFeatures(build, fixture.features, nahidaC2)).toEqual([]);
        const features = build.getFeatures(build.getBuildData());
        for (const name of nahidaC2) {
            expect(features[name].normal).toBeCloseTo(fixture.features[name].normal, 6);
            expect(features[name].crit).toBeCloseTo(fixture.features[name].normal * 2, 6);
        }

        const copy = Team.deserialize(team.serialize()).getMember(0);
        expect(compareFeatures(copy, fixture.features, nahidaC2)).toEqual([]);
    });

    test("sandroneOdette: Odette's row gives the party its Marvelous Splendor and her C6", () => {
        const fixture = fixtures.sandroneOdette;
        const build = decode(fixture);
        const team = Team.fromMember(build);
        const odette = entryOf(team, 'Odette');

        expect(charIds(team)).toEqual([charId('Sandrone')]);
        expect(virtualIds(team)).toEqual(fixture.party);
        expect(floating(team, LEGACY_KINDS.SET).map((entry) => entry.getSet())).toEqual(['HeartOfTheFurnace']);
        expect(team.getSettings().polestar_field).toBe(true);
        expect(team.migration.dropped).toEqual([]);

        // The row's stacks were the party's, not Odette's own count; its C6
        // switch was the party's elevation, which is a state of hers now.
        const settings = odette.char.getSettings();
        expect(odette.getConstellation()).toBe(6);
        expect(odette.stated).toEqual({atk: 3196});
        expect(settings.odette_marvelous_splendor_others).toBe(6);
        expect(settings.odette_marvelous_splendor).toBeUndefined();
        expect(settings.odette_all_party_marvelous_splendor).toBe(true);
        expect(settings.odette_solo_dance_double).toBe(true);
        expect(settings.odette_radiance_stellarconduct).toBe(true);

        // Stellar-Swirl as the team deals it is a feature of this version;
        // the released engine had the character's contributions only.
        const teamReactions = ['reaction.stellarswirl_anemo is new', 'reaction.stellarswirl_vortex_1 is new'];
        expect(compareFeatures(build, fixture.features)).toEqual(teamReactions);
        expect(build.getBuildData().settings.party_size).toBe(fixture.partySize);
        const features = build.getFeatures(build.getBuildData());
        expect(features['burst.sandrone_convective_inhibition_ray_stellarconduct'].crit).toBeCloseTo(523017.7285, 3);

        const copy = Team.deserialize(team.serialize()).getMember(0);
        expect(compareFeatures(copy, fixture.features)).toEqual(teamReactions);
    });
});

describe("party rows become virtual characters", () => {
    test("Bennett: typed Base ATK, burst level and his control, no build", () => {
        const team = Team.fromMember(decode(fixtures.hutaoBennett));
        const bennett = entryOf(team, 'Bennet');

        expect(charIds(team)).toEqual([charId('Hutao')]);
        expect(bennett.kind).toBe(LEGACY_KINDS.CHAR);
        expect(bennett.stated).toEqual({atk_base: 800});
        expect(bennett.getSkills()).toEqual({attack: 1, elemental: 1, burst: 10});
        expect(bennett.getConstellation()).toBe(0);
        expect(bennett.char.getSettings().bennet_fantastic_voyage).toBe(true);
        expect(bennett.weapon).toBeUndefined();

        const restored = entryOf(Team.deserialize(team.serialize()), 'Bennet');
        expect(restored.stated).toEqual({atk_base: 800});
        expect(restored.getSkills().burst).toBe(10);
        expect(restored.char.getSettings().bennet_fantastic_voyage).toBe(true);
    });

    test("constellation switches and constellation effects set the constellation", () => {
        const team = Team.fromMember(decode(fixtures.talentsAndEnemy));
        // Shenhe: party.shenhe_constellation_3; Eula: _5; Mona: her burst switch is her third.
        expect(entryOf(team, 'Shenhe').getConstellation()).toBe(3);
        expect(entryOf(team, 'Eula').getConstellation()).toBe(5);
        expect(entryOf(team, 'Mona').getConstellation()).toBe(3);
        expect(entryOf(team, 'Shenhe').getSkills()).toEqual({attack: 1, elemental: 9, burst: 8});
        expect(entryOf(team, 'Shenhe').stated).toEqual({atk: 2000});
        expect(entryOf(team, 'Eula').getSkills().elemental).toBe(7);
        expect(entryOf(team, 'Mona').getSkills().burst).toBe(6);
        expect(entryOf(team, 'Shenhe').char.getSettings().shenhe_icy_quill).toBe(true);

        const supports = Team.fromMember(decode(fixtures.additionalSupports));
        // Xilonen's C2 Chiucue Mix has no control now: it is her constellation.
        expect(entryOf(supports, 'Xilonen').getConstellation()).toBe(4);
        expect(entryOf(supports, 'Xilonen').stated).toEqual({def: 3200});
        expect(entryOf(supports, 'Bennet').getConstellation()).toBe(5);
        expect(entryOf(supports, 'Nahida').getConstellation()).toBe(2);
        expect(entryOf(supports, 'Nahida').char.getSettings().nahida_the_root_of_all_fullness).toBe(true);
    });

    test("dropdown values and renamed controls map to the character's own", () => {
        const dropdowns = Team.fromMember(decode(fixtures.dropdowns));
        expect(entryOf(dropdowns, 'Kazuha').char.getSettings().kaedehara_kazuha_poetics_of_fuubutsu).toBe('hydro;pyro');
        expect(entryOf(dropdowns, 'Kazuha').stated).toEqual({mastery: 800});
        expect(entryOf(dropdowns, 'Sucrose').char.getSettings().sucrose_chaotic_entropy).toBe('pyro');
        expect(entryOf(dropdowns, 'Nicole').char.getSettings().nicole_grace_of_kenosis).toBe('guidance');
        expect(entryOf(dropdowns, 'Nicole').getSkills()).toEqual({attack: 1, elemental: 9, burst: 7});

        const original = Team.fromMember(decode(fixtures.renamed));
        for (const team of [original, Team.deserialize(original.serialize())]) {
            const diona = entryOf(team, 'Diona').char.getSettings();
            expect(diona.diona_cats_tail_mastery).toBe(true);
            expect(diona.diona_radiance_stellarswirl).toBe(true);
            expect(diona.diona_cats_tail_radiance).toBe(true);
            const qiqi = entryOf(team, 'Qiqi').char.getSettings();
            expect(qiqi.qiqi_radiance_stellarswirl).toBe(true);
            expect(qiqi.qiqi_herald_of_frost_radiance).toBe(true);
            const yoimiya = entryOf(team, 'Yoimiya').char.getSettings();
            expect(yoimiya.yoimiya_summer_nights_dawn).toBe(true);
            expect(yoimiya.yoimiya_summer_nights_dawn_stacks).toBe(6);
        }
    });

    test("a character is in the team once: the build's own character and a repeated row are reported", () => {
        const fixture = fixtures.partyOrder;
        const build = decode(fixture);
        const team = Team.fromMember(build);

        // Rows: Bennett, Kazuha, Hu Tao (the build's own), Bennett again, Xingqiu, Sucrose.
        expect(fixture.party).toEqual(['Bennet', 'Kazuha', 'Hutao', 'Bennet', 'Xingqiu', 'Sucrose'].map(charId));
        expect(charIds(team)).toEqual([charId('Hutao')]);
        expect(virtualIds(team)).toEqual(['Bennet', 'Kazuha', 'Xingqiu', 'Sucrose'].map(charId));
        expect(team.evaluate().fillers.map((entry) => entry.getSourceId())).toEqual(['Bennet', 'Kazuha', 'Xingqiu'].map(charId));
        expect(team.migration.dropped.map((item) => [item.charId, item.reason])).toEqual([
            [charId('Hutao'), 'duplicate_member'], [charId('Bennet'), 'duplicate_member'],
        ]);
        expect(team.getSettings().polestar_field).toBe(true);
        expect(team.getSettings().polestar_included_hits).toBe(5);
        expect(build.buffs.getSettings()['custom_buffs.atk']).toBe(123);

        // The released engine summed the repeated Bennett's inputs and applied
        // him twice (2,990 flat ATK). With every character once it gave what
        // the team gives.
        expect(compareFeatures(build, fixture.features)).not.toEqual([]);
        expect(compareFeatures(build, fixtures.partyOrderUnique.features)).toEqual([]);
    });
});

describe("weapon and set rows become floating entries", () => {
    test("each takes its own controls, refinement and typed stat", () => {
        const team = Team.fromMember(decode(fixtures.additionalSupports));
        const sets = Object.fromEntries(floating(team, LEGACY_KINDS.SET).map((entry) => [entry.getSet(), entry.getSettings()]));

        expect(sets.NoblesseOblige['set.noblesse_oblige_4']).toBe(true);
        expect(sets.ViridescentVenerer['set.viridescent_venerer_4']).toBe('pyro');
        expect(sets.ScrollOfTheEmberedCitysHero['set.scroll_of_the_hero_of_cinder_city_4_1']).toBe(true);
        expect(sets.ScrollOfTheEmberedCitysHero['set.scroll_of_the_hero_of_cinder_city_4_2']).toBe(true);

        const [tales, key] = floating(team, LEGACY_KINDS.WEAPON);
        expect(tales.getSettings().weapon_thrilling_tales_receiver).toBe(charId('Skirk'));
        expect(key.getSettings().weapon_key_of_khaj_nisut).toBe(3);
        // The old mode dropdowns of weapons that were not added are not reported.
        expect(team.migration.dropped).toEqual([]);
    });

    test("an entry and a member with the same effect count once", () => {
        const team = Team.fromMember(decode(fixtures.additionalSupports));
        const skirk = team.getMember(0);
        const before = finalStats(skirk).get('atk_percent');

        const noblesse = makeBuild('Xingqiu');
        team.setMember(1, noblesse);
        noblesse.replaceArtifacts(makeSetArtifacts('NoblesseOblige').slice(0, 4));
        expect(stackKeys(team)).toContain('noblesse_oblige_4');
        expect(stackSource(team, 'noblesse_oblige_4')).toBe(noblesse);
        expect(finalStats(skirk).get('atk_percent')).toBeCloseTo(before, 9);
    });
});

describe("the released context belongs to a new team only", () => {
    test("saved builds keep it until a new team is made", () => {
        const storage = Object.create(StorageItemChar.prototype);
        storage.items = [{title: 'Released', data: fixtures.hutaoBennett.packed}];
        const saved = storage.getItem(0);
        expect(saved.team).toBeNull();
        const first = Team.solo(saved);
        expect(first.team.getMembers()).toHaveLength(1);
        expect(virtualIds(first.team)).toEqual([charId('Bennet')]);
        expect(enemyOf(first).enemy_level).toBe(90);
        first.team.enemy.setLevels({level: 42});
        first.team.legacy.getEntries()[0].setStated('atk_base', 1);
        const second = Team.solo(saved);
        expect(enemyOf(second).enemy_level).toBe(90);
        expect(entryOf(second.team, 'Bennet').stated).toEqual({atk_base: 800});
        expect(saved.team).toBeNull();
        expect(storage.items[0].data).toBe(fixtures.hutaoBennett.packed);
        expect(second.team.migration).toEqual(first.team.migration);
    });

    test("a backup's released build is stored as it is, and a build of this version as its character", () => {
        const written = [];
        global.localStorage = {getItem: () => null, setItem: (key, value) => written.push([key, value])};
        const storage = new StorageItemChar();
        const current = Serializer.pack(makeBuild('Nahida'));
        storage.fromBackup([
            {title: 'Released', data: fixtures.hutaoBennett.packed, hash: 'stale'},
            {title: 'Current', data: current},
        ]);

        expect(storage.items).toEqual([
            {title: 'Released', data: fixtures.hutaoBennett.packed},
            {title: 'Current', data: current},
        ]);
        expect(virtualIds(Team.solo(storage.getItem(0)).team)).toEqual([charId('Bennet')]);
        expect(JSON.parse(written[written.length - 1][1])).toEqual(storage.items);

        // Added to what is stored, a record that is there already is not repeated.
        storage.fromBackup([{title: 'Released', data: fixtures.hutaoBennett.packed}], true);
        expect(storage.items).toHaveLength(2);
        delete global.localStorage;
    });

    test("importing a released build into an existing slot takes only its character", () => {
        const legacy = decode(fixtures.additionalSupports);
        const team = Team.fromMember(makeBuild('Nahida'));
        team.enemy.setLevels({level: 75});
        team.modifySettings({polestar_field: true});
        const member = team.importMember(1, legacy);
        expect(charIds(team)).toEqual(['Nahida', 'Skirk'].map(charId));
        expect(team.legacy.getEntries()).toEqual([]);
        expect(member.legacyTeam).toBeNull();
        expect(enemyOf(member).enemy_level).toBe(75);
        expect(team.getSettings().polestar_field).toBe(true);
        expect(legacy.legacyTeam).not.toBeNull();
    });

    test("released resonance controls and shield become shared team settings", () => {
        const team = Team.fromMember(decode(fixtures.resonances));
        for (const name of ['buffs.resonance_geo_attack', 'buffs.resonance_dendro_1', 'buffs.resonance_dendro_2', 'on_field_shield']) {
            expect(team.getSettings()[name]).toBe(true);
            expect(Team.deserialize(team.serialize()).getSettings()[name]).toBe(true);
            for (const member of team.getMembers()) expect(member.getSettings()[name]).toBeUndefined();
        }
    });

    test("an explicit enemy override does not mutate the decoded released enemy", () => {
        const legacy = decode(fixtures.hutaoBennett);
        const other = Team.fromMember(makeBuild('Nahida')).enemy;
        other.setLevels({level: 42});
        const team = Team.fromMember(legacy, other);
        expect(team.enemy).toBe(other);
        expect(legacy.legacyTeam.enemy.getLevels().level).toBe(90);
    });
});
