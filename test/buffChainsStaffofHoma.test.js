import { CHANNELS } from '../src/js/classes/PostEffect/Channels';
import { PostEffectStats } from '../src/js/classes/PostEffect/Stats';
import { PostEffectStatsHP } from '../src/js/classes/PostEffect/Stats/HP';
import { StatTable } from '../src/js/classes/StatTable';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery, featureValues, withSource } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md worker: Staff of Homa.
//
// - ATK from Max HP (PostEffectStatsHP weaponPost, 0.8%/1%/1.2%/1.4%/1.6%
//   plus 1%/1.2%/1.4%/1.6%/1.8% below 50% HP): the game
//   (Weapon_Pole_Homa_MaxHpToAtk) sets UNIQUE_Pole_Homa_MaxHpToAtk_Buff as
//   [FIGHT_PROP_MAX_HP, MaxHptoAtk_Factor, MUL] (total; the low-HP branch
//   adds [FIGHT_PROP_MAX_HP, MaxHptoAtk_Extra_Factor, MUL]) and writes
//   Actor_AttackExtraDelta (extra, default). FIGHT_PROP_MAX_HP is the total
//   marker (md/buff_chains.md), as for Hu Tao's skill, Baizhu's A4,
//   Candace's A4 and Chevreuse's A4; the same number as premod while no
//   ability writes extra HP. Declared reads: TOTAL. GO reads
//   input.premod.hp here (supporting evidence only; the data says total).
//   KQM has no Staff of Homa buff-chain test. Game formula at R1:
//   HP x 0.8%, plus HP x 1% below 50% HP.
// - HP% passive (20-40%, EquipAffixExcelConfigData affix 113501x addProps
//   FIGHT_PROP_HP_PERCENT): a flat condition, always premod, needs nothing.
//   The ATK conversion reads total HP so it counts this HP% (Max HP in the
//   game includes the passive).
// - Below-50% HP gate (game: ByTargetHPRatio LesserOrEqual 0.5 switching the
//   Handler/Extra_Handler branches): an HP ratio toggle, not a stat read;
//   flat conditions are always premod and need nothing.
// - ATK bonus display (FeaturePostEffectValue weapon.atk_bonus): reads the
//   post-effect's own value, not a stat channel; needs nothing.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

// R1 rates (EquipAffixExcelConfigData affix 113501x paramList).
const BASE_RATE = 0.008;
const LOW_HP_RATE = 0.01;

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

// The weapon's ATK bonus, read off its display feature (the post-effect's
// own value).
function homaBuff(holder) {
    return featureValues(holder)['weapon.atk_bonus'][0];
}

function equipHoma(build) {
    build.setWeapon(DB.Weapons.get('polearm').get('StaffofHoma'));
    build.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    return build;
}

// Xiangling (pyro) + Eula (cryo) + Sucrose (anemo) + Noelle (geo): four
// different elements, so no Elemental Resonance applies.
function neutralTeam(charKey = 'Xiangling') {
    const holder = makeBuild(charKey);
    equipHoma(holder);
    const team = Team.fromMember(holder);
    if (charKey != 'Xiangling') team.setMember(1, makeBuild('Xiangling'));
    else team.setMember(1, makeBuild('Eula'));
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(holder);
    return {team, holder};
}

test('formula parity: ATK bonus is Max HP x rate, holder alone (no extra stats)', () => {
    const {holder} = neutralTeam();
    matchCarrierTotals(holder, {hp_total: 20000});
    holder.setWeaponSettings({weapon_staff_of_homa: 0});
    const hp = totalHp(finalStats(holder));
    expect(hp).toBeCloseTo(20000, 6);
    // Above 50% HP: base rate only.
    expect(homaBuff(holder)).toBeCloseTo(hp * BASE_RATE, 6);

    // Below 50% HP: base plus the extra rate.
    holder.setWeaponSettings({weapon_staff_of_homa: 1});
    expect(totalHp(finalStats(holder))).toBeCloseTo(hp, 6);
    expect(homaBuff(holder)).toBeCloseTo(hp * (BASE_RATE + LOW_HP_RATE), 6);
});

test('counts premod HP: Hydro resonance', () => {
    // Resonance team: hydro pair (Barbara + Xingqiu) -> +25% Max HP (a
    // stage-0 premod condition). A total read counts premod writes.
    const holderR = makeBuild('Xiangling');
    equipHoma(holderR);
    const teamR = Team.fromMember(holderR);
    teamR.setMember(1, makeBuild('Barbara'));
    teamR.setMember(2, makeBuild('Xingqiu'));
    teamR.setMember(3, makeBuild('Sucrose'));
    teamR.setOnFieldMember(holderR);

    // Same holder without resonance: pyro/hydro/cryo/anemo, no pair.
    const holderN = makeBuild('Xiangling');
    equipHoma(holderN);
    const teamN = Team.fromMember(holderN);
    teamN.setMember(1, makeBuild('Barbara'));
    teamN.setMember(2, makeBuild('Eula'));
    teamN.setMember(3, makeBuild('Sucrose'));
    teamN.setOnFieldMember(holderN);

    for (const holder of [holderR, holderN]) {
        holder.setWeaponSettings({weapon_staff_of_homa: 0});
    }
    const hpR = totalHp(finalStats(holderR));
    const hpN = totalHp(finalStats(holderN));
    // Sanity: resonance actually raised the holder's HP% by 25 points.
    expect(finalStats(holderR).get('hp_percent') - finalStats(holderN).get('hp_percent')).toBeCloseTo(0.25, 8);
    expect(hpR).toBeGreaterThan(hpN);
    expect(homaBuff(holderR)).toBeCloseTo(hpR * BASE_RATE, 6);
    expect(homaBuff(holderN)).toBeCloseTo(hpN * BASE_RATE, 6);
    // The whole resonance gain is counted.
    expect(homaBuff(holderR) - homaBuff(holderN)).toBeCloseTo((hpR - hpN) * BASE_RATE, 6);
});

describe('total HP read: synthetic extra vs premod HP writes', () => {
    // No shipped character, weapon or set writes extra HP (md/buff_chains.md),
    // so the only way to tell a total HP read from a premod one apart is a
    // synthetic HP% write scaling on premod ATK (nothing here writes ATK
    // before the stage the conversion reads, so the base is stable). The
    // premod control next to it pins the rig. Same setup as the Furina A4
    // test (test/buffChainsFurina.test.js).
    // Premod HP read control rate (Key-style default channels: premod
    // read, extra write), 0.2% of premod HP as EM.
    const CONTROL_RATE = 0.002;

    function holderWith(syntheticWrites) {
        const {holder} = neutralTeam();
        holder.setWeaponSettings({weapon_staff_of_homa: 0});
        withSource(holder, [], [
            new PostEffectStats({
                from: 'atk*',
                // 0.05% of premod ATK, times base HP; the added HP is read
                // back below from the build's own stats, so no number is
                // hardcoded.
                percent: new StatTable('hp_percent', [0.05]),
                writes: syntheticWrites,
            }),
            new PostEffectStatsHP({
                percent: new StatTable('mastery', [CONTROL_RATE]),
            }),
        ], {}, []);
        return holder;
    }

    function plainHolder() {
        const {holder} = neutralTeam();
        holder.setWeaponSettings({weapon_staff_of_homa: 0});
        return holder;
    }

    test('Homa counts an extra HP write; a premod HP read does not', () => {
        const plain = plainHolder();
        const plainStats = finalStats(plain);
        const plainHp = totalHp(plainStats);
        // Premod ATK (the synthetic's input): total less Homa's extra ATK.
        const plainPremodAtk = totalAtk(plainStats) - homaBuff(plain);
        const added = plainStats.get('hp_base') * (0.05 / 100) * plainPremodAtk;
        const plainEm = totalMastery(plainStats);
        // The plain build carries no control effect; its premod-HP value is
        // its total HP (no extra HP anywhere in it).
        const plainControlEm = CONTROL_RATE * plainHp;

        const holder = holderWith(CHANNELS.TOTAL);
        const stats = finalStats(holder);
        expect(totalHp(stats)).toBeCloseTo(plainHp + added, 6);
        // Total read: the Homa bonus grows with the extra HP. (At the
        // default premod read it would stay at plainHp x rate.)
        expect(homaBuff(holder)).toBeCloseTo((plainHp + added) * BASE_RATE, 6);
        // Premod read control: the extra HP is invisible.
        expect(totalMastery(stats) - plainEm).toBeCloseTo(plainControlEm, 6);
    });

    test('control: a premod HP write is counted by both', () => {
        const plain = plainHolder();
        const plainStats = finalStats(plain);
        const plainHp = totalHp(plainStats);
        const plainPremodAtk = totalAtk(plainStats) - homaBuff(plain);
        const added = plainStats.get('hp_base') * (0.05 / 100) * plainPremodAtk;
        const plainEm = totalMastery(plainStats);
        const plainControlEm = CONTROL_RATE * plainHp;

        const holder = holderWith(CHANNELS.PREMOD);
        const stats = finalStats(holder);
        const expectedHp = plainHp + added;
        expect(totalHp(stats)).toBeCloseTo(expectedHp, 6);
        expect(homaBuff(holder)).toBeCloseTo(expectedHp * BASE_RATE, 6);
        expect(totalMastery(stats) - plainEm).toBeCloseTo(plainControlEm + CONTROL_RATE * added, 6);
    });
});

test('Homa ATK is extra: Flins A4 (premod ATK) ignores it, Bennett burst does not move Homa', () => {
    // Flins (electro) holds Homa; Bennett (pyro) + Sucrose (anemo) + Eula
    // (cryo): no resonance. Flins on field so the burst reaches him.
    const flins = makeBuild('Flins');
    equipHoma(flins);
    const team = Team.fromMember(flins);
    const bennett = makeBuild('Bennet');
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Eula'));
    team.setOnFieldMember(flins);
    matchCarrierTotals(flins, {hp_total: 20000});
    bennett.setCharSettings({bennet_fantastic_voyage: false});

    flins.setWeaponSettings({weapon_staff_of_homa: 0});
    const hp = totalHp(finalStats(flins));
    const atkBefore = totalAtk(finalStats(flins));
    const emBefore = totalMastery(finalStats(flins));
    const buffBefore = homaBuff(flins);
    // Sanity: the A4 (8% of premod ATK, cap 160) is far from its cap, so a
    // counted Homa bonus would visibly move it.
    expect(emBefore - finalStats(flins).get('mastery_base')).toBeLessThan(150);

    flins.setWeaponSettings({weapon_staff_of_homa: 1});
    // Sanity: the toggle actually raised (extra) ATK by HP x 1%.
    expect(totalAtk(finalStats(flins)) - atkBefore).toBeCloseTo(hp * LOW_HP_RATE, 6);
    expect(homaBuff(flins) - buffBefore).toBeCloseTo(hp * LOW_HP_RATE, 6);
    // Premod ATK read: Homa's extra ATK is invisible to Flins's A4.
    expect(totalMastery(finalStats(flins))).toBeCloseTo(emBefore, 6);

    // Bennett's burst (extra ATK) does not move the HP-read Homa bonus.
    const buffNoBurst = homaBuff(flins);
    const atkNoBurst = totalAtk(finalStats(flins));
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    // Sanity: the burst actually raised Flins's (extra) ATK.
    expect(totalAtk(finalStats(flins)) - atkNoBurst).toBeGreaterThan(10);
    expect(homaBuff(flins)).toBeCloseTo(buffNoBurst, 6);
});
