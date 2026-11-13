import { BuildData } from '../src/js/classes/Build/Data';
import { CHANNELS } from '../src/js/classes/PostEffect/Channels';
import { PostEffectStats } from '../src/js/classes/PostEffect/Stats';
import { StatTable } from '../src/js/classes/StatTable';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery } from './support/team';

global.DB = DB;

// md/buff_chains.md: premod (non-extra) and total values, and the order
// derived from what each effect reads and writes.

function effect(from, stat, value, params = {}) {
    return new PostEffectStats(Object.assign({from, percent: new StatTable(stat, [value])}, params));
}

function apply(stats, postEffects) {
    const data = new BuildData({}, stats);
    data.postEffects = postEffects;
    data.applyPostEffects();
    return data.stats;
}

describe('channels', () => {
    test('an extra write is invisible to premod reads and counted by total reads', () => {
        const share = effect('mastery*', 'mastery', 0.2);          // Sucrose A4: premod EM -> extra EM
        const key = effect('hp*', 'mastery', 0.01);                 // Key: extra EM
        const hit = effect('mastery*', 'test_bonus', 0.1, {reads: CHANNELS.TOTAL});
        const stats = apply({mastery: 100, hp_base: 1000}, [hit, share, key]);

        expect(stats.get('mastery')).toBeCloseTo(100 + 20 + 10, 9);
        expect(stats.get('test_bonus')).toBeCloseTo(13, 9);
    });

    test('a premod write is seen by premod reads, whatever the order they are listed in', () => {
        const share = effect('mastery*', 'mastery', 0.2);
        const columbina = effect('hp*', 'mastery', 0.05, {writes: CHANNELS.PREMOD});
        const stats = apply({mastery: 100, hp_base: 1000}, [share, columbina]);

        expect(stats.get('mastery')).toBeCloseTo(100 + 50 + 30, 9);
    });

    test('a premod read of a REAL_TOTAL stat leaves out extra percent and extra flat', () => {
        const evenstar = effect('mastery*', 'atk_percent', 0.1);   // 0.1% ATK per EM, extra
        const flatAtk = effect('mastery*', 'atk', 0.5);             // extra flat ATK
        const premodAtk = effect('atk*', 'hp', 0.1);
        const totalAtk = effect('atk*', 'def', 0.1, {reads: CHANNELS.TOTAL});
        const stats = apply({mastery: 100, atk_base: 1000}, [premodAtk, totalAtk, evenstar, flatAtk]);

        // ATK: 1000 × (1 + 0.1) + 50 = 1150
        expect(stats.get('hp')).toBeCloseTo(100, 9);
        expect(stats.get('def')).toBeCloseTo(115, 9);
    });

    test('effects that read each other share a stage and read the stats from before it', () => {
        const a = effect('mastery*', 'atk', 1, {reads: CHANNELS.TOTAL});
        const b = effect('atk*', 'mastery', 1, {reads: CHANNELS.TOTAL});
        expect(a.getPriority()).toBe(b.getPriority());

        const stats = apply({mastery: 100, atk_base: 10}, [a, b]);
        expect(stats.get('atk')).toBeCloseTo(100, 9);
        expect(stats.get('mastery')).toBeCloseTo(110, 9);
    });
});

describe('teams', () => {
    function member(char, type, weapon, em) {
        const build = makeBuild(char);
        build.setWeapon(DB.Weapons.get(type).get(weapon));
        build.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        if (em) build.modifyBuffsSettings({'custom_buffs.mastery': em});
        return build;
    }

    // The Key's EM, Sucrose's A4 share and Nahida's A1 do not feed each
    // other or Kazuha's A4 (KQM; GO gives the same numbers).
    test('Key of Khaj-Nisut, Sucrose A4, Nahida A1 and Kazuha A4 do not chain', () => {
        const kazuha = member('Kazuha', 'sword', 'KeyofKhajNisut', 700);
        const team = Team.fromMember(kazuha);
        const sucrose = member('Sucrose', 'catalyst', 'ThrillingTales', 600);
        const xiangling = member('Xiangling', 'polearm', 'Catch', 0);
        const nahida = member('Nahida', 'catalyst', 'ThrillingTales', 500);
        team.setMember(1, sucrose);
        team.setMember(2, xiangling);
        team.setMember(3, nahida);
        team.setOnFieldMember(xiangling);
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        kazuha.setCharSettings({kaedehara_kazuha_poetics_of_fuubutsu: ['pyro']});
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        nahida.setCharSettings({nahida_compassion_illuminated: true, nahida_illusory_heart: true});

        // Kazuha 815.2 premod EM; Key 89.45 own and 49.70 for everyone.
        expect(totalMastery(finalStats(kazuha))).toBeCloseTo(815.2 + 89.452 + 49.696 + 120, 2);
        expect(totalMastery(finalStats(sucrose))).toBeCloseTo(600 + 49.696, 2);
        // 96 + Key 49.70 + Sucrose 20% × 600 + Nahida 25% × 815.2
        expect(totalMastery(finalStats(xiangling))).toBeCloseTo(96 + 49.696 + 120 + 203.8, 2);
        const stats = finalStats(xiangling);
        expect(stats.get('dmg_pyro') - xiangling.getBuildData().stats.get('dmg_pyro')).toBeCloseTo(0.0004 * 815.2, 6);
    });
});
