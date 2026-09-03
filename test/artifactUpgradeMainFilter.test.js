import { DB } from '../src/js/db/DB';
import {
    UPGRADE_MAIN_FILTER_SLOTS,
    filterUpgradeCandidatesByUsefulMain,
    getUpgradeMainUsefulStats,
    isUpgradeMainUseful,
} from '../src/js/classes/ArtifactUpgradeMainFilter';

global.DB = DB;

const mock = (slot, mainStat) => ({
    getSlot: () => slot,
    getMainStat: () => mainStat,
});

test('only sands/goblet/circlet are filtered, flower/plume always kept', () => {
    expect(UPGRADE_MAIN_FILTER_SLOTS).toEqual(['sands', 'goblet', 'circlet']);
    const usedStats = ['atk_percent'];
    expect(isUpgradeMainUseful(mock('flower', 'hp'), usedStats)).toBe(true);
    expect(isUpgradeMainUseful(mock('plume', 'atk'), usedStats)).toBe(true);
    expect(isUpgradeMainUseful(mock('sands', 'atk_percent'), usedStats)).toBe(true);
    expect(isUpgradeMainUseful(mock('sands', 'def_percent'), usedStats)).toBe(false);
});

test('crit_value keeps both crit mains through the shared VOID mask', () => {
    const usedStats = ['crit_value'];
    expect(isUpgradeMainUseful(mock('circlet', 'crit_rate'), usedStats)).toBe(true);
    expect(isUpgradeMainUseful(mock('circlet', 'crit_dmg'), usedStats)).toBe(true);
    expect(isUpgradeMainUseful(mock('circlet', 'def_percent'), usedStats)).toBe(false);
    expect(isUpgradeMainUseful(mock('goblet', 'dmg_pyro'), ['dmg_pyro'])).toBe(true);
});

test('unknown usefulness never deselects', () => {
    expect(isUpgradeMainUseful(mock('sands', 'def_percent'), null)).toBe(true);
    expect(isUpgradeMainUseful(mock('sands', 'def_percent'), undefined)).toBe(true);
    expect(isUpgradeMainUseful(null, ['atk_percent'])).toBe(true);
});

test('filter keeps order and input intact, dropping only useless mains', () => {
    const candidates = [
        mock('flower', 'hp'),
        mock('sands', 'def_percent'),
        mock('sands', 'atk_percent'),
        mock('goblet', 'dmg_pyro'),
        mock('circlet', 'def_percent'),
    ];
    const before = candidates.slice();
    const filtered = filterUpgradeCandidatesByUsefulMain(candidates, ['atk_percent', 'dmg_pyro']);
    expect(filtered.map(a => a.getSlot() + ':' + a.getMainStat())).toEqual([
        'flower:hp',
        'sands:atk_percent',
        'goblet:dmg_pyro',
    ]);
    expect(candidates).toEqual(before);
});

test('usefulness probe fails closed without a build or feature', () => {
    expect(getUpgradeMainUsefulStats({})).toBeNull();
    expect(getUpgradeMainUsefulStats({build: null, feature: 'a'})).toBeNull();
    expect(getUpgradeMainUsefulStats({build: {clone: () => { throw new Error('x'); }}, feature: 'a'})).toBeNull();
});
