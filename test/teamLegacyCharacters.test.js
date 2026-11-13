import { ConditionDropdownTeamMember } from "../src/js/classes/Condition/Dropdown/TeamMember";
import { ConditionOnField, ConditionShielded } from "../src/js/classes/Condition/Field";
import { Team } from "../src/js/classes/Team";
import { FloatingSet, VirtualCharacter } from "../src/js/classes/Team/Legacy";
import { partyView } from "../src/js/classes/Team/Party";
import { teamState } from "../src/js/classes/Team/Scope";
import { DB } from "../src/js/db/DB";
import { enemyChange, finalStats, makeBuild, totalMastery } from "./support/team";

global.DB = DB;

// Virtual characters of the legacy source (Team/Legacy): a character with
// its constellation, talent levels, controls and stated stats, and no build.
// The recorded party rows of the old model replay as virtual characters in
// test/teamConversionChars*.test.js; these are the rules around them.

function virtual(team, charKey, setup = {}) {
    const entry = team.addLegacy(new VirtualCharacter(DB.Chars.get(charKey)));
    entry.setConstellation(setup.constellation || 0);
    entry.setSkills(setup.skills || {attack: 10, elemental: 10, burst: 10});
    entry.setSettings(setup.settings || {});
    for (const [kind, value] of Object.entries(setup.stated || {})) {
        entry.setStated(kind, value);
    }
    return entry;
}

const charId = (key) => DB.Chars.get(key).getId();
const party = (team) => teamState(team.getMember(0).getBuildData().settings).members.map((member) => member.charId);
const scopeOf = (team, entry) => team.evaluate().resolveFull(entry).settings;

describe("composition: the first three virtual characters fill the free slots", () => {
    test("one member and four virtual characters: the member and the first three", () => {
        const team = Team.fromMember(makeBuild('Hutao'));
        for (const key of ['Bennet', 'Xingqiu', 'Kazuha', 'Zhongli']) virtual(team, key);

        expect(party(team)).toEqual(['Hutao', 'Bennet', 'Xingqiu', 'Kazuha'].map(charId));
        expect(team.getMember(0).getBuildData().settings.party_size).toBe(4);
    });

    test("three members and two virtual characters: the members and the first", () => {
        const team = Team.fromMember(makeBuild('Hutao'));
        team.setMember(1, makeBuild('Yelan'));
        team.setMember(3, makeBuild('Zhongli'));
        virtual(team, 'Bennet');
        virtual(team, 'Kazuha');

        expect(party(team)).toEqual(['Hutao', 'Yelan', 'Zhongli', 'Bennet'].map(charId));
    });

    test("four members: the members only", () => {
        const team = Team.fromMember(makeBuild('Hutao'));
        ['Yelan', 'Xingqiu', 'Zhongli'].forEach((key, i) => team.setMember(i + 1, makeBuild(key)));
        ['Bennet', 'Kazuha', 'Nahida'].forEach((key) => virtual(team, key));

        expect(party(team)).toEqual(['Hutao', 'Yelan', 'Xingqiu', 'Zhongli'].map(charId));
        expect(team.getMember(0).getBuildData().settings.party_size).toBe(4);
    });

    test("a fourth virtual character never fills, whatever is free", () => {
        const team = Team.fromMember(makeBuild('Hutao'));
        ['Bennet', 'Xingqiu', 'Kazuha', 'Xiangling'].forEach((key) => virtual(team, key));
        team.legacy.remove(team.legacy.getEntries()[0]);

        // Xingqiu, Kazuha and Xiangling are the first three now.
        expect(party(team)).toEqual(['Hutao', 'Xingqiu', 'Kazuha', 'Xiangling'].map(charId));
    });

    test("the party's resonance counts them", () => {
        const receiver = makeBuild('Hutao');
        const team = Team.fromMember(receiver);
        team.modifySettings({'buffs.only_full_party_resonance': true});
        const alone = finalStats(receiver).get('atk_percent');

        virtual(team, 'Bennet');
        virtual(team, 'Xingqiu');
        // Two Pyro, but the party is not full.
        expect(finalStats(receiver).get('atk_percent')).toBeCloseTo(alone, 9);
        virtual(team, 'Kazuha');
        expect(finalStats(receiver).get('atk_percent')).toBeCloseTo(alone + 0.25, 9);
    });

    test("a filler is in the party and nowhere else: no receiver, not on field, not a choice of a receiver", () => {
        const receiver = makeBuild('Hutao');
        const team = Team.fromMember(receiver);
        const bennett = virtual(team, 'Bennet');
        const evaluation = team.evaluate();

        expect(evaluation.getMembers()).toEqual([receiver]);
        expect(evaluation.fillers).toEqual([bennett]);
        expect(team.getOnFieldMember()).toBe(receiver);

        const settings = receiver.getBuildData().settings;
        expect(teamState(settings).isOnField(bennett.getSourceId())).toBe(false);
        expect(teamState(settings).getReceivers().map((member) => member.charId)).toEqual([charId('Hutao')]);

        const ids = (params) => new ConditionDropdownTeamMember(Object.assign({name: 'test'}, params))
            .getDropdownItems(settings).map((item) => Number(item.value));
        expect(ids({})).toEqual([charId('Hutao')]);
        expect(ids({allowVirtual: true})).toEqual([charId('Hutao'), charId('Bennet')]);

        // The team's on-field choice cannot be a virtual character.
        team.settings.on_field_char = bennett.getSourceId();
        expect(teamState(receiver.getBuildData().settings).isOnField(charId('Hutao'))).toBe(true);
    });
});

describe("a character is in the team once", () => {
    test("a member cannot be added as a virtual character, nor a virtual character twice", () => {
        const team = Team.fromMember(makeBuild('Hutao'));
        virtual(team, 'Bennet');

        expect(() => virtual(team, 'Hutao')).toThrow('The character is already in the team');
        expect(() => virtual(team, 'Bennet')).toThrow('already a virtual character');
        expect(team.legacy.getEntries()).toHaveLength(1);
    });

    test("a member takes precedence: its virtual character is kept and has no effect", () => {
        const receiver = makeBuild('Hutao');
        const team = Team.fromMember(receiver);
        const bennett = virtual(team, 'Bennet', {settings: {bennet_fantastic_voyage: true}, stated: {atk_base: 800}});
        const withVirtual = finalStats(receiver).get('atk');
        expect(team.getSources()).toEqual([receiver, bennett]);

        const real = makeBuild('Bennet');
        team.setMember(1, real);
        expect(team.getSources()).toEqual([receiver, real]);
        expect(team.legacy.getEntries()).toEqual([bennett]);
        expect(party(team)).toEqual(['Hutao', 'Bennet'].map(charId));
        expect(finalStats(receiver).get('atk')).not.toBeCloseTo(withVirtual, 3);

        team.removeMember(1);
        expect(team.getSources()).toEqual([receiver, bennett]);
        expect(finalStats(receiver).get('atk')).toBeCloseTo(withVirtual, 9);
    });
});

describe("a virtual character has no build", () => {
    test("its stats are the ones it states: unstated is zero, stated is final", () => {
        // Fantastic Voyage: ATK from Bennett's Base ATK and burst level.
        const receiver = makeBuild('Hutao');
        const team = Team.fromMember(receiver);
        const base = finalStats(receiver).get('atk');

        const bennett = virtual(team, 'Bennet', {settings: {bennet_fantastic_voyage: true}});
        expect([...bennett.statsRead()]).toContain('atk_base');
        expect(finalStats(receiver).get('atk') - base).toBeCloseTo(0, 9);

        bennett.setStated('atk_base', 800);
        const level10 = finalStats(receiver).get('atk') - base;
        expect(level10).toBeGreaterThan(0);
        bennett.setStated('atk_base', 400);
        expect(finalStats(receiver).get('atk') - base).toBeCloseTo(level10 / 2, 6);

        // Its talent levels are its own; its constellation adds its bonus.
        bennett.setStated('atk_base', 800);
        bennett.setSkills({burst: 1});
        const level1 = finalStats(receiver).get('atk') - base;
        expect(level1).toBeLessThan(level10);
        bennett.setConstellation(5);
        expect(finalStats(receiver).get('atk') - base).toBeGreaterThan(level1);
    });

    test("its control can differ per receiving member", () => {
        const receiver = makeBuild('Hutao');
        const mate = makeBuild('Xingqiu');
        const team = Team.fromMember(receiver);
        team.setMember(1, mate);
        const atk = (member) => finalStats(member).get('atk');
        const base = [atk(receiver), atk(mate)];

        const bennett = virtual(team, 'Bennet', {settings: {bennet_fantastic_voyage: true}, stated: {atk_base: 800}});
        const gain = atk(receiver) - base[0];
        expect(gain).toBeGreaterThan(0);
        expect(atk(mate) - base[1]).toBeCloseTo(gain, 6);

        team.setConditionValue(bennett.getSourceId(), mate.char.getId(), 'bennet_fantastic_voyage', false);
        expect(atk(receiver) - base[0]).toBeCloseTo(gain, 6);
        expect(atk(mate) - base[1]).toBeCloseTo(0, 6);
        expect(atk(Team.deserialize(team.serialize()).getMember(1)) - base[1]).toBeCloseTo(0, 6);
    });

    test("a counter of its own controls stays a stat its effects read", () => {
        // Furina's Fanfare: a number control, read by her burst's DMG bonus.
        const receiver = makeBuild('Hutao');
        const team = Team.fromMember(receiver);
        const base = finalStats(receiver).get('dmg_all');

        virtual(team, 'Furina', {settings: {furina_fanfare_stacks: 300}});
        expect(finalStats(receiver).get('dmg_all') - base).toBeGreaterThan(0);
    });

    test("team-wide reads count a filler's stated stat", () => {
        // Nahida's A1: 25% of the party's highest Elemental Mastery, to the on-field member.
        const receiver = makeBuild('Hutao');
        const team = Team.fromMember(receiver);
        const a1 = {nahida_illusory_heart: true, nahida_compassion_illuminated: true};
        const nahida = virtual(team, 'Nahida', {stated: {mastery: 800}});
        const gain = () => {
            nahida.setSettings({});
            const off = totalMastery(finalStats(receiver));
            nahida.setSettings(a1);
            return {off, gain: totalMastery(finalStats(receiver)) - off};
        };
        expect(gain().gain).toBeCloseTo(200, 6);

        // Another filler with more is the highest.
        const kazuha = virtual(team, 'Kazuha', {stated: {mastery: 960}});
        expect(gain().gain).toBeCloseTo(240, 6);

        // A member can be the highest: the released typed value replaced the
        // party maximum, a stated one is one of the party's.
        team.legacy.remove(kazuha);
        nahida.setStated('mastery', 100);
        receiver.modifyBuffsSettings({'custom_buffs.mastery': 500});
        const result = gain();
        expect(result.off).toBeCloseTo(500, 6);
        expect(result.gain).toBeCloseTo(125, 6);
    });
});

describe("a virtual character of the party can be the source of a team choice", () => {
    test("Ascendant Gleam: the non-Moonsign source is a virtual Bennett with a stated ATK", () => {
        // 0.9% Lunar Reaction DMG per 100 ATK of the source, up to 36%.
        const receiver = makeBuild('Hutao');
        const team = Team.fromMember(receiver);
        team.setMember(1, makeBuild('Ineffa'));
        team.setMember(2, makeBuild('Aino'));
        const bennett = virtual(team, 'Bennet', {stated: {atk: 2000}});
        const lunar = () => finalStats(receiver).get('dmg_reaction_lunar');
        const off = lunar();

        team.modifySettings({ascendant_gleam_source: bennett.getSourceId()});
        expect(lunar() - off).toBeCloseTo(0.18, 10);

        // Outside the party (no free slot) it is not a source the team can choose.
        team.setMember(3, makeBuild('Xingqiu'));
        expect(team.evaluate().fillers).toEqual([]);
    });
});

describe("what a virtual character cannot have is taken as met", () => {
    test("its own field state, in either form; a receiver's is read", () => {
        const receiver = makeBuild('Hutao');
        const team = Team.fromMember(receiver);
        const kaveh = virtual(team, 'Kaveh');
        const scope = scopeOf(team, kaveh);

        expect(new ConditionOnField().isActive(scope)).toBe(true);
        expect(new ConditionOnField({invert: true}).isActive(scope)).toBe(true);
        expect(new ConditionShielded().isActive(scope)).toBe(true);

        const settings = receiver.getBuildData().settings;
        expect(new ConditionOnField().isActive(settings)).toBe(true);
        expect(new ConditionOnField({invert: true}).isActive(settings)).toBe(false);
    });

    test("a party restriction of its own, when it fills no slot", () => {
        // Chevreuse's A1 needs a party of only Pyro and Electro characters.
        const tactics = {settings: {chevreuse_tactics: true}};
        const shred = (team) => enemyChange(team.getMember(0), 'enemy_res_pyro');

        // In the party (a filler) with a Hydro character: the restriction holds.
        const mixed = Team.fromMember(makeBuild('Hutao'));
        virtual(mixed, 'Xingqiu');
        virtual(mixed, 'Chevreuse', tactics);
        expect(shred(mixed)).toBeCloseTo(0, 9);

        // In the party with Pyro and Electro only: met.
        const fitting = Team.fromMember(makeBuild('Hutao'));
        virtual(fitting, 'Fischl');
        virtual(fitting, 'Chevreuse', tactics);
        expect(shred(fitting)).toBeCloseTo(-0.4, 9);

        // Outside the party (the fourth virtual character): taken as met.
        const extended = Team.fromMember(makeBuild('Hutao'));
        ['Xingqiu', 'Yelan', 'Zhongli'].forEach((key) => virtual(extended, key));
        const chevreuse = virtual(extended, 'Chevreuse', tactics);
        expect(extended.evaluate().fillers).not.toContain(chevreuse);
        expect(shred(extended)).toBeCloseTo(-0.4, 9);

        // It sees the party from outside: itself, and every party member as the others.
        const view = partyView(scopeOf(extended, chevreuse));
        expect(view.self.charId).toBe(charId('Chevreuse'));
        expect(view.others.map((member) => member.charId)).toEqual(['Hutao', 'Xingqiu', 'Yelan', 'Zhongli'].map(charId));
    });
});

describe("virtual characters are saved with their team", () => {
    function makeTeam() {
        const receiver = makeBuild('Hutao');
        const team = Team.fromMember(receiver);
        virtual(team, 'Bennet', {
            constellation: 6,
            skills: {attack: 3, elemental: 7, burst: 9},
            settings: {bennet_fantastic_voyage: true},
            stated: {atk_base: 812},
        });
        team.addLegacy(new FloatingSet('NoblesseOblige'));
        virtual(team, 'Kazuha', {
            constellation: 2,
            settings: {kaedehara_kazuha_poetics_of_fuubutsu: 'pyro', kaedehara_kazuha_yamaarashi_tailwind: true},
            stated: {mastery: 987},
        });
        virtual(team, 'Rosaria', {settings: {rosaria_shadow_samaritan: true}, stated: {crit_rate: 61.5}});
        return {team, receiver};
    }

    test("a round trip keeps them, in order, with what they state", () => {
        const {team, receiver} = makeTeam();
        const copy = Team.deserialize(team.serialize());

        expect(copy).not.toBeNull();
        expect(copy.legacy.getEntries().map((entry) => [entry.kind, entry.uid, entry.getSourceId()]))
            .toEqual(team.legacy.getEntries().map((entry) => [entry.kind, entry.uid, entry.getSourceId()]));
        const [bennett, , kazuha, rosaria] = copy.legacy.getEntries();
        expect(bennett.getConstellation()).toBe(6);
        expect(bennett.getSkills()).toEqual({attack: 3, elemental: 7, burst: 9});
        expect(bennett.stated).toEqual({atk_base: 812});
        expect(kazuha.getSettings().kaedehara_kazuha_poetics_of_fuubutsu).toBe('pyro');
        expect(rosaria.stated).toEqual({crit_rate: 61.5});

        expect({...finalStats(copy.getMember(0))}).toEqual({...finalStats(receiver)});
        expect(copy.serialize()).toEqual(team.serialize());
        expect({...finalStats(team.clone().getMember(0))}).toEqual({...finalStats(receiver)});
    });

    test("the same character twice is rejected", () => {
        const {team} = makeTeam();
        const first = team.legacy.getEntries()[0].serialize();
        const data = team.serialize();
        const legacy = team.legacy.serialize();
        const start = data.length - team.getRotation().serialize().length - legacy.length;

        const twice = data.slice(0, start).concat([legacy[0] + 1], legacy.slice(1), [first[0], 99, ...first.slice(2)],
            data.slice(start + legacy.length));
        expect(Team.deserialize(twice)).toBeNull();
    });
});
