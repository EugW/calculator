import { DB } from '../src/js/db/DB';
import { artifactCraftAffixOptions, changeArtifactCraftAffix, getArtifactCraftAffixes } from '../src/js/classes/ArtifactCraftAffixes';
import { makeArtifactActionRecipes } from '../src/js/classes/ArtifactActionPredictor';

global.DB = DB;
const recipes = (slot, selection) => makeArtifactActionRecipes({kind:'craft', set:'GladiatorFinale', craftAffixes:{[slot]:selection}}, slot);

test('Auto preserves all recipes, with main-only, partial and complete manual selections narrowing the actual search', () => {
    expect(recipes('flower', {}).length).toBe(36);
    expect(recipes('flower', {substats:['crit_rate','']}).length).toBe(8);
    expect(recipes('flower', {substats:['','crit_rate']}).length).toBe(8);
    const selected = {mainStat:'dmg_pyro', substats:['crit_rate','crit_dmg']};
    expect(recipes('goblet', selected)).toMatchObject([{mainStat:'dmg_pyro', pair:['crit_rate','crit_dmg']}]);
    expect(recipes('goblet', selected)).toHaveLength(1);
    expect(recipes('goblet', {mainStat:'dmg_pyro'})).toHaveLength(45);
    const automaticMain = recipes('sands', {substats:['atk_percent','recharge']});
    expect(automaticMain.map(recipe => recipe.mainStat)).toEqual(DB.Artifacts.Slots.get('sands').mainStats.filter(stat => !['atk_percent','recharge'].includes(stat)));
    expect(automaticMain.every(recipe => recipe.pair.includes('atk_percent') && recipe.pair.includes('recharge'))).toBe(true);
});

test('minor stat choices exclude fixed slot mains, manual mains and the other selected minor stat', () => {
    expect(artifactCraftAffixOptions('flower', {}, 0)).not.toContain('hp');
    expect(artifactCraftAffixOptions('plume', {}, 1)).not.toContain('atk');
    const selection = {mainStat:'atk_percent', substats:['crit_rate','']};
    expect(artifactCraftAffixOptions('sands', selection, 1)).not.toContain('atk_percent');
    expect(artifactCraftAffixOptions('sands', selection, 1)).not.toContain('crit_rate');
    expect(artifactCraftAffixOptions('sands', selection, 0)).toContain('crit_rate');
});

test('changing main clears conflicts to Auto without mutating the existing selection', () => {
    const selected = {mainStat:'',substats:['atk_percent','crit_rate']};
    expect(changeArtifactCraftAffix('sands', selected, 'mainStat', 'atk_percent'))
        .toEqual({mainStat:['atk_percent'],substats:[[],['crit_rate']]});
    expect(selected).toEqual({mainStat:'',substats:['atk_percent','crit_rate']});
    expect(changeArtifactCraftAffix('sands', selected, 0, '')).toEqual({mainStat:[],substats:[[],['crit_rate']]});
});

test('overlapping crit main/substat ranges produce the valid opposite-crit circlets', () => {
    const selection = {mainStat:['crit_rate','crit_dmg'],substats:[['crit_rate','crit_dmg'],[]]};
    const result = recipes('circlet', selection);
    expect(result).toHaveLength(16);
    for (const recipe of result) {
        expect(recipe.pair).not.toContain(recipe.mainStat);
        expect(recipe.pair).toContain(recipe.mainStat === 'crit_rate' ? 'crit_dmg' : 'crit_rate');
    }
    expect(result.filter(recipe=>recipe.mainStat==='crit_rate')).toHaveLength(8);
    expect(result.filter(recipe=>recipe.mainStat==='crit_dmg')).toHaveLength(8);
});

test('overlapping minor ranges match either assignment once, not every permutation', () => {
    const selection = {substats:[['crit_rate','crit_dmg'],['crit_rate','crit_dmg']]};
    expect(recipes('flower', selection)).toHaveLength(1);
    const mixed = recipes('flower', {substats:[['crit_rate','crit_dmg'],['crit_rate','atk_percent']]});
    expect(mixed).toHaveLength(3);
    expect(new Set(mixed.map(recipe=>recipe.pair.slice().sort().join('/'))).size).toBe(3);
    expect(recipes('goblet', {mainStat:['dmg_pyro','dmg_hydro'],substats:[['crit_rate'],['crit_dmg']]})).toHaveLength(2);
});

test('multi-choice normalization preserves scalar compatibility and fixes single-main slots', () => {
    expect(getArtifactCraftAffixes('flower')).toEqual({mainStat:['hp'],substats:[[],[]]});
    expect(getArtifactCraftAffixes('plume')).toEqual({mainStat:['atk'],substats:[[],[]]});
    expect(recipes('flower', {substats:[['crit_rate','crit_rate'],[]]})).toEqual(recipes('flower', {substats:['crit_rate','']}));
    expect(getArtifactCraftAffixes('circlet', {mainStat:'crit_rate',substats:['crit_dmg','']}))
        .toEqual({mainStat:['crit_rate'],substats:[['crit_dmg'],[]]});
});

test('ranges can be expanded across dependent selectors without losing checked choices', () => {
    let selection = changeArtifactCraftAffix('circlet', {}, 'mainStat', ['crit_rate']);
    selection = changeArtifactCraftAffix('circlet', selection, 0, ['crit_dmg']);
    selection = changeArtifactCraftAffix('circlet', selection, 'mainStat', ['crit_rate','crit_dmg']);
    selection = changeArtifactCraftAffix('circlet', selection, 0, ['crit_rate','crit_dmg']);
    expect(recipes('circlet', selection)).toHaveLength(16);
    const partial = {substats:[['crit_rate','crit_dmg'],['crit_rate']]};
    expect(artifactCraftAffixOptions('flower', partial, 0)).toContain('crit_rate');
    expect(changeArtifactCraftAffix('flower', partial, 1, ['crit_rate','crit_dmg']).substats)
        .toEqual([['crit_rate','crit_dmg'],['crit_rate','crit_dmg']]);
});

test('fixing a main prunes incompatible choices and resets an impossible second line', () => {
    const selection = {substats:[['crit_rate','crit_dmg'],['crit_rate','crit_dmg']]};
    expect(changeArtifactCraftAffix('circlet', selection, 'mainStat', ['crit_rate']))
        .toEqual({mainStat:['crit_rate'],substats:[['crit_dmg'],[]]});
});

test('Auto expands only stats inside the used-stat closure, and explicit choices always win', () => {
    const craft = (slot, selection, usedStats) =>
        makeArtifactActionRecipes({kind:'craft', set:'GladiatorFinale', craftAffixes:{[slot]:selection}}, slot, usedStats);
    // Linnea goblet: mainstat Auto = DEF%/EM, both minor Autos = DEF%/EM/CRIT/CD.
    // Each Auto selector gets the whole useful list; pairs are generated from
    // those lists, never distributed between selectors.
    const useful = ['def_percent', 'mastery', 'crit_value'];
    const substats = ['def_percent', 'mastery', 'crit_rate', 'crit_dmg'];
    const goblet = craft('goblet', {}, useful);
    expect(goblet).toHaveLength(6);
    expect([...new Set(goblet.map(recipe => recipe.mainStat))]).toEqual(['def_percent', 'mastery']);
    expect(goblet.every(recipe => !recipe.pair.includes(recipe.mainStat)
        && recipe.pair.every(stat => substats.includes(stat)))).toBe(true);
    expect(craft('flower', {}, useful)).toHaveLength(6);
    // A partially manual selection keeps its explicit stat and only fills Auto with useful ones.
    const partial = craft('flower', {substats:['def','']}, useful);
    expect(partial).toHaveLength(4);
    expect(partial.every(recipe => recipe.pair.includes('def'))).toBe(true);
    // Without two useful stats the pair cannot exist; fall back to the full scan
    // so the slot never silently disappears.
    expect(craft('flower', {}, [])).toHaveLength(recipes('flower', {}).length);
    expect(craft('flower', {}, ['recharge'])).toHaveLength(recipes('flower', {}).length);
    expect(craft('flower', {}, undefined)).toHaveLength(36);
});

test.each([
    ['flower',{mainStat:'crit_rate'}],
    ['flower',{substats:['hp','']}],
    ['goblet',{mainStat:'atk_percent',substats:['atk_percent','']}],
    ['goblet',{substats:['crit_rate','crit_rate']}],
    ['goblet',{substats:['dmg_pyro','']}],
    ['goblet',{substats:['hp','atk','def']}],
    ['goblet',{substats:'crit_rate'}],
    ['circlet',{mainStat:['crit_rate','crit_dmg'],substats:[['crit_rate','crit_dmg'],['crit_rate','crit_dmg']]}],
    ['circlet',{mainStat:['crit_rate','dmg_pyro']}],
    ['flower',{substats:[['not_a_stat'],[]]}],
])('invalid crafting parameters are rejected, not silently scanned as Auto: %s %j', (slot, selection) => {
    expect(() => getArtifactCraftAffixes(slot, selection)).toThrow('action_invalid_affixes');
    expect(() => recipes(slot, selection)).toThrow('action_invalid_affixes');
});
