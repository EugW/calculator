import { CHANNELS } from '../src/js/classes/PostEffect/Channels';
import { PostEffectStats } from '../src/js/classes/PostEffect/Stats';
import { PostEffectStatsHP } from '../src/js/classes/PostEffect/Stats/HP';
import { StatTable } from '../src/js/classes/StatTable';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery, featureValues, withSource } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md worker: Ring Of Ceiba (Ring of Yaxche, catalyst).
//
// - Normal Attack DMG from Max HP (PostEffectStatsHP weaponBuff, R1-R5
//   0.6%/0.7%/0.8%/0.9%/1% per 1000 Max HP for 10s after using an Elemental
//   Skill, cap 16%/20%/24%/28%/32%): the game
//   (Weapon_Catalyst_Isikhulu, UNIQUE_Catalyst_Isikhulu_NormalAttackUp,
//   ModifyDamageMixin) scales on FIGHT_PROP_MAX_HP, the total marker
//   (md/buff_chains.md), as for Homa, Jade Cutter, Hu Tao's skill, Baizhu's
//   A4, Candace's A4 and Chevreuse's A4; the damagePercentageRatio is
//   [FIGHT_PROP_MAX_HP, HP2DmgUpRatio, MUL, 1000, DIV] capped by
//   Catalyst_Isikhulu_MaxDmgUp (EquipAffixExcelConfigData id 114431, R1
//   0.006/0.16/10s). The write is a hit-level Normal Attack DMG bonus with
//   no Actor channel, so there is no premod/extra choice on the write
//   (dmg_normal has no extra lane). Declared reads: TOTAL, even though no
//   ability writes extra HP today, so the model matches the game when one
//   appears. GO (Catalyst/RingOfYaxche) reads input.total.hp here
//   (supporting evidence). KQM has no Ring Of Ceiba buff-chain test. Game
//   text (data/raw/weapon_texts.txt, ring_of_yaxche): "Every 1,000 Max HP
//   will increase the Normal Attack DMG dealt by the equipping character by
//   0.6% for 10s ... maximum of 16%".
// - Skill-trigger toggle (game: OnAvatarUseSkillMixin attaches the modifier
//   for Duration 10s) and the text_percent display numbers: flat conditions
//   are always premod and need nothing.
// - normal_dmg_bonus (FeaturePostEffectValue) displays the post-effect's
//   own value, reads no stat itself and needs nothing.
//
// Game formula at R1: min(HP x 0.6%/1000, 16%) = min(HP x 0.000006, 0.16).
// Only the builds' live inputs (holder Max HP) are read from the engine;
// every expected number is computed from this formula.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

// Game rates: per-HP fraction and cap fraction at each refinement.
const RATES = {1: 0.006 / 1000, 5: 0.01 / 1000};
const CAPS = {1: 0.16, 5: 0.32};

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function expectedBuff(hp, refine = 1) {
    return Math.min(hp * RATES[refine], CAPS[refine]);
}

// The weapon's Normal Attack DMG bonus on its holder (the post-effect's
// computed value, as a fraction like the dmg_normal stat). The display
// feature below shows the same value x100 (format percent).
function ringBuff(holder) {
    return finalStats(holder).get('dmg_normal');
}

function ringDisplay(holder) {
    return featureValues(holder)['weapon.normal_dmg_bonus'][0];
}

function equipRing(build, refine = 1) {
    build.setWeapon(DB.Weapons.get('catalyst').get('RingOfCeiba'));
    build.setWeaponLevels({level: 90, ascension: 6, refine});
    return build;
}

// Barbara (hydro catalyst, no stat conversions of her own) holds the ring;
// Eula (cryo) + Fischl (electro) + Sucrose (anemo): four different elements,
// so no Elemental Resonance applies.
function neutralTeam() {
    const holder = makeBuild('Barbara');
    equipRing(holder, 1);
    const team = Team.fromMember(holder);
    team.setMember(1, makeBuild('Eula'));
    team.setMember(2, makeBuild('Fischl'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(holder);
    holder.setWeaponSettings({weapon_ring_of_ceiba: true});
    return {team, holder};
}

test('formula parity: min(HP x 0.6%/1000, 16%), holder alone (no extra stats)', () => {
    const {holder} = neutralTeam();
    // Sanity on the game formula.
    expect(expectedBuff(20000)).toBeCloseTo(0.12, 9);
    expect(expectedBuff(30000)).toBeCloseTo(CAPS[1], 9);

    for (const hp of [15000, 20000]) {
        matchCarrierTotals(holder, {hp_total: hp});
        const gotHp = totalHp(finalStats(holder));
        expect(gotHp).toBeCloseTo(hp, 6);
        expect(expectedBuff(gotHp)).toBeLessThan(CAPS[1]);
        expect(ringBuff(holder)).toBeCloseTo(expectedBuff(gotHp), 6);
        // The bonus lands in the holder's total Normal DMG.
        expect(finalStats(holder).get('dmg_normal')).toBeCloseTo(expectedBuff(gotHp), 6);
    }

    // High HP binds the cap.
    matchCarrierTotals(holder, {hp_total: 30000});
    const hpCapped = totalHp(finalStats(holder));
    expect(hpCapped * RATES[1]).toBeGreaterThan(CAPS[1]);
    expect(ringBuff(holder)).toBeCloseTo(CAPS[1], 6);
    expect(finalStats(holder).get('dmg_normal')).toBeCloseTo(CAPS[1], 6);

    // Toggle off: no bonus in the stat (the display feature keeps its last
    // compiled value when the gate is off, so only the stat is asserted).
    holder.setWeaponSettings({weapon_ring_of_ceiba: false});
    expect(ringBuff(holder)).toBeCloseTo(0, 9);
    expect(finalStats(holder).get('dmg_normal')).toBeCloseTo(0, 9);
    holder.setWeaponSettings({weapon_ring_of_ceiba: true});

    // R5 rate and cap from the game formula.
    holder.setWeaponLevels({level: 90, ascension: 6, refine: 5});
    matchCarrierTotals(holder, {hp_total: 30000});
    const hp5 = totalHp(finalStats(holder));
    expect(hp5 * RATES[5]).toBeCloseTo(0.3, 9);
    expect(ringBuff(holder)).toBeCloseTo(expectedBuff(hp5, 5), 6);
    expect(ringBuff(holder)).toBeCloseTo(0.3, 6);
    // The display feature shows the same bonus in percent points.
    expect(ringDisplay(holder)).toBeCloseTo(expectedBuff(hp5, 5) * 100, 6);
});

test('counts premod HP: Hydro resonance', () => {
    // Resonance team: hydro pair (Barbara holder + Xingqiu) -> +25% Max HP
    // (a stage-0 premod condition). A total read counts premod writes.
    const holderR = makeBuild('Barbara');
    equipRing(holderR, 1);
    const teamR = Team.fromMember(holderR);
    teamR.setMember(1, makeBuild('Xingqiu'));
    teamR.setMember(2, makeBuild('Fischl'));
    teamR.setMember(3, makeBuild('Sucrose'));
    teamR.setOnFieldMember(holderR);
    holderR.setWeaponSettings({weapon_ring_of_ceiba: true});

    // Same holder without resonance: hydro/cryo/electro/anemo, no pair.
    const holderN = makeBuild('Barbara');
    equipRing(holderN, 1);
    const teamN = Team.fromMember(holderN);
    teamN.setMember(1, makeBuild('Eula'));
    teamN.setMember(2, makeBuild('Fischl'));
    teamN.setMember(3, makeBuild('Sucrose'));
    teamN.setOnFieldMember(holderN);
    holderN.setWeaponSettings({weapon_ring_of_ceiba: true});

    const hpR = totalHp(finalStats(holderR));
    const hpN = totalHp(finalStats(holderN));
    // Sanity: resonance actually raised the holder's HP% by 25 points.
    expect(finalStats(holderR).get('hp_percent') - finalStats(holderN).get('hp_percent')).toBeCloseTo(0.25, 8);
    expect(hpR).toBeGreaterThan(hpN);
    // Both under the cap here, so the whole resonance gain is counted.
    expect(expectedBuff(hpR)).toBeLessThan(CAPS[1]);
    expect(expectedBuff(hpN)).toBeLessThan(CAPS[1]);
    expect(ringBuff(holderR)).toBeCloseTo(expectedBuff(hpR), 6);
    expect(ringBuff(holderN)).toBeCloseTo(expectedBuff(hpN), 6);
    expect(ringBuff(holderR) - ringBuff(holderN)).toBeCloseTo((hpR - hpN) * RATES[1], 6);
});

describe('total HP read: synthetic extra vs premod HP writes', () => {
    // No shipped character, weapon or set writes extra HP (md/buff_chains.md),
    // so the only way to tell a total HP read from a premod one apart is a
    // synthetic HP% write scaling on premod ATK (nothing here writes ATK
    // before the stage the conversion reads, so the base is stable). The
    // premod control next to it pins the rig. Same setup as the Homa test
    // (test/buffChainsStaffofHoma.test.js).
    // Premod HP read control rate (Key-style default channels: premod
    // read, extra write), 0.2% of premod HP as EM.
    const CONTROL_RATE = 0.002;

    function holderWith(syntheticWrites) {
        const {holder} = neutralTeam();
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
        return holder;
    }

    function totalAtk(stats) {
        return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
    }

    test('Ring counts an extra HP write; a premod HP read does not', () => {
        const plain = plainHolder();
        const plainStats = finalStats(plain);
        const plainHp = totalHp(plainStats);
        // Premod ATK (the synthetic's input): total less extra ATK (nothing
        // writes extra ATK here, but the lane is subtracted all the same).
        const plainPremodAtk = totalAtk(plainStats) - (plainStats.get('atk_extra') || 0);
        const added = plainStats.get('hp_base') * (0.05 / 100) * plainPremodAtk;
        const plainEm = totalMastery(plainStats);
        // The plain build carries no control effect; its premod-HP value is
        // its total HP (no extra HP anywhere in it).
        const plainControlEm = CONTROL_RATE * plainHp;
        expect(plainHp * RATES[1]).toBeLessThan(CAPS[1]);

        const holder = holderWith(CHANNELS.TOTAL);
        const stats = finalStats(holder);
        expect(expectedBuff(totalHp(stats))).toBeLessThan(CAPS[1]);
        expect(totalHp(stats)).toBeCloseTo(plainHp + added, 6);
        // Total read: the Ring bonus grows with the extra HP. (At the
        // default premod read it would stay at plainHp x rate.)
        expect(ringBuff(holder)).toBeCloseTo((plainHp + added) * RATES[1], 6);
        // Premod read control: the extra HP is invisible.
        expect(totalMastery(stats) - plainEm).toBeCloseTo(plainControlEm, 6);
    });

    test('control: a premod HP write is counted by both', () => {
        const plain = plainHolder();
        const plainStats = finalStats(plain);
        const plainHp = totalHp(plainStats);
        const plainPremodAtk = totalAtk(plainStats) - (plainStats.get('atk_extra') || 0);
        const added = plainStats.get('hp_base') * (0.05 / 100) * plainPremodAtk;
        const plainEm = totalMastery(plainStats);
        const plainControlEm = CONTROL_RATE * plainHp;

        const holder = holderWith(CHANNELS.PREMOD);
        const stats = finalStats(holder);
        const expectedHp = plainHp + added;
        expect(expectedBuff(expectedHp)).toBeLessThan(CAPS[1]);
        expect(totalHp(stats)).toBeCloseTo(expectedHp, 6);
        expect(ringBuff(holder)).toBeCloseTo(expectedHp * RATES[1], 6);
        expect(totalMastery(stats) - plainEm).toBeCloseTo(plainControlEm + CONTROL_RATE * added, 6);
    });
});

test('Ring ignores extra ATK (Bennett burst)', () => {
    // Barbara (hydro holder) + Bennett (pyro) + Fischl (electro) + Sucrose
    // (anemo): no pair, no resonance. Bennett's burst is extra ATK on the
    // holder; the bonus reads HP, so it must not move.
    const holder = makeBuild('Barbara');
    equipRing(holder, 1);
    const team = Team.fromMember(holder);
    const bennett = makeBuild('Bennet');
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Fischl'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(holder);
    holder.setWeaponSettings({weapon_ring_of_ceiba: true});
    matchCarrierTotals(holder, {hp_total: 20000});
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const before = ringBuff(holder);
    expect(before).toBeCloseTo(expectedBuff(totalHp(finalStats(holder))), 6);
    const atkBefore = totalHp(finalStats(holder)) && (finalStats(holder).get('atk_base') * (1 + finalStats(holder).get('atk_percent')) + finalStats(holder).get('atk'));

    bennett.setCharSettings({bennet_fantastic_voyage: true});
    // Sanity: the burst actually raised the holder's (extra) ATK.
    const atkAfter = finalStats(holder).get('atk_base') * (1 + finalStats(holder).get('atk_percent')) + finalStats(holder).get('atk');
    expect(atkAfter - atkBefore).toBeGreaterThan(10);
    expect(ringBuff(holder)).toBeCloseTo(before, 6);
});

test('Ring ignores extra EM (Key of Khaj-Nisut party EM)', () => {
    // Barbara holder + Eula + Kazuha (Key) + Sucrose: still no resonance.
    // The Key's party EM is extra EM on the holder; the bonus reads HP, not
    // EM.
    const holder = makeBuild('Barbara');
    equipRing(holder, 1);
    const team = Team.fromMember(holder);
    team.setMember(1, makeBuild('Eula'));
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(2, kazuha);
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(holder);
    holder.setWeaponSettings({weapon_ring_of_ceiba: true});
    matchCarrierTotals(holder, {hp_total: 20000});
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    const before = ringBuff(holder);
    const emBefore = totalMastery(finalStats(holder));

    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    // Sanity: the Key actually raised the holder's (extra) EM.
    expect(totalMastery(finalStats(holder)) - emBefore).toBeGreaterThan(1);
    expect(ringBuff(holder)).toBeCloseTo(before, 6);
});
