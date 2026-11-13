import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { makeBaseBuild } from "./support/baseline";
import { equipSet } from "./support/teamConversion";
import { stackKeys } from "./support/team";

global.DB = DB;

// Celestial Gift 4-piece: "If the equipping character has completed Witch's
// Homework, after they use an Elemental Skill, they also gain "Light's
// Guidance" for 20s: All nearby party members gain a 20% Elemental DMG Bonus
// corresponding to the equipping character's Elemental Type. ... When your
// party has the Hexerei: Secret Rite effect, Light's Guidance is upgraded to
// "Mortal Hymn": All nearby party members gain a 40% Elemental DMG Bonus
// corresponding to both the equipping character and the current active party
// member's Elemental Type instead." Same-name set bonuses do not stack, and
// the same element is not counted twice.

function witch(charKey, homework) {
    const build = makeBaseBuild(charKey, 0);
    const name = build.char.get().name;
    build.setCharSettings({[name + '_witch_homework']: homework});
    return build;
}

function wearer(charKey) {
    const build = witch(charKey, true);
    equipSet('CelestialGift', 4)(build);
    build.setArtifactsSettings({'set.celestial_gift_4': true});
    return build;
}

// A wearer with the set equipped but its 4-piece effect off.
function idleWearer(charKey) {
    const build = wearer(charKey);
    build.setArtifactsSettings({'set.celestial_gift_4': false});
    return build;
}

function gain(member, base, stat) {
    return member.getBuildData().stats.get(stat) - Team.solo(base).getBuildData().stats.get(stat);
}

test("Light's Guidance gives every member the wearer's element", () => {
    const klee = wearer('Klee');
    const keqing = makeBaseBuild('Keqing', 0);
    const team = Team.fromMember(keqing);
    team.setMember(1, klee);

    expect(gain(keqing, makeBaseBuild('Keqing', 0), 'dmg_pyro')).toBeCloseTo(0.2, 10);
    expect(gain(keqing, makeBaseBuild('Keqing', 0), 'dmg_electro')).toBeCloseTo(0, 10);
    expect(gain(klee, idleWearer('Klee'), 'dmg_pyro')).toBeCloseTo(0.2, 10);
});

test("Mortal Hymn gives the wearer's and the active member's element, once when they match", () => {
    const klee = wearer('Klee');
    const mona = witch('Mona', true);
    const keqing = makeBaseBuild('Keqing', 0);
    const team = Team.fromMember(keqing);
    team.setMember(1, klee);
    team.setMember(2, mona);

    // Keqing (Electro): Klee's Pyro and her own Electro
    expect(gain(keqing, makeBaseBuild('Keqing', 0), 'dmg_pyro')).toBeCloseTo(0.4, 10);
    expect(gain(keqing, makeBaseBuild('Keqing', 0), 'dmg_electro')).toBeCloseTo(0.4, 10);

    // Klee (Pyro): the same element counts once
    expect(gain(klee, idleWearer('Klee'), 'dmg_pyro')).toBeCloseTo(0.4, 10);

    // Mona (Hydro): Pyro and Hydro
    const monaBase = witch('Mona', true);
    expect(gain(mona, monaBase, 'dmg_pyro')).toBeCloseTo(0.4, 10);
    expect(gain(mona, monaBase, 'dmg_hydro')).toBeCloseTo(0.4, 10);
});

test("a second wearer does not stack", () => {
    const klee = wearer('Klee');
    const razor = wearer('Razor');
    const keqing = makeBaseBuild('Keqing', 0);
    const team = Team.fromMember(keqing);
    team.setMember(1, klee);

    team.setMember(2, razor);

    expect(stackKeys(team)).toEqual(['celestial_gift_4']);

    // Klee's Mortal Hymn (Secret Rite from Klee and Razor): Pyro and Electro
    expect(gain(keqing, makeBaseBuild('Keqing', 0), 'dmg_pyro')).toBeCloseTo(0.4, 10);
    expect(gain(keqing, makeBaseBuild('Keqing', 0), 'dmg_electro')).toBeCloseTo(0.4, 10);

    // Razor's instead: Electro only (his element and Keqing's are the same)
    team.setStackSource('celestial_gift_4', razor);
    expect(gain(keqing, makeBaseBuild('Keqing', 0), 'dmg_pyro')).toBeCloseTo(0, 10);
    expect(gain(keqing, makeBaseBuild('Keqing', 0), 'dmg_electro')).toBeCloseTo(0.4, 10);
});

test("without Witch's Homework the set gives nothing", () => {
    const klee = wearer('Klee');
    klee.setCharSettings({klee_witch_homework: false});
    const keqing = makeBaseBuild('Keqing', 0);
    const team = Team.fromMember(keqing);
    team.setMember(1, klee);

    expect(gain(keqing, makeBaseBuild('Keqing', 0), 'dmg_pyro')).toBeCloseTo(0, 10);
});
