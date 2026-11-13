import { DB } from "../src/js/db/DB";
import { ensureTestGlobals, getArtifactSetKeys, getCharKeys, RECEIVERS } from "./support/baseline";
import { allOnMember, checkPairs } from "./support/settle";

ensureTestGlobals();

/**
 * Every weapon and every artifact set of the database on a carrier, next to
 * each of the recorded scenarios' receivers, everyone's controls on: the
 * team settles, and no member kept something from an early round
 * (support/settle.checkPairs). The pairs of characters are in the
 * teamSettlePairs suites.
 */

const receivers = () => RECEIVERS.map((charKey) => allOnMember(charKey));

/** @returns {Object.<string, string>} a character per weapon type that is no receiver */
function wieldersByType() {
    const result = {};
    for (const charKey of getCharKeys()) {
        if (!RECEIVERS.includes(charKey)) result[DB.Chars.get(charKey).weapon] ||= charKey;
    }
    return result;
}

test("weapons next to receivers settle", () => {
    const pairs = [];
    const members = receivers();
    for (const [type, charKey] of Object.entries(wieldersByType())) {
        for (const weapon of DB.Weapons.get(type).getList(true)) {
            const carrier = allOnMember(charKey, {weapon});
            for (const receiver of members) {
                pairs.push([`${weapon.name} on ${charKey} + ${receiver.char.get().name}`, carrier, receiver]);
            }
        }
    }
    expect(pairs.length).toBeGreaterThan(1000);

    const result = checkPairs(pairs);
    expect(result.teams).toBe(pairs.length);
    expect(result.unsettled).toEqual([]);
    expect(result.kept).toEqual({});
}, 300000);

test("artifact sets next to receivers settle", () => {
    const pairs = [];
    const members = receivers();
    const charKey = getCharKeys().find((key) => !RECEIVERS.includes(key));
    for (const set of getArtifactSetKeys()) {
        const carrier = allOnMember(charKey, {set});
        for (const receiver of members) {
            pairs.push([`${set} on ${charKey} + ${receiver.char.get().name}`, carrier, receiver]);
        }
    }
    expect(pairs.length).toBeGreaterThan(300);

    const result = checkPairs(pairs);
    expect(result.teams).toBe(pairs.length);
    expect(result.unsettled).toEqual([]);
    expect(result.kept).toEqual({});
}, 300000);
