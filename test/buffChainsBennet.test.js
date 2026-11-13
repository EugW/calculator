import { setControlsOff } from '../src/js/classes/ArtifactSetProfile';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeSetArtifacts } from './support/baseline';
import { finalStats, makeBuild, totalMastery, featureValues } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md worker: Bennett. Every effect keeps the default channels
// (no reads/writes params in src/js/db/Char/Bennet.js).
//
// - Burst ATK buff (selfBuffPost, PostEffectStats from 'atk_base', TEAM atk):
//   base-ATK read, extra-ATK write. Game data: Avatar_Bennett_ElementalBurst
//   onAbilityStart AddGlobalValue _ABILITY_Bennett_WarmField_BaseAttack with
//   min/max FIGHT_PROP_BASE_ATTACK (base read), then
//   Avatar_Bennett_ElementalBurst_Gadget UNIQUE_WarmField_AttackUp writes
//   Actor_AttackExtraDelta = AttackUpRatio x Bennett_WarmField_BaseAttack
//   (extra write = the default; the extra_scan lists this ability with
//   W-extra: Actor_AttackExtraDelta and no non-extra read). C1 adds 20% of
//   base ATK (Bennett_Constellation_1 paramList [0.2]). GO reads
//   input.base.atk into teamBuff.total.atk. KQM Bennett has no EM/ATK/HP/ER
//   buff-chain test. Game formula at burst 10 (makeBuild skills): bonus =
//   atk_base x 1.008 (CharTalentTables Bennett s3 p4[9] = 100.8), +0.20 x
//   atk_base at C1. A base read counts NO stat buff on Bennett (neither
//   premod ATK% nor extra ATK), so the must-not-count side is both; the write
//   side is tested both ways below (Odette's total-ATK A4 counts it, Flins'
//   premod-ATK A4 ignores it).
// - Burst heal (FeatureHeal heal_dot, scaling 'hp*'): the game heals with
//   HealHP amount HealConst + amountByCasterMaxHPRatio HealMaxHpRatio
//   (WarmField_Handler onThinkInterval, no FIGHT_PROP marker); scaling 'hp*'
//   reads the total HP by construction. GO uses healNodeTalent('hp', ...).
//   No ability writes extra HP, so total == premod today: formula parity +
//   premod-HP counting (Hydro resonance) + isolation from extra ATK/EM.
//   Game formula at burst 10: heal = hp_total x 0.108 + 1270.2417 (s3 p2[9] =
//   10.8, p3[9] = 1270.2417).
// - Talent hits incl. C4 (135%; Bennett_Constellation_4 paramList [1.35]):
//   plain ATK-scaled hits, total by construction. A1/A4 are CD-only (no
//   PermanentSkill modifiers in the ability file). C2 is a flat +30% ER
//   condition (Avatar_Bennett_Talent_Capacitor writes
//   Actor_ChargeEfficiencyDelta, no "Extra" = premod; Bennett_Constellation_2
//   paramList [0.7, 0.3]). C6 is a flat +15% Pyro DMG condition
//   (UNIQUE_Talent_Avatar_FireUp writes Actor_FireAddHurtDelta, plain =
//   premod; Bennett_Constellation_6 paramList [0.15]) + melee infusion.
//   Conditions write premod by construction: solo parity only.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

// Bennett (pyro) + Sara (electro) + Kaeya (cryo) + Aino (hydro): four
// different elements, so no resonance. Kaeya (sword) is the melee receiver.
function saraTeam(bennettConstellation = 0) {
    const bennett = makeBuild('Bennet');
    bennett.setCharLevels({level: 90, ascension: 6, constellation: bennettConstellation});
    const team = Team.fromMember(bennett);
    const sara = makeBuild('Sara');
    team.setMember(1, sara);
    const kaeya = makeBuild('Kaeya');
    team.setMember(2, kaeya);
    team.setMember(3, makeBuild('Aino'));
    team.setOnFieldMember(kaeya);
    return {team, bennett, sara, kaeya};
}

function bennettBaseAtk(bennett) {
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const base = finalStats(bennett).get('atk_base');
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    return base;
}

describe('Bennett burst ATK: base read, extra write', () => {
    test('formula parity C0: receiver gains atk_base x 1.008', () => {
        const {bennett, kaeya} = saraTeam(0);
        const base = bennettBaseAtk(bennett);
        // Bennett off: receiver baseline; on: +base x 1.008 on everyone.
        bennett.setCharSettings({bennet_fantastic_voyage: false});
        const off = totalAtk(finalStats(kaeya));
        const selfOff = totalAtk(finalStats(bennett));
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        expect(totalAtk(finalStats(kaeya)) - off).toBeCloseTo(base * 1.008, 6);
        // The buff applies to Bennett himself too (KQM: the Q buff applies to
        // Bennett's own Q damage).
        expect(totalAtk(finalStats(bennett)) - selfOff).toBeCloseTo(base * 1.008, 6);
    });

    test('C1 adds 20% of base ATK: receiver gains atk_base x 1.208', () => {
        const {bennett, kaeya} = saraTeam(1);
        const base = bennettBaseAtk(bennett);
        bennett.setCharSettings({bennet_fantastic_voyage: false});
        const off = totalAtk(finalStats(kaeya));
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        expect(totalAtk(finalStats(kaeya)) - off).toBeCloseTo(base * 1.208, 6);
    });

    test('base read: extra ATK on Bennett (Sara) does not move the bonus', () => {
        const {bennett, sara, kaeya} = saraTeam(0);
        sara.setCharSettings({sara_tengu_juurai: false});
        bennett.setCharSettings({bennet_fantastic_voyage: false});
        const offNoSara = totalAtk(finalStats(kaeya));
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        const bonusNoSara = totalAtk(finalStats(kaeya)) - offNoSara;
        // Sanity: Sara's extra ATK reaches Bennett (his total ATK rises)...
        const bennettOff = totalAtk(finalStats(bennett));
        sara.setCharSettings({sara_tengu_juurai: true});
        expect(totalAtk(finalStats(bennett)) - bennettOff).toBeGreaterThan(10);
        // ...but the delivered bonus is unchanged (base read).
        bennett.setCharSettings({bennet_fantastic_voyage: false});
        const offSara = totalAtk(finalStats(kaeya));
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        expect(totalAtk(finalStats(kaeya)) - offSara).toBeCloseTo(bonusNoSara, 6);
    });

    test('base read: premod ATK% on Bennett (Gladiator 2pc) does not move the bonus', () => {
        const plain = saraTeam(0);
        plain.bennett.setCharSettings({bennet_fantastic_voyage: false});
        const base = finalStats(plain.bennett).get('atk_base');
        plain.bennett.setCharSettings({bennet_fantastic_voyage: true});
        const expected = base * 1.008;
        plain.bennett.setCharSettings({bennet_fantastic_voyage: false});
        const offPlain = totalAtk(finalStats(plain.kaeya));
        plain.bennett.setCharSettings({bennet_fantastic_voyage: true});
        expect(totalAtk(finalStats(plain.kaeya)) - offPlain).toBeCloseTo(expected, 6);

        // Same team, but Bennett wears 2pc Gladiator (+18% ATK, a stage-1
        // premod set bonus): his total ATK rises, the bonus must not.
        const {bennett, kaeya} = saraTeam(0);
        bennett.replaceArtifacts(makeSetArtifacts('GladiatorFinale').slice(0, 2));
        bennett.setArtifactsSettings(setControlsOff('GladiatorFinale'));
        expect(finalStats(bennett).get('atk_percent')).toBeCloseTo(
            finalStats(plain.bennett).get('atk_percent') + 0.18, 8);
        bennett.setCharSettings({bennet_fantastic_voyage: false});
        const off = totalAtk(finalStats(kaeya));
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        expect(totalAtk(finalStats(kaeya)) - off).toBeCloseTo(expected, 6);
    });
});

describe("Bennett extra ATK from the writers' side", () => {
    // Odette (cryo) + Bennett (pyro) + Sara (electro) + Aino (hydro): no
    // resonance. Odette's A4 reads her own total ATK
    // (max(ATK - 1000, 0) x 0.00015, cap 0.30), so Bennett's extra ATK counts.
    function odetteTeam() {
        const odette = makeBuild('Odette');
        const team = Team.fromMember(odette);
        const bennett = makeBuild('Bennet');
        team.setMember(1, bennett);
        team.setMember(2, makeBuild('Sara'));
        team.setMember(3, makeBuild('Aino'));
        team.setOnFieldMember(odette);
        return {team, odette, bennett};
    }

    // Game formula with the exceed floor and the cap.
    function odetteExpected(atk) {
        return Math.min(Math.max(atk - 1000, 0) * 0.00015, 0.30);
    }

    test('total reader counts it: Odette A4 follows Bennett ATK', () => {
        const {odette, bennett} = odetteTeam();
        bennett.setCharSettings({bennet_fantastic_voyage: false});
        const atkOff = totalAtk(finalStats(odette));
        const multiOff = finalStats(odette).get('stellarglimmer_multi');
        expect(multiOff).toBeCloseTo(odetteExpected(atkOff), 8);
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        const atkOn = totalAtk(finalStats(odette));
        expect(atkOn - atkOff).toBeGreaterThan(10);
        // Still under the 0.30 cap here, so the whole gain is counted.
        expect(odetteExpected(atkOn)).toBeLessThan(0.30);
        expect(finalStats(odette).get('stellarglimmer_multi'))
            .toBeCloseTo(odetteExpected(atkOn), 8);
        expect(finalStats(odette).get('stellarglimmer_multi') - multiOff)
            .toBeCloseTo((odetteExpected(atkOn) - odetteExpected(atkOff)), 8);
    });

    // Flins (electro) + Bennett (pyro) + Kaeya (cryo) + Aino (hydro): no
    // resonance. Flins' A4 reads his own premod ATK (8%, cap 160), so
    // Bennett's extra ATK must be ignored (also covered from Flins' side in
    // test/buffChainsChevreuse.test.js).
    test('premod reader ignores it: Flins A4 EM does not move', () => {
        const flins = makeBuild('Flins');
        const team = Team.fromMember(flins);
        const bennett = makeBuild('Bennet');
        team.setMember(1, bennett);
        team.setMember(2, makeBuild('Kaeya'));
        team.setMember(3, makeBuild('Aino'));
        team.setOnFieldMember(flins);
        bennett.setCharSettings({bennet_fantastic_voyage: false});
        const emOff = totalMastery(finalStats(flins));
        const atkOff = totalAtk(finalStats(flins));
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        expect(totalAtk(finalStats(flins)) - atkOff).toBeGreaterThan(10);
        expect(totalMastery(finalStats(flins))).toBeCloseTo(emOff, 8);
    });
});

describe('Bennett burst heal reads total HP', () => {
    function healOf(bennett) {
        return featureValues(bennett)['burst.heal_dot'][0];
    }

    test('formula parity: 20k/30k HP at burst 10', () => {
        const {bennett} = saraTeam(0);
        for (const [hp, expected] of [
            [20000, 20000 * 0.108 + 1270.2417],
            [30000, 30000 * 0.108 + 1270.2417],
        ]) {
            matchCarrierTotals(bennett, {hp_total: hp});
            expect(totalHp(finalStats(bennett))).toBeCloseTo(hp, 6);
            expect(healOf(bennett)).toBeCloseTo(expected, 3);
        }
    });

    test('counts premod HP: Hydro resonance', () => {
        // Resonance team: Bennett + Barbara + Aino (two Hydro) -> +25% Max
        // HP for everyone (a stage-0 premod condition). A total read counts
        // premod writes.
        const bennett = makeBuild('Bennet');
        const team = Team.fromMember(bennett);
        team.setMember(1, makeBuild('Barbara'));
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Kaeya'));
        team.setOnFieldMember(bennett);

        const plain = makeBuild('Bennet');
        const team2 = Team.fromMember(plain);
        team2.setMember(1, makeBuild('Sara'));
        team2.setMember(2, makeBuild('Aino'));
        team2.setMember(3, makeBuild('Kaeya'));
        team2.setOnFieldMember(plain);

        const hpR = totalHp(finalStats(bennett));
        const hpN = totalHp(finalStats(plain));
        expect(finalStats(bennett).get('hp_percent') - finalStats(plain).get('hp_percent'))
            .toBeCloseTo(0.25, 8);
        expect(healOf(bennett)).toBeCloseTo(hpR * 0.108 + 1270.2417, 3);
        expect(healOf(plain)).toBeCloseTo(hpN * 0.108 + 1270.2417, 3);
        expect(healOf(bennett) - healOf(plain)).toBeCloseTo((hpR - hpN) * 0.108, 3);
    });

    test('ignores extra ATK (Sara) and extra EM (Key of Khaj-Nisut)', () => {
        const {bennett, sara, kaeya} = saraTeam(0);
        matchCarrierTotals(bennett, {hp_total: 25000});
        const before = healOf(bennett);
        expect(before).toBeCloseTo(25000 * 0.108 + 1270.2417, 3);

        // Sara's burst ATK is extra ATK on Bennett; the heal reads HP, so it
        // must not move.
        sara.setCharSettings({sara_tengu_juurai: false});
        const atkBefore = totalAtk(finalStats(bennett));
        sara.setCharSettings({sara_tengu_juurai: true});
        expect(totalAtk(finalStats(bennett)) - atkBefore).toBeGreaterThan(10);
        expect(healOf(bennett)).toBeCloseTo(before, 8);

        // The Key's party EM is extra EM; it must not move the HP-read heal.
        kaeya.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kaeya.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        kaeya.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        const emBefore = totalMastery(finalStats(bennett));
        expect(healOf(bennett)).toBeCloseTo(before, 8);
        kaeya.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(bennett)) - emBefore).toBeGreaterThan(1);
        expect(healOf(bennett)).toBeCloseTo(before, 8);
    });
});

describe('Bennett constellations are flat (solo parity)', () => {
    test('C2: +30% ER below 70% HP toggle', () => {
        const {bennett} = saraTeam(2);
        bennett.setCharSettings({bennet_impasse_conqueror: false});
        const before = finalStats(bennett).get('recharge');
        bennett.setCharSettings({bennet_impasse_conqueror: true});
        // Toggle on adds 30 points of ER (flat premod condition).
        expect(finalStats(bennett).get('recharge') - before).toBeCloseTo(0.30, 8);
        bennett.setCharSettings({bennet_impasse_conqueror: false});
        expect(finalStats(bennett).get('recharge')).toBeCloseTo(before, 10);
    });

    test('C6: +15% Pyro DMG on melee holders in the field', () => {
        const {bennett, kaeya} = saraTeam(6);
        bennett.setCharSettings({bennet_fantastic_voyage: false});
        const off = finalStats(kaeya).get('dmg_pyro');
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        // Kaeya (sword) is melee: +15% Pyro DMG.
        expect(finalStats(kaeya).get('dmg_pyro') - off).toBeCloseTo(0.15, 8);
    });
});
