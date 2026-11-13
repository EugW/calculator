import { ensureTestGlobals, getCharKeys } from "./baseline";
import { allOnMember, checkPairs } from "./settle";

/** The suites the pairs of characters are split over: teamSettlePairs1 to 4. */
export const PARTS = 4;

/**
 * Every pair of characters of the database as a team of two, constellation
 * 6 and their own controls on: the team settles, and no member kept
 * something from an early round (support/settle.checkPairs). About 8,000
 * teams, split over the teamSettlePairs suites so they run side by side.
 *
 * @param {number} part which of the PARTS, from 0
 */
export function characterPairsSuite(part) {
    ensureTestGlobals();

    test(`pairs of characters settle, part ${part + 1} of ${PARTS}`, () => {
        const members = getCharKeys().map((charKey) => allOnMember(charKey));
        const pairs = [];
        let index = 0;
        for (let i = 0; i < members.length; ++i) {
            for (let j = i + 1; j < members.length; ++j) {
                if (index++ % PARTS != part) continue;
                pairs.push([`${members[i].char.get().name} + ${members[j].char.get().name}`, members[i], members[j]]);
            }
        }
        expect(pairs.length).toBeGreaterThan(7000 / PARTS);

        const result = checkPairs(pairs);
        expect(result.teams).toBe(pairs.length);
        expect(result.unsettled).toEqual([]);
        expect(result.kept).toEqual({});
    }, 300000);
}
