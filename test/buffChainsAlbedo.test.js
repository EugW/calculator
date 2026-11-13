import { Condition } from '../src/js/classes/Condition';
import { CHANNELS } from '../src/js/classes/PostEffect/Channels';
import { PostEffectStats } from '../src/js/classes/PostEffect/Stats';
import { StatTable } from '../src/js/classes/StatTable';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery, featureValues, withSource } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Albedo):
//
// - Solar Isotoma team DMG (4 per 1000 DEF, cap 12%) and Silver Isotoma team
//   DMG (10 per 1000, cap 30%) read the TOTAL DEF: game data
//   (ConfigAbility_Avatar_Albedo.json, ability 15
//   Avatar_Albedo_HexenzirkelSkill) computes Defence_InCalc_{OG,NG} from
//   FIGHT_PROP_CUR_DEFENSE in
//   UNIQUE_Avatar_Albedo_HexenzirkelSkill_{OG,NG}_BuffHandler_OnSelf, applied
//   by a ModifyDamageMixin on Normal/Charged/Falling/Skill/Burst. GO reads
//   input.total.def for both. KQM has no Albedo stat-interaction test.
// - Every DEF-scaled hit (skill/burst blossoms, A1 Hexerei piece, C6 piece,
//   C2 blossoms) and the C2 burst bonus read FIGHT_PROP_CUR_DEFENSE (total)
//   too; our scaling 'def*' already reads the total, so they need nothing.
// - A4/C2 flat 125 EM write Actor_ElemMasteryDelta (premod) and C1 Hexerei
//   writes Actor_DefenceRatio (premod): conditions write premod, confirmed.
//   KQM (Sucrose evidence): flat EM such as Albedo's A4 counts for Sucrose's
//   premod-read A4.
// - No ability in the game writes extra DEF, so total and premod DEF agree
//   with real teammates; the total-vs-premod side is staged with a synthetic
//   extra-DEF write below.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

function totalDef(stats) {
    return stats.get('def_base') * (1 + stats.get('def_percent')) + stats.get('def');
}

// Points of DEF are worth 4/100 of a percent (solar) and 1/10 of a percent
// (silver): StatTable values are divided by 100 for dmg_* stats.
const SOLAR_PER_DEF = 0.004 / 100;
const SILVER_PER_DEF = 0.01 / 100;

// Albedo + Fischl (both Witch's Homework: Hexerei resonance) + Kazuha +
// Nahida: four elements, no resonance. Fischl is on field.
function setup(albedoDef = 2000) {
    const albedo = makeBuild('Albedo');
    const fischl = makeBuild('Fischl');
    const kazuha = makeBuild('Kazuha');
    const nahida = makeBuild('Nahida');
    const team = Team.fromMember(albedo);
    team.setMember(1, fischl);
    team.setMember(2, kazuha);
    team.setMember(3, nahida);
    team.setOnFieldMember(fischl);
    albedo.setCharSettings({albedo_witch_homework: true});
    fischl.setCharSettings({fischl_witch_homework: true});
    // Matched with the buffs off, so this is the premod DEF.
    matchCarrierTotals(albedo, {def_total: albedoDef});
    return {team, albedo, fischl, kazuha, nahida};
}

function solarOn(albedo) {
    albedo.setCharSettings({
        albedo_witch_homework: true,
        albedo_solar_isotoma_buff: true,
    });
}

function silverOn(albedo) {
    albedo.setCharSettings({
        albedo_witch_homework: true,
        albedo_silver_isotoma_buff: true,
    });
}

// Gain on the receiver from one of Albedo's buffs (buff on minus buff off).
function gain(receiver, carrier, apply) {
    apply();
    const on = finalStats(receiver);
    carrier.setCharSettings({albedo_witch_homework: true});
    const off = finalStats(receiver);
    return (stat) => on.get(stat) - off.get(stat);
}

// A synthetic extra-DEF write on Albedo (no game ability writes extra DEF):
// a default-stage post-effect writing DEF from a test-only source stat.
function withExtraDef(albedo, amount) {
    withSource(albedo,
        [new Condition({stats: {test_def_source: amount}})],
        [new PostEffectStats({from: 'test_def_source', percent: new StatTable('def', [1])})]);
}

// A synthetic premod-DEF write (like Columbina's C2 DEF) for comparison.
function withPremodDef(albedo, amount) {
    withSource(albedo,
        [new Condition({stats: {test_def_source: amount}})],
        [new PostEffectStats({
            from: 'test_def_source',
            percent: new StatTable('def', [1]),
            writes: CHANNELS.PREMOD,
        })]);
}

describe('Solar Isotoma buff reads total DEF', () => {
    test('solo numbers: 4 per 1000 DEF, capped at 12%', () => {
        const {albedo, fischl} = setup();
        expect(totalDef(finalStats(albedo))).toBeCloseTo(2000, 6);
        const delta = gain(fischl, albedo, () => solarOn(albedo));
        // 0.004 * 2000 = 8%, under the 12% cap, on all five.
        for (const stat of ['dmg_normal', 'dmg_charged', 'dmg_plunge', 'dmg_skill', 'dmg_burst']) {
            expect(delta(stat)).toBeCloseTo(0.08, 9);
        }
    });

    test('caps at 12% when DEF pushes past it', () => {
        const {albedo, fischl} = setup(4000);
        expect(totalDef(finalStats(albedo))).toBeCloseTo(4000, 6);
        const delta = gain(fischl, albedo, () => solarOn(albedo));
        // 0.004 * 4000 = 16%, capped to 12%.
        expect(delta('dmg_skill')).toBeCloseTo(0.12, 9);
    });

    test('counts Albedo C1 premod DEF% (Hexerei)', () => {
        const {albedo, fischl} = setup();
        albedo.setCharLevels({level: 90, ascension: 6, constellation: 1});
        const defBase = finalStats(albedo).get('def_base');
        const before = totalDef(finalStats(albedo));
        albedo.setCharSettings({
            albedo_witch_homework: true,
            albedo_flower_of_eden: true,
        });
        // C1 adds 50% DEF as a premod write: the total read counts it.
        expect(totalDef(finalStats(albedo)) - before).toBeCloseTo(0.5 * defBase, 6);
        albedo.setCharSettings({
            albedo_witch_homework: true,
            albedo_solar_isotoma_buff: true,
            albedo_flower_of_eden: true,
        });
        const total = before + 0.5 * defBase;
        expect(finalStats(fischl).get('dmg_skill')).toBeCloseTo(SOLAR_PER_DEF * total, 6);
    });

    test('counts a synthetic extra DEF write (total, not premod)', () => {
        const plain = setup();
        const boosted = setup();
        withExtraDef(boosted.albedo, 500);
        // The synthetic write lands in the extra lane only.
        expect(finalStats(boosted.albedo).get('def_extra') || 0).toBeCloseTo(500, 6);
        expect(totalDef(finalStats(boosted.albedo)) - totalDef(finalStats(plain.albedo))).toBeCloseTo(500, 6);

        const plainGain = gain(plain.fischl, plain.albedo, () => solarOn(plain.albedo));
        const boostedGain = gain(boosted.fischl, boosted.albedo, () => solarOn(boosted.albedo));
        // A premod read would ignore the extra 500 DEF and stay at 8%.
        expect(boostedGain('dmg_skill') - plainGain('dmg_skill')).toBeCloseTo(SOLAR_PER_DEF * 500, 9);
        expect(boostedGain('dmg_skill')).toBeCloseTo(SOLAR_PER_DEF * 2500, 9);
    });

    test('counts a premod DEF write like extra DEF', () => {
        const extra = setup();
        withExtraDef(extra.albedo, 500);
        const premod = setup();
        withPremodDef(premod.albedo, 500);
        // The total read sees both lanes alike.
        const extraGain = gain(extra.fischl, extra.albedo, () => solarOn(extra.albedo));
        const premodGain = gain(premod.fischl, premod.albedo, () => solarOn(premod.albedo));
        expect(premodGain('dmg_skill')).toBeCloseTo(extraGain('dmg_skill'), 9);
        expect(premodGain('dmg_skill')).toBeCloseTo(SOLAR_PER_DEF * 2500, 9);
    });
});

describe('Silver Isotoma buff reads total DEF', () => {
    test('solo numbers: 10 per 1000 DEF, capped at 30%', () => {
        const {albedo, fischl} = setup();
        const delta = gain(fischl, albedo, () => silverOn(albedo));
        // 0.01 * 2000 = 20%, under the 30% cap, on all five.
        for (const stat of ['dmg_normal', 'dmg_charged', 'dmg_plunge', 'dmg_skill', 'dmg_burst']) {
            expect(delta(stat)).toBeCloseTo(0.20, 9);
        }
    });

    test('caps at 30% when DEF pushes past it', () => {
        const {albedo, fischl} = setup(4000);
        const delta = gain(fischl, albedo, () => silverOn(albedo));
        // 0.01 * 4000 = 40%, capped to 30%.
        expect(delta('dmg_burst')).toBeCloseTo(0.30, 9);
    });

    test('counts a synthetic extra DEF write (total, not premod)', () => {
        const plain = setup();
        const boosted = setup();
        withExtraDef(boosted.albedo, 500);
        const plainGain = gain(plain.fischl, plain.albedo, () => silverOn(plain.albedo));
        const boostedGain = gain(boosted.fischl, boosted.albedo, () => silverOn(boosted.albedo));
        expect(boostedGain('dmg_burst') - plainGain('dmg_burst')).toBeCloseTo(SILVER_PER_DEF * 500, 9);
        expect(boostedGain('dmg_burst')).toBeCloseTo(SILVER_PER_DEF * 2500, 9);
    });

    test('is not received by a non-Hexerei member', () => {
        const {albedo, fischl, kazuha} = setup();
        silverOn(albedo);
        const fischlOn = finalStats(fischl);
        const kazuhaOn = finalStats(kazuha);
        albedo.setCharSettings({albedo_witch_homework: true});
        // Fischl (Witch's Homework) gains 20%; Kazuha gains nothing.
        expect(fischlOn.get('dmg_skill') - finalStats(fischl).get('dmg_skill')).toBeCloseTo(0.20, 9);
        expect(kazuhaOn.get('dmg_skill') - finalStats(kazuha).get('dmg_skill')).toBeCloseTo(0, 9);
    });
});

describe('Columbina C2 premod DEF is counted (real teammate)', () => {
    function setupC2() {
        const albedo = makeBuild('Albedo');
        const columbina = makeBuild('Columbina');
        columbina.setCharLevels({level: 90, ascension: 6, constellation: 2});
        const fischl = makeBuild('Fischl');
        // Aino is the second Nod-Krai member: Columbina's C2 needs the
        // Ascendant Gleam gate (Moonsign >= 2) open.
        const aino = makeBuild('Aino');
        const team = Team.fromMember(albedo);
        team.setMember(1, columbina);
        team.setMember(2, fischl);
        team.setMember(3, aino);
        // Columbina's C2 DEF lands on the active character: Albedo.
        team.setOnFieldMember(albedo);
        albedo.setCharSettings({
            albedo_witch_homework: true,
            albedo_solar_isotoma_buff: true,
            albedo_silver_isotoma_buff: true,
        });
        fischl.setCharSettings({fischl_witch_homework: true});
        columbina.setCharSettings({
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'geo',
        });
        // Matched with C2 on (the typed-in value of the old model).
        matchCarrierTotals(columbina, {hp_total: 30000});
        matchCarrierTotals(albedo, {def_total: 2000});
        return {team, albedo, columbina, fischl};
    }

    test('both buffs grow with the premod DEF', () => {
        const {albedo, columbina, fischl} = setupC2();
        // 1% of 30000 HP as premod DEF on Albedo.
        const defOn = totalDef(finalStats(albedo));
        columbina.setCharSettings({});
        const defOff = totalDef(finalStats(albedo));
        expect(defOn - defOff).toBeCloseTo(300, 6);
        columbina.setCharSettings({
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'geo',
        });

        const skillOn = finalStats(fischl).get('dmg_skill');
        columbina.setCharSettings({});
        const skillOff = finalStats(fischl).get('dmg_skill');
        // Solar 4/100000 x 300 and silver 1/10000 x 300 ride on the same stat.
        expect(skillOn - skillOff).toBeCloseTo(SOLAR_PER_DEF * 300 + SILVER_PER_DEF * 300, 9);
    });
});

describe('extra EM must not move the DEF buffs', () => {
    test("Nahida A1 EM leaves solar and silver unchanged", () => {
        const {albedo, fischl, nahida} = setup();
        solarOn(albedo);
        albedo.setCharSettings({
            albedo_witch_homework: true,
            albedo_solar_isotoma_buff: true,
            albedo_silver_isotoma_buff: true,
        });
        const skillBefore = finalStats(fischl).get('dmg_skill');
        const emBefore = totalMastery(finalStats(fischl));
        // Nahida at 900 premod EM shares 25% (225, under the 250 cap).
        matchCarrierTotals(nahida, {mastery_total: 900});
        nahida.setCharSettings({nahida_compassion_illuminated: true, nahida_illusory_heart: true});
        expect(totalMastery(finalStats(fischl)) - emBefore).toBeCloseTo(225, 6);
        expect(finalStats(fischl).get('dmg_skill') - skillBefore).toBeCloseTo(0, 9);
    });
});

describe('flat EM (A4, C2) is a premod write', () => {
    function setupSucrose() {
        const albedo = makeBuild('Albedo');
        const fischl = makeBuild('Fischl');
        const sucrose = makeBuild('Sucrose');
        const nahida = makeBuild('Nahida');
        const team = Team.fromMember(albedo);
        team.setMember(1, fischl);
        team.setMember(2, sucrose);
        team.setMember(3, nahida);
        team.setOnFieldMember(fischl);
        albedo.setCharSettings({albedo_witch_homework: true});
        fischl.setCharSettings({fischl_witch_homework: true});
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        matchCarrierTotals(albedo, {def_total: 2000});
        return {team, albedo, fischl, sucrose};
    }

    test('A4 EM reaches the team and counts for Sucrose A4', () => {
        const {albedo, fischl, sucrose} = setupSucrose();
        const sucroseBefore = totalMastery(finalStats(sucrose));
        const fischlBefore = totalMastery(finalStats(fischl));
        albedo.setCharSettings({
            albedo_witch_homework: true,
            albedo_homuncular_nature: true,
        });
        // Sucrose gets the flat 125 (direct team buff); Fischl gets 125
        // direct plus 20% of Sucrose's 125 through her premod-read A4.
        expect(totalMastery(finalStats(sucrose)) - sucroseBefore).toBeCloseTo(125, 6);
        expect(totalMastery(finalStats(fischl)) - fischlBefore).toBeCloseTo(150, 6);
    });

    test('C2 off-field EM buff is flat', () => {
        const {albedo, fischl} = setup();
        albedo.setCharLevels({level: 90, ascension: 6, constellation: 2});
        const before = totalMastery(finalStats(fischl));
        albedo.setCharSettings({
            albedo_witch_homework: true,
            albedo_opening_of_hanerozoic_buff: true,
        });
        expect(totalMastery(finalStats(fischl)) - before).toBeCloseTo(125, 6);
    });
});

describe('DEF-scaled hits read the total DEF', () => {
    test('skill blossom and C2 Fatal Blossom scale with extra DEF', () => {
        const plain = setup();
        plain.albedo.setCharLevels({level: 90, ascension: 6, constellation: 2});
        const boosted = setup();
        boosted.albedo.setCharLevels({level: 90, ascension: 6, constellation: 2});
        withExtraDef(boosted.albedo, 500);
        for (const build of [plain.albedo, boosted.albedo]) {
            build.setCharSettings({
                albedo_witch_homework: true,
                albedo_opening_of_hanerozoic: 4,
            });
        }
        // Everything but DEF is fixed: pure-DEF hits scale by 2500/2000.
        const plainValues = featureValues(plain.albedo);
        const boostedValues = featureValues(boosted.albedo);
        expect(boostedValues['skill.albedo_blossom'][2] / plainValues['skill.albedo_blossom'][2]).toBeCloseTo(1.25, 6);
        expect(boostedValues['burst.albedo_c2_fatal_blossom'][2] / plainValues['burst.albedo_c2_fatal_blossom'][2]).toBeCloseTo(1.25, 6);
    });
});
