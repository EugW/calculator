import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { ensureTestGlobals, getArtifactSetKeys, getCharKeys } from "./support/baseline";
import { allOnMember, orderDependent } from "./support/settle";

ensureTestGlobals();

/**
 * Every character, weapon and artifact set of the database on its own: its
 * settings settle (TeamEvaluation.isSettled), and one pass over its
 * conditions in order already gives the settled state, except where a
 * condition reads what a later one derives. Those are listed, with the stats
 * that differ: there the numbers differ from the released calculator's,
 * which took one pass.
 *
 * A new entry means new content depends on the order of its declarations.
 * Check the settled value against the game before listing it.
 */
const ORDER_DEPENDENT = {
    characters: {
        // Painted Dome's Dendro Core bonus scales with the burst's level and
        // is declared before C3 ("Increases the Level of Painted Dome by 3"):
        // it is the bonus of level 13 (58.41%), where one pass read level 10
        // (49.48%).
        'Kaveh C6, controls on': ['dmg_reaction_rupture'],
    },
    weapons: {},
    sets: {},
};

/**
 * @param {Array.<Array>} cases [label, function(): CalcSet] each
 * @returns {{found: Object.<string, Array.<string>>, unsettled: Array.<string>}}
 */
function check(cases) {
    const found = {};
    const unsettled = [];
    for (const [label, make] of cases) {
        const member = make();
        Team.fromMember(member);
        if (!member.team.evaluate().isSettled()) unsettled.push(label);
        const names = orderDependent(member);
        if (names.length) found[label] = names;
    }
    return {found, unsettled};
}

test("characters on their own", () => {
    const cases = [];
    for (const charKey of getCharKeys()) {
        for (const constellation of [0, 6]) {
            cases.push([`${charKey} C${constellation}`, () => allOnMember(charKey, {constellation, controls: false})]);
            cases.push([`${charKey} C${constellation}, controls on`, () => allOnMember(charKey, {constellation})]);
        }
    }
    expect(cases.length).toBeGreaterThan(400);

    const {found, unsettled} = check(cases);
    expect(unsettled).toEqual([]);
    expect(found).toEqual(ORDER_DEPENDENT.characters);
}, 120000);

test("weapons on their own", () => {
    const cases = [];
    const wielders = {};
    for (const charKey of getCharKeys()) {
        wielders[DB.Chars.get(charKey).weapon] ||= charKey;
    }
    for (const [type, charKey] of Object.entries(wielders)) {
        for (const weapon of DB.Weapons.get(type).getList(true)) {
            cases.push([weapon.name, () => allOnMember(charKey, {weapon})]);
        }
    }
    expect(cases.length).toBeGreaterThan(200);

    const {found, unsettled} = check(cases);
    expect(unsettled).toEqual([]);
    expect(found).toEqual(ORDER_DEPENDENT.weapons);
}, 120000);

test("artifact sets on their own", () => {
    const cases = getArtifactSetKeys().map((set) => [set, () => allOnMember('Hutao', {set})]);
    expect(cases.length).toBeGreaterThan(50);

    const {found, unsettled} = check(cases);
    expect(unsettled).toEqual([]);
    expect(found).toEqual(ORDER_DEPENDENT.sets);
}, 120000);
