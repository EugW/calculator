import { premodReadSpies } from "./buffChains";
import { DB } from "../../src/js/db/DB";
import { isEnemyStat } from "../../src/js/classes/Team/EnemyStats";
import { enemyChange } from "./team";
import { ensureTestGlobals } from "./baseline";
import { checkConversion, recorded } from "./teamConversion";

ensureTestGlobals();

/**
 * Stats a conversion deliberately changes for a scenario, with their new
 * values: where the old party model disagreed with the game text.
 */
function correctionsFor(item, scenario, virtual) {
    const result = {};
    for (const correction of rowCorrections(item, virtual)) {
        if (correction.scenarios.includes(scenario)) {
            Object.assign(result, correction.stats);
        }
    }
    return result;
}

/**
 * A virtual character's stated stat is final, so a correction that comes
 * from the character's own effects adding to its typed stat does not apply
 * to it: a row lists the ones that do in `virtualCorrections`.
 */
function rowCorrections(item, virtual) {
    return (virtual && item.virtualCorrections) || item.corrections || [];
}

function partyScenarios(charKey) {
    return Object.keys(recorded('party.json').scenarios).filter((id) => id.endsWith('__with_' + charKey));
}

/**
 * Recorded features of a scenario with its corrections applied:
 * `featuresFrom` takes every feature from another recorded scenario,
 * `featureFactors` multiplies named recorded features by a factor derived
 * from the game formula (for example a RES multiplier change).
 */
function expectedFeaturesFor(item, scenario, virtual) {
    const corrections = rowCorrections(item, virtual).filter((entry) => entry.scenarios.includes(scenario));
    const from = corrections.find((entry) => entry.featuresFrom);
    const factors = corrections.filter((entry) => entry.featureFactors);
    if (!from && !factors.length) return undefined;

    let features = recorded('party.json').scenarios[from ? from.featuresFrom : scenario].features;
    if (!features) throw new Error('Missing feature reference ' + from.featuresFrom);

    features = Object.assign({}, features);
    for (const entry of factors) {
        for (const [name, factor] of Object.entries(entry.featureFactors)) {
            if (!features[name]) continue;
            features[name] = Object.fromEntries(Object.entries(features[name]).map(([field, value]) => {
                return [field, value === null ? null : value * factor];
            }));
        }
    }
    return features;
}

export function characterConversionTests(rows) {
    describe.each(rows)("$char", (item) => {
        const scenarios = partyScenarios(item.char);

        test("has recorded scenarios and no party data left", () => {
            expect(scenarios.length).toBeGreaterThan(0);
            const character = DB.Chars.get(item.char);
            expect(character.partyData).toBeUndefined();
            expect(character.getLegacyPartyConditions().every((condition) => condition.isRetired())).toBe(true);
        });

        // The character as a teammate with a build, then as a virtual
        // character of the legacy source (Team/Legacy): the party row as it
        // was, with its typed stats stated. Last ('link') the virtual
        // character a released link gives: the recorded row loaded by the
        // importer (Legacy/Team.loadLegacyTeam), with nothing set by hand.
        describe.each([false, true, 'link'])("virtual: %s", (virtual) => {
            test.each(scenarios)("%s", (scenario) => {
                const corrected = correctionsFor(item, scenario, virtual);
                // A gate the old model did not have, open as in the recording.
                const spies = (item.openConditions || []).map((cond) => jest.spyOn(cond, 'isActive').mockReturnValue(true));
                // An effect whose read the recording predates (md/buff_chains.md).
                spies.push(...premodReadSpies(item.recordedPremodReads ? item.recordedPremodReads() : []));
                try {
                    checkRow(item, scenario, corrected, virtual);
                } finally {
                    spies.forEach((spy) => spy.mockRestore());
                }
            });
        });
    });
}

function checkRow(item, scenario, corrected, virtual) {
    const result = checkConversion({
        file: 'party.json',
        scenario: scenario,
        carrier: item.char,
        constellation: item.constellation,
        virtual: virtual,
        equip: () => {},
        switchOn: (carrier, receiver) => {
            const settings = typeof item.on === 'function' ? item.on(carrier, receiver, virtual) : item.on;
            if (virtual) {
                carrier.setSettings(settings);
            } else {
                carrier.setCharSettings(settings);
            }
        },
        carrierTotals: item.carrierTotals,
        stated: item.stated,
        excludePostEffects: item.excludePostEffects,
        ignoreStats: (item.ignoreStats || []).concat(Object.keys(corrected)),
        expectedFeatures: expectedFeaturesFor(item, scenario, virtual),
    });
    expect(result.mismatches).toEqual([]);

    const stats = result.receiver.getBuildData();
    stats.applyPostEffects();
    for (const [stat, value] of Object.entries(corrected)) {
        // RES and DEF changes are the enemy's (Team/EnemyStats).
        const actual = isEnemyStat(stat) ? enemyChange(result.receiver, stat, stats.stats) : stats.stats.get(stat);
        expect(actual).toBeCloseTo(value, 10);
    }
}
