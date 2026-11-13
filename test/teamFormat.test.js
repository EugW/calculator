import { Condition } from "../src/js/classes/Condition";
import { Rotation } from "../src/js/classes/Rotation";
import { Serializer } from "../src/js/classes/Serializer";
import { Team, TEAM_FORMAT } from "../src/js/classes/Team";
import { getStackKey } from "../src/js/classes/Team/Stacking";
import { DB } from "../src/js/db/DB";
import { STACK_KEYS } from "../src/js/db/StackKeys";
import { enemyOf, finalStats, makeBuild, stackSource } from "./support/team";

global.DB = DB;

function makeTeam() {
    const elegy = makeBuild('Venti');
    elegy.setWeapon(DB.Weapons.get('bow').get('ElegyfortheEnd'));
    elegy.setWeaponLevels({level: 90, ascension: 6, refine: 5});
    elegy.setWeaponSettings({weapon_elegy_for_the_end: true});

    const pines = makeBuild('Eula');
    pines.setWeapon(DB.Weapons.get('claymore').get('SongofBrokenPines'));
    pines.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    pines.setWeaponSettings({weapon_song_of_broken_pines: true});

    const team = Team.fromMember(makeBuild('Hutao'));
    team.setMember(1, elegy);
    team.setMember(3, pines);
    team.setStackSource('millennial_movement_atk', pines);
    team.enemy.setLevels({level: 100});

    return team;
}

describe("team format", () => {
    test("a team survives a round trip through a link", () => {
        const team = makeTeam();
        const packed = Serializer.pack(team);
        const input = Serializer.unpack(packed);

        expect(input[0]).toBe(TEAM_FORMAT);

        const copy = Team.deserialize(input);
        expect(copy).not.toBeNull();
        expect(copy.getSlots().map((m) => m ? m.char.getId() : 0))
            .toEqual(team.getSlots().map((m) => m ? m.char.getId() : 0));
        expect(copy.stackChoices).toEqual({millennial_movement_atk: team.getMember(3).char.getId()});
        expect(stackSource(copy, 'millennial_movement_atk')).toBe(copy.getMember(3));
        expect(enemyOf(copy.getMember(0)).enemy_level).toBe(100);

        for (const slot of [0, 1, 3]) {
            expect({...finalStats(copy.getMember(slot))}).toEqual({...finalStats(team.getMember(slot))});
        }
    });

    test("members are evaluated against the decoded enemy", () => {
        const copy = Team.deserialize(makeTeam().serialize());
        copy.enemy.setLevels({level: 42});
        expect(enemyOf(copy.getMember(0)).enemy_level).toBe(42);
        expect(enemyOf(copy.getMember(3)).enemy_level).toBe(42);
    });

    test("invalid data is rejected", () => {
        const data = makeTeam().serialize();
        expect(Team.deserialize([1].concat(data.slice(1)))).toBeNull();

        const team = Team.fromMember(makeBuild('Hutao'));
        const enemy = team.enemy.serialize(team.enemy.getSettings());
        const body = team.getMember(0).serializeMember({rotation: false});
        const slot = [1, ...body];
        const rotation = new Rotation().serialize();

        // Four slots, no stack choices, condition overrides or legacy entries, the rotation.
        expect(Team.deserialize([TEAM_FORMAT, ...enemy, 0, ...slot, 0, 0, 0, 0, 0, 0, ...rotation])).not.toBeNull();
        expect(Team.deserialize([TEAM_FORMAT, ...enemy, 0, ...slot, ...slot, 0, 0, 0, 0, 0, ...rotation])).toBeNull();
        // The team's rotation is part of the format.
        expect(Team.deserialize([TEAM_FORMAT, ...enemy, 0, ...slot, 0, 0, 0, 0, 0, 0])).toBeNull();
        // A choice names a stack key that exists.
        expect(Team.deserialize([TEAM_FORMAT, ...enemy, 0, ...slot, 0, 0, 0, 1, 9999, 0, 0, 0, 0, ...rotation])).toBeNull();
        // The legacy source is part of the format.
        expect(Team.deserialize([TEAM_FORMAT, ...enemy, 0, ...slot, 0, 0, 0, 0, 0, ...rotation])).toBeNull();
        // The formats before the release (4 to 8) are not read: 8 had no legacy source.
        expect(Team.deserialize([8, ...enemy, 0, ...slot, 0, 0, 0, 0, 0, ...rotation])).toBeNull();
        expect(Team.deserialize([8, ...enemy, 0, ...slot, 0, 0, 0, 0, 0, 0, ...rotation])).toBeNull();
    });
});

describe("filling a slot from a build", () => {
    test("an old build brings only the character", () => {
        const old = makeBuild('Hutao');
        Team.fromMember(old).setMember(1, makeBuild('Kazuha'));
        old.setBuffsSettings({
            kazuha_mastery: 800,
            'party.kaedehara_kazuha_poetics_of_fuubutsu': 'pyro',
            'custom_buffs.atk': 100,
        });
        old.team.enemy.setLevels({level: 70});

        const team = Team.fromMember(makeBuild('Nahida'));
        team.enemy.setLevels({level: 95});
        const member = team.importMember(1, old);

        expect(member).not.toBe(old);
        expect(member.team).toBe(team);
        expect(team.getMembers().map((m) => m.char.getId())).toEqual([DB.Chars.get('Nahida').getId(), old.char.getId()]);

        const settings = member.buffs.settings;
        expect(settings.kazuha_mastery).toBeUndefined();
        expect(settings['party.kaedehara_kazuha_poetics_of_fuubutsu']).toBeUndefined();
        expect(settings['custom_buffs.atk']).toBe(100);
        expect(enemyOf(member).enemy_level).toBe(95);

        // the source build is untouched
        expect(old.team.getMember(1).char.getId()).toBe(DB.Chars.get('Kazuha').getId());
    });
});

describe("stack keys", () => {
    function collect(items, keys) {
        for (const item of items || []) {
            const key = getStackKey(item);
            if (key) keys.add(key);
        }
    }

    test("every stack key used by content has a serialize ID", () => {
        const keys = new Set();
        const sources = [];

        for (const char of DB.Chars.getList(true)) {
            sources.push(char, ...(char.constellation ? [char.constellation] : []));
        }
        for (const type of DB.Weapons.getKeys()) {
            sources.push(...DB.Weapons.get(type).getList(true));
        }
        sources.push(...DB.Artifacts.Sets.getList(true));
        sources.push(...DB.Buffs.getList(true));

        for (const source of sources) {
            let conditions = source.getConditions ? source.getConditions(6) : [];
            collect(Condition.unwrap(conditions || []), keys);
            collect(source.getPostEffects ? source.getPostEffects() : [], keys);
            collect(source.getMultipliers ? source.getMultipliers(5) : [], keys);
        }

        expect(keys.size).toBeGreaterThan(0);
        for (const key of keys) {
            expect(STACK_KEYS[key]).toBeDefined();
        }
    });

    test("stack key IDs are unique", () => {
        const ids = Object.values(STACK_KEYS);
        expect(new Set(ids).size).toBe(ids.length);
    });
});
