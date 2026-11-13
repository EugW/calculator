import { DB } from '../src/js/db/DB';
import { finalStats, makeSolo } from './support/team';

global.DB = DB;

// md/buff_chains.md: Kokomi's C6 Hydro DMG (+40% after a heal in the
// Ceremonial Garment) is a flat bonus the game writes into the extra part
// (UNIQUE_Avatar_Kokomi_ElementalBurst_OverHeal_Buff:
// Actor_WaterAddHurtExtraDelta). It counts in her total Hydro DMG and not in
// the premod value.

function kokomi(constellation, settings) {
    const build = makeSolo('Kokomi');
    build.setCharLevels({level: 90, ascension: 6, constellation});
    build.setCharSettings(settings);
    return finalStats(build);
}

const ON = {kokomi_ceremonial_garment: true, sangonomiya_kokomi_sango_isshin: true};

test('C6: +40% Hydro DMG in the total, all of it extra', () => {
    const off = kokomi(6, {kokomi_ceremonial_garment: true});
    const on = kokomi(6, ON);
    expect(on.get('dmg_hydro') - off.get('dmg_hydro')).toBeCloseTo(0.4, 9);
    expect(off.get('dmg_hydro_extra') || 0).toBe(0);
    expect(on.get('dmg_hydro_extra')).toBeCloseTo(0.4, 9);
    // The premod Hydro DMG stays where it was.
    expect(on.get('dmg_hydro') - on.get('dmg_hydro_extra')).toBeCloseTo(off.get('dmg_hydro'), 9);
});

test('C6 needs the Ceremonial Garment and the constellation', () => {
    const noBurst = kokomi(6, {sangonomiya_kokomi_sango_isshin: true});
    expect(noBurst.get('dmg_hydro_extra') || 0).toBe(0);
    const c5 = kokomi(5, ON);
    expect(c5.get('dmg_hydro_extra') || 0).toBe(0);
});
