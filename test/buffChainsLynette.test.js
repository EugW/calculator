import { DB } from '../src/js/db/DB';
import { finalStats, makeSolo } from './support/team';

global.DB = DB;

// md/buff_chains.md: Lynette's C6 Anemo DMG (+20% after the skill) is a flat
// bonus the game writes into the extra part
// (Avatar_Linette_Constellation_6_DamageUp: Actor_WindAddHurtExtraDelta). It
// counts in her total Anemo DMG and not in the premod value.

function lynette(constellation, settings) {
    const build = makeSolo('Lynette');
    build.setCharLevels({level: 90, ascension: 6, constellation});
    build.setCharSettings(settings);
    return {build, stats: finalStats(build)};
}

test('C6: +20% Anemo DMG in the total, all of it extra', () => {
    const off = lynette(6, {}).stats;
    const on = lynette(6, {lynette_watchful_eye: true}).stats;
    expect(on.get('dmg_anemo') - off.get('dmg_anemo')).toBeCloseTo(0.2, 9);
    expect(off.get('dmg_anemo_extra') || 0).toBe(0);
    expect(on.get('dmg_anemo_extra')).toBeCloseTo(0.2, 9);
    // The premod Anemo DMG stays where it was.
    expect(on.get('dmg_anemo') - on.get('dmg_anemo_extra')).toBeCloseTo(off.get('dmg_anemo'), 9);
});

test('C6 keeps its Anemo infusion and needs the constellation', () => {
    const on = lynette(6, {lynette_watchful_eye: true}).build;
    expect(on.getBuildData().settings.attack_infusion_anemo).toBe(1);
    const c5 = lynette(5, {lynette_watchful_eye: true}).stats;
    expect(c5.get('dmg_anemo_extra') || 0).toBe(0);
});
