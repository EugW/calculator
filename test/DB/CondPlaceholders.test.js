import { Condition } from "../../src/js/classes/Condition";
import { Team } from "../../src/js/classes/Team";
import { DB } from "../../src/js/db/DB";
import { makeBuild } from "../support/team";

global.window = {};
global.localStorage = {};
global.DB = DB;
require('../../src/js/lang/eng.js');

// The generated string quotes a misspelled stat (lunarcrystalize); the
// condition has the real one. It predates the team refactor.
const KNOWN = ['Mona mona_prophecy_of_submersion dmg_reaction_lunarcrystalize'];

function langString(id) {
    const [group, key] = id.split('.');
    const block = window.lang_strings[group];
    return block ? block[key] : undefined;
}

function statNames(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.filter((item) => item && typeof item.getName === 'function').map((item) => item.getName());
    }
    return Object.keys(value);
}

test("character controls supply every value their description quotes", () => {
    const missing = [];
    for (const key of DB.Chars.getKeys()) {
        const char = DB.Chars.get(key);
        for (const cond of Condition.unwrap(char.getAllConditions())) {
            if (!cond.params.description || cond.params.isHidden) continue;
            const text = langString(cond.params.description);
            if (!text) continue;

            const supplied = new Set(['stats', 'baseStats', 'displayStats'].flatMap((field) => statNames(cond.params[field])));
            for (const match of text.matchAll(/%\{(\w+)[|}]/g)) {
                const row = key + ' ' + (cond.params.name || '(static)') + ' ' + match[1];
                if (!supplied.has(match[1]) && !KNOWN.includes(row)) missing.push(row);
            }
        }
    }
    expect(missing).toEqual([]);
});

test("display stats are shown, not applied", () => {
    const build = makeBuild('Xiangling');
    Team.fromMember(build);
    build.setCharSettings({xiangling_beware: true});
    const beware = DB.Chars.get('Xiangling').getAllConditions().find((cond) => cond.params.name === 'xiangling_beware');

    const data = build.getBuildData();
    expect(beware.getDisplayStats(data.settings).get('atk_percent')).toBe(10);
    // No member is chosen as picking the pepper up, so nobody gets the ATK.
    expect(data.stats.get('atk_percent')).toBe(0);
});
