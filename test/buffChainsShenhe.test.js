import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, featureValues } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md (Shenhe): every stat-reading effect reads Shenhe's total ATK.
// - Icy Quill delivered flat DMG (multipliers, receivers TEAM, cryo
//   normal/charged/plunge/skill/burst): game data sizes it with damageExtra on
//   FIGHT_PROP_CUR_ATTACK (total) x Attack2ExtraRatio in
//   Avatar_Shenhe_ElementalArt_Attack_L/H (UNIQUE_Shenhe_ElementalArt_L/H_Buff
//   and the C6 Talent_Buff variants). The default 'atk*' scaling already reads
//   the total, so no params. GO reads input.total.atk into the team quill.
//   KQM Shenhe: quills are dynamic (live ATK counts) with no premod/total
//   interaction test; the quill is an additive base DMG bonus.
// - Icy Quill display value (FeaturePostEffectValue shenhe_dmg_bonus,
//   PostEffectStatsAtk reads: TOTAL, kept): same game expression as above, so
//   the total read is declared. Talent mapping: C4 is
//   Avatar_Shenhe_Constellation_4 (openConfig Shenhe_Constellation_4,
//   paramList [0.05, 50]: 5% per stack, max 50), confirming UNIQUE_ names map
//   to gameplay numbers here (unlike Furina).
// - Normal/charged/plunge/skill/burst hits: plain ATK-scaled damage
//   (FeatureMultiplier on FeatureDamage*), total by construction, need nothing.
// - A1 Deific Embrace (15% cryo DMG), A4 Spirit Communion Seal (15% skill/burst
//   or normal/charged/plunge DMG), C2 Centered Spirit (15% cryo CRIT DMG),
//   burst RES shred (talent ratio), C1/C3/C5/C6 mechanics, C4 Skyfrost Mantra
//   (5% skill DMG per stack, max 50, via ConditionNumberShenhe): flat toggles,
//   no stat read. Conditions write premod: confirmed default.
// - A total ATK read counts every ATK buff, so there is no ATK buff it must
//   ignore; the must-not-count side is covered by the contrast test (Flins's
//   A4, a premod reader, ignoring Bennett's burst in the same team).
// - 4-member teams throughout: a smaller team would get Elemental Resonance in
//   our engine but not in the game (md/buff_chains.md).

// Skill level 10 quill ratio (CharTalentTables Shenhe s2.p3): 82.1808%.
const QUILL_RATIO = 82.1808 / 100;

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

function display(member) {
    return featureValues(member)['skill.shenhe_dmg_bonus'][2];
}

// Shenhe + Ayaka (cryo receiver) + Bennett + Sucrose. Ayaka on field; the only
// cryo resonance is constant across toggles. Shenhe's premod ATK is matched to
// 2000 with every effect off.
function setupBennett() {
    const shenhe = makeBuild('Shenhe');
    shenhe.setCharSkills({attack: 10, elemental: 10, burst: 10});
    const ayaka = makeBuild('Ayaka');
    const bennett = makeBuild('Bennet');
    const sucrose = makeBuild('Sucrose');
    const team = Team.fromMember(ayaka);
    team.setMember(1, shenhe);
    team.setMember(2, bennett);
    team.setMember(3, sucrose);
    team.setOnFieldMember(ayaka);
    shenhe.setCharSettings({shenhe_icy_quill: true});
    bennett.setCharSettings({});
    matchCarrierTotals(shenhe, {atk_total: 2000});
    return {team, shenhe, ayaka, bennett};
}

// Ayaka's cryo skill hit gained from the quill alone (quill on minus off),
// isolating it from Ayaka's own ATK changes.
function ayakaQuillDelta(shenhe, ayaka) {
    shenhe.setCharSettings({});
    const off = featureValues(ayaka)['skill.skill_dmg'][2];
    shenhe.setCharSettings({shenhe_icy_quill: true});
    return featureValues(ayaka)['skill.skill_dmg'][2] - off;
}

const C2_ON = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'electro',
};

// Shenhe on field (Columbina C2 feeds the active member) with Columbina C2,
// Aino and Fischl (Moonsign 2 gate). Totals are matched with C2 on, so turning
// it off drops Shenhe by 1% of Columbina's 30000 total HP = 300 premod ATK.
function setupC2() {
    const shenhe = makeBuild('Shenhe');
    shenhe.setCharSkills({attack: 10, elemental: 10, burst: 10});
    const columbina = makeBuild('Columbina');
    columbina.setCharLevels({level: 90, ascension: 6, constellation: 2});
    const team = Team.fromMember(shenhe);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Fischl'));
    team.setOnFieldMember(shenhe);
    shenhe.setCharSettings({shenhe_icy_quill: true});
    columbina.setCharSettings(C2_ON);
    matchCarrierTotals(columbina, {hp_total: 30000});
    matchCarrierTotals(shenhe, {atk_total: 2000});
    return {team, shenhe, columbina};
}

// Shenhe's own cryo skill press gained from the quill alone (TEAM delivery
// includes the source).
function selfQuillDelta(shenhe) {
    shenhe.setCharSettings({});
    const off = featureValues(shenhe)['skill.press_dmg'][2];
    shenhe.setCharSettings({shenhe_icy_quill: true});
    return featureValues(shenhe)['skill.press_dmg'][2] - off;
}

describe('Shenhe quill reads total ATK', () => {
    test('solo numbers: display is total ATK x talent ratio', () => {
        const {shenhe, ayaka} = setupBennett();
        // No extra ATK present: premod and total agree.
        expect(totalAtk(finalStats(shenhe))).toBeCloseTo(2000, 6);
        expect(display(shenhe)).toBeCloseTo(2000 * QUILL_RATIO, 6);
        // The quill reaches the receiver's cryo hits.
        expect(ayakaQuillDelta(shenhe, ayaka)).toBeGreaterThan(500);
    });

    test('counts Bennett burst extra ATK', () => {
        const {shenhe, ayaka, bennett} = setupBennett();
        const atkBefore = totalAtk(finalStats(shenhe));
        const dispBefore = display(shenhe);
        const quillBefore = ayakaQuillDelta(shenhe, ayaka);
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        const atkAfter = totalAtk(finalStats(shenhe));
        const dispAfter = display(shenhe);
        const quillAfter = ayakaQuillDelta(shenhe, ayaka);
        // Sanity: Bennett applied (extra ATK raises Shenhe's total).
        expect(atkAfter - atkBefore).toBeGreaterThan(100);
        // Game formula: flat bonus is total ATK x ratio.
        expect(dispAfter - dispBefore).toBeCloseTo(QUILL_RATIO * (atkAfter - atkBefore), 8);
        // The delivered bonus scales with the same total.
        expect(quillAfter / quillBefore).toBeCloseTo(dispAfter / dispBefore, 8);
    });

    test('counts Columbina C2 premod ATK', () => {
        const {shenhe, columbina} = setupC2();
        const atkOn = totalAtk(finalStats(shenhe));
        const dispOn = display(shenhe);
        const quillOn = selfQuillDelta(shenhe);
        columbina.setCharSettings({});
        const atkOff = totalAtk(finalStats(shenhe));
        const dispOff = display(shenhe);
        const quillOff = selfQuillDelta(shenhe);
        // 1% of 30000 total HP, premod, on the active character.
        expect(atkOn - atkOff).toBeCloseTo(300, 6);
        expect(dispOn - dispOff).toBeCloseTo(QUILL_RATIO * 300, 6);
        expect(quillOn / quillOff).toBeCloseTo(dispOn / dispOff, 8);
    });

    test('contrast: Flins A4 (premod) ignores Bennett extra ATK in the same team', () => {
        const shenhe = makeBuild('Shenhe');
        shenhe.setCharSkills({attack: 10, elemental: 10, burst: 10});
        const bennett = makeBuild('Bennet');
        const flins = makeBuild('Flins');
        const ayaka = makeBuild('Ayaka');
        const team = Team.fromMember(ayaka);
        team.setMember(1, shenhe);
        team.setMember(2, bennett);
        team.setMember(3, flins);
        team.setOnFieldMember(ayaka);
        shenhe.setCharSettings({shenhe_icy_quill: true});
        bennett.setCharSettings({});
        matchCarrierTotals(shenhe, {atk_total: 2000});
        matchCarrierTotals(flins, {atk_total: 1000});
        const dispBefore = display(shenhe);
        const flinsEmBefore = finalStats(flins).get('mastery') + finalStats(flins).get('mastery_base');
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        // Shenhe (total read) moves with the extra ATK; Flins A4 (8% of
        // premod ATK, cap 160, linear here) does not.
        expect(display(shenhe) - dispBefore).toBeGreaterThan(10);
        const flinsEmAfter = finalStats(flins).get('mastery') + finalStats(flins).get('mastery_base');
        expect(flinsEmAfter - flinsEmBefore).toBeCloseTo(0, 8);
    });
});
