import { CHANNELS } from '../src/js/classes/PostEffect/Channels';
import { stageCycles } from '../src/js/classes/PostEffect/Stages';
import { DB } from '../src/js/db/DB';

global.DB = DB;

// Content declares what its post-effects read and write (md/buff_chains.md);
// no synthetic effects here, so the stage graph is the database's own.

describe('the database', () => {
    function allPostEffects() {
        const result = [];
        for (const char of DB.Chars.getList(true)) result.push(...char.getPostEffects());
        for (const type of ['sword', 'bow', 'claymore', 'catalyst', 'polearm']) {
            for (const weapon of DB.Weapons.get(type).getList(true)) result.push(...weapon.getPostEffects());
        }
        for (const set of DB.Artifacts.Sets.getList(true)) result.push(...set.getPostEffects());
        return result;
    }

    test('content declares channels, never a stage', () => {
        const effects = allPostEffects();
        expect(effects.length).toBeGreaterThan(100);
        for (const post of effects) {
            expect(post.params.global).toBeUndefined();
            if (post.constructor.name != 'PostEffectSetBonus') {
                expect(post.params.priority).toBeUndefined();
            }
            expect([undefined, CHANNELS.PREMOD, CHANNELS.TOTAL]).toContain(post.params.reads);
            expect([undefined, CHANNELS.PREMOD, CHANNELS.TOTAL]).toContain(post.params.writes);
        }
    });

    test('no effects depend on each other in a cycle', () => {
        expect(stageCycles().map((cycle) => cycle.map((post) => JSON.stringify(post.getWriteStats())))).toEqual([]);
    });
});
