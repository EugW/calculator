import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { makeSetArtifacts } from "./support/baseline";
import { finalStats, makeBuild, pinStats, stackKeys, stackSource, totalMastery } from "./support/team";

global.DB = DB;

// Stack decisions checked against the game data (md/legacy_merge.md, "Stack
// audit"): whether the modifier a weapon or set applies to the party is
// unique (isUnique, removed before it is applied again) or not.

/** The final stats a holder is to have, given once it is in its team (teamOf). */
const stated = new WeakMap();

function holder(charKey, type, weaponKey, settings, stats) {
    const member = makeBuild(charKey);
    member.setWeapon(DB.Weapons.get(type).get(weaponKey));
    member.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    member.setWeaponSettings(settings);
    stated.set(member, stats || {});
    return member;
}

function teamOf(receiver, ...members) {
    const team = Team.fromMember(receiver);
    members.forEach((member, i) => team.setMember(i + 1, member));
    pinStats(members.flatMap((member) => {
        return Object.entries(stated.get(member) || {}).map(([stat, value]) => [member, stat, value]);
    }));
    return team;
}

describe("Key of Khaj-Nisut", () => {
    // UNIQUE_Sword_Deshret_MasteryUp_Team: unique, removed from
    // AllPlayerAvatars before each re-application. R1: 0.2% of the wielder's
    // Max HP.
    const key = (charKey, hp) => holder(charKey, 'sword', 'KeyofKhajNisut', {weapon_key_of_khaj_nisut: 3}, {hp});
    const mastery = (member) => totalMastery(finalStats(member));

    test("the team's Elemental Mastery does not stack between two wielders", () => {
        const alone = makeBuild('Hutao');
        teamOf(alone, makeBuild('Kaeya'), makeBuild('Bennet'));
        const base = mastery(alone);

        const receiver = makeBuild('Hutao');
        const team = teamOf(receiver, key('Kaeya', 40000), key('Bennet', 30000));

        expect(stackKeys(team)).toEqual(['key_of_khaj_nisut']);
        expect(stackSource(team, 'key_of_khaj_nisut')).toBe(team.getMember(1));
        expect(mastery(receiver) - base).toBeCloseTo(80, 6);
    });

    test("the other wielder can be chosen, and its own stacks stay its own", () => {
        const receiver = makeBuild('Hutao');
        const first = key('Kaeya', 40000);
        const second = key('Bennet', 30000);
        const team = teamOf(receiver, first, second);
        const before = mastery(receiver);

        team.setStackSource('key_of_khaj_nisut', second);
        expect(mastery(receiver) - before).toBeCloseTo(60 - 80, 6);
        const copy = Team.deserialize(team.serialize());
        expect(stackSource(copy, 'key_of_khaj_nisut')).toBe(copy.getMember(2));

        // Each wielder keeps its own Grand Hymn stacks (0.12% of Max HP
        // each): the first has them on top of the second's team bonus.
        const withStacks = mastery(first);
        first.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        expect(withStacks - mastery(first)).toBeCloseTo(3 * 0.0012 * 40000, 6);
    });
});

describe("effects that stack in the game have no key", () => {
    test("two Xiphos' Moonlight wielders both give Energy Recharge", () => {
        // Sword_Pleroma_Buff_Other is not unique. R1: 0.036% ER per EM, 30% of it to the party.
        const xiphos = (charKey, mastery) => holder(charKey, 'sword', 'XiphosMoonlight', {whisper_of_the_jinn: true}, {mastery});
        const recharge = (member) => finalStats(member).get('recharge');

        const one = makeBuild('Hutao');
        teamOf(one, xiphos('Kaeya', 1000), makeBuild('Bennet'));
        const two = makeBuild('Hutao');
        const team = teamOf(two, xiphos('Kaeya', 1000), xiphos('Bennet', 500));

        expect(stackKeys(team)).toEqual([]);
        const single = recharge(one);
        expect(recharge(two)).toBeGreaterThan(single);
        const none = makeBuild('Hutao');
        teamOf(none, makeBuild('Kaeya'), makeBuild('Bennet'));
        expect(recharge(two) - recharge(none)).toBeCloseTo((single - recharge(none)) * 1.5, 9);
    });
});

describe("Archaic Petra", () => {
    // Relic_ElementDmgUpAfterCrystalShield removes every element's buff from
    // AllPlayerAvatars before attaching one: one element for the team at a
    // time, whoever holds the set.
    const petra = (charKey, element) => {
        const member = makeBuild(charKey);
        member.replaceArtifacts(makeSetArtifacts('ArchaicPetra').slice(0, 4));
        member.setArtifactsSettings({'set_bonus.archaic_petra_4': element});
        return member;
    };

    test("two wearers give one bonus, of the chosen wearer's element", () => {
        const receiver = makeBuild('Hutao');
        const team = teamOf(receiver, petra('Zhongli', 'pyro'), petra('Noelle', 'pyro'));
        const none = makeBuild('Hutao');
        teamOf(none, makeBuild('Zhongli'), makeBuild('Noelle'));

        expect(stackKeys(team)).toEqual(['archaic_petra_4']);
        expect(finalStats(receiver).get('dmg_pyro') - finalStats(none).get('dmg_pyro')).toBeCloseTo(0.35, 9);

        const mixed = makeBuild('Hutao');
        const mixedTeam = teamOf(mixed, petra('Zhongli', 'hydro'), petra('Noelle', 'pyro'));
        expect(finalStats(mixed).get('dmg_pyro') - finalStats(none).get('dmg_pyro')).toBeCloseTo(0, 9);
        mixedTeam.setStackSource('archaic_petra_4', mixedTeam.getMember(2));
        expect(finalStats(mixed).get('dmg_pyro') - finalStats(none).get('dmg_pyro')).toBeCloseTo(0.35, 9);
    });
});
