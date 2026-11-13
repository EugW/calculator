import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Nicole):
// - Grace of Kenosis ATK (skill) reads premod ATK (game:
//   Avatar_Nicole_ElementalArt onAbilityStart: FIGHT_PROP_NONEXTRA_ATTACK x
//   AttackUp_AttackTranferRatio, cap AttackUp_Max) and writes extra ATK
//   (UNIQUE_Avatar_Nicole_AttackUp_Lv1/Lv2: Actor_AttackExtraDelta; GO:
//   input.premod.atk into teamBuff total atk). The defaults are confirmed, so
//   premod writers (Chevreuse A4 ATK%) count; extra writers (Bennett burst)
//   do not.
// - C4 Pathfinder's Blessing (70% of Nicole's ATK) reads total ATK (game:
//   UNIQUE_Avatar_Nicole_Constellation_4_Buff ModifyDamageCountMixin damageExtra
//   FIGHT_PROP_CUR_ATTACK x Constellation_4_Buff_Ratio; GO:
//   prod(percent(dmgInc), input.total.atk): reads: CHANNELS.TOTAL on the post.
//   The delivered multiplier (scaling 'atk*') already reads the total, as does
//   the Secret Rite multiplier below. A total read counts both premod
//   (Chevreuse) and extra (Bennett) ATK, so there is no "must not count" buff.
// - Hexerei Secret Rite (+300% of Nicole's ATK to Hexerei Arcane Projections)
//   reads total ATK (game: Avatar_Nicole_PermanentSkill_3 UNIQUE handler
//   ModifyDamageMixin damageExtra FIGHT_PROP_CUR_ATTACK x Ratio; GO:
//   input.total.atk). Delivered FeatureMultiplier scaling 'atk*' reads the
//   total: needs nothing.
// - Shield and talent hits read total ATK (game: shield from
//   FIGHT_PROP_CUR_ATTACK); A1/C2 flat +300 ATK, the C2 RES shred and C6 DEF
//   ignore are flat conditions: need nothing.
// - KQM has no Nicole chaining test (TCL page: findings not added yet).
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const GRACE = 'other.nicole_grace_atk_bonus';
const PATH = 'other.nicole_pathfinder_blessing';
const AP = 'other.nicole_arcane_projection';

function withConstellation(key, constellation) {
    const build = makeBuild(key);
    build.setCharLevels({level: 90, ascension: 6, constellation});
    return build;
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

function row(member, name) {
    return member.getFeatures(member.getBuildData())[name].normal;
}

function graceRatio() {
    return DB.Chars.get('Nicole').talents.get('skill.nicole_grace_of_kenosis_atk_bonus_ratio').getValue(10) / 100;
}

function graceCap() {
    return DB.Chars.get('Nicole').talents.get('skill.nicole_grace_of_kenosis_max_atk_bonus').getValue(10);
}

// Neutral fillers: no ATK share, no shared element with Nicole (pyro).
function fillers(team, start) {
    team.setMember(start, makeBuild('Aino'));
    team.setMember(start + 1, makeBuild('Kazuha'));
}

describe("Grace of Kenosis reads premod ATK", () => {
    test("solo formula and cap: ratio of premod ATK, max bonus", () => {
        const nicole = makeBuild('Nicole');
        const team = Team.fromMember(nicole);
        fillers(team, 1);
        nicole.setCharSettings({nicole_grace_of_kenosis: 'grace'});
        const ratio = graceRatio();
        const cap = graceCap();
        // Solo nothing writes extra ATK except Grace itself, so
        // premod ATK is the total less the Grace bonus.
        matchCarrierTotals(nicole, {atk_total: 1000});
        const total1000 = totalAtk(finalStats(nicole));
        const grace1000 = row(nicole, GRACE);
        expect(grace1000).toBeCloseTo(Math.min(ratio * (total1000 - grace1000), cap), 6);
        matchCarrierTotals(nicole, {atk_total: 2000});
        const total2000 = totalAtk(finalStats(nicole));
        const grace2000 = row(nicole, GRACE);
        expect(grace2000 - grace1000).toBeCloseTo(ratio * ((total2000 - grace2000) - (total1000 - grace1000)), 6);
        // Far above the cap the bonus stays at the cap.
        matchCarrierTotals(nicole, {atk_total: 6000});
        expect(row(nicole, GRACE)).toBeCloseTo(cap, 6);
    });

    test("counts Chevreuse A4 premod ATK%", () => {
        const nicole = makeBuild('Nicole');
        const chevreuse = makeBuild('Chevreuse');
        const team = Team.fromMember(nicole);
        team.setMember(1, chevreuse);
        fillers(team, 2);
        team.setOnFieldMember(nicole);
        nicole.setCharSettings({nicole_grace_of_kenosis: 'grace'});
        // Chevreuse A4 is a premod ATK% write (1% per 1000 HP, cap 40%).
        matchCarrierTotals(chevreuse, {hp_total: 30000});
        const ratio = graceRatio();
        chevreuse.setCharSettings({});
        const totalOff = totalAtk(finalStats(nicole));
        const graceOff = row(nicole, GRACE);
        chevreuse.setCharSettings({chevreuse_force_coordination: true});
        const totalOn = totalAtk(finalStats(nicole));
        const graceOn = row(nicole, GRACE);
        expect(totalOn - totalOff).toBeGreaterThan(100);
        // Grace writes its own bonus as extra ATK, so the premod delta is the
        // total delta less the Grace delta itself.
        expect(graceOn - graceOff).toBeCloseTo(ratio * ((totalOn - totalOff) - (graceOn - graceOff)), 6);
    });

    test("ignores Bennett burst extra ATK", () => {
        const nicole = makeBuild('Nicole');
        const bennet = makeBuild('Bennet');
        const team = Team.fromMember(nicole);
        team.setMember(1, bennet);
        fillers(team, 2);
        team.setOnFieldMember(nicole);
        nicole.setCharSettings({nicole_grace_of_kenosis: 'grace'});
        matchCarrierTotals(nicole, {atk_total: 1000});
        bennet.setCharSettings({});
        const atkBefore = totalAtk(finalStats(nicole));
        const graceBefore = row(nicole, GRACE);
        // Bennett's burst reads base ATK and writes extra: it raises Nicole's
        // total ATK but must not move her premod-read Grace bonus.
        bennet.setCharSettings({bennet_fantastic_voyage: true});
        expect(totalAtk(finalStats(nicole)) - atkBefore).toBeGreaterThan(100);
        expect(row(nicole, GRACE) - graceBefore).toBeCloseTo(0, 8);
    });
});

describe("C4 Pathfinder's Blessing reads total ATK", () => {
    function setup() {
        const fischl = makeBuild('Fischl');
        const nicole = withConstellation('Nicole', 4);
        const team = Team.fromMember(fischl);
        team.setMember(1, nicole);
        fillers(team, 2);
        team.setOnFieldMember(fischl);
        nicole.setCharSettings({
            nicole_grace_of_kenosis: 'guidance',
            nicole_whether_left_or_right_no_matter_which_way_you_turn: true,
        });
        return {team, fischl, nicole};
    }

    test("solo formula: 70% of total ATK", () => {
        const {nicole} = setup();
        // No extra ATK writer besides Grace/Guidance itself, so this is also
        // the solo parity check: with no extra stat present the row is
        // 0.7 x the total, as before.
        matchCarrierTotals(nicole, {atk_total: 1000});
        const total1000 = totalAtk(finalStats(nicole));
        expect(row(nicole, PATH)).toBeCloseTo(0.7 * total1000, 6);
        matchCarrierTotals(nicole, {atk_total: 2000});
        const total2000 = totalAtk(finalStats(nicole));
        expect(row(nicole, PATH)).toBeCloseTo(0.7 * total2000, 6);
    });

    test("counts Bennett burst extra ATK", () => {
        const {nicole} = setup();
        const bennet = makeBuild('Bennet');
        const team = nicole.team;
        team.setMember(3, bennet);
        matchCarrierTotals(nicole, {atk_total: 1000});
        bennet.setCharSettings({});
        const totalOff = totalAtk(finalStats(nicole));
        const rowOff = row(nicole, PATH);
        bennet.setCharSettings({bennet_fantastic_voyage: true});
        const totalOn = totalAtk(finalStats(nicole));
        const rowOn = row(nicole, PATH);
        expect(totalOn - totalOff).toBeGreaterThan(100);
        expect(rowOn - rowOff).toBeCloseTo(0.7 * (totalOn - totalOff), 6);
    });

    test("counts Chevreuse A4 premod ATK%", () => {
        const {nicole} = setup();
        const chevreuse = makeBuild('Chevreuse');
        const team = nicole.team;
        team.setMember(3, chevreuse);
        matchCarrierTotals(chevreuse, {hp_total: 30000});
        chevreuse.setCharSettings({});
        const totalOff = totalAtk(finalStats(nicole));
        const rowOff = row(nicole, PATH);
        chevreuse.setCharSettings({chevreuse_force_coordination: true});
        const totalOn = totalAtk(finalStats(nicole));
        const rowOn = row(nicole, PATH);
        expect(totalOn - totalOff).toBeGreaterThan(100);
        expect(rowOn - rowOff).toBeCloseTo(0.7 * (totalOn - totalOff), 6);
    });

    test("receiver damage bonus scales with Nicole's total ATK", () => {
        const {fischl, nicole} = setup();
        const bennet = makeBuild('Bennet');
        nicole.team.setMember(3, bennet);
        const blessingOff = {nicole_grace_of_kenosis: 'guidance'};
        const blessingOn = {
            nicole_grace_of_kenosis: 'guidance',
            nicole_whether_left_or_right_no_matter_which_way_you_turn: true,
        };
        const hit = () => fischl.getFeatures(fischl.getBuildData())['attack.normal_hit_1'].normal;
        const bonus = () => {
            nicole.setCharSettings(blessingOff);
            const base = hit();
            nicole.setCharSettings(blessingOn);
            return hit() - base;
        };
        matchCarrierTotals(nicole, {atk_total: 1000});
        bennet.setCharSettings({});
        const bonusOff = bonus();
        const nicoleOff = totalAtk(finalStats(nicole));
        expect(bonusOff).toBeGreaterThan(0);
        bennet.setCharSettings({bennet_fantastic_voyage: true});
        const bonusOn = bonus();
        const nicoleOn = totalAtk(finalStats(nicole));
        // The receiver's own stats cancel in the difference, so the delivered
        // 70% bonus scales exactly with Nicole's total ATK, extra included.
        expect(bonusOn / bonusOff).toBeCloseTo(nicoleOn / nicoleOff, 6);
    });
});

describe("Hexerei Secret Rite reads total ATK", () => {
    function setup() {
        const fischl = makeBuild('Fischl');
        const nicole = makeBuild('Nicole');
        const team = Team.fromMember(fischl);
        team.setMember(1, nicole);
        team.setMember(2, makeBuild('Aino'));
        const bennet = makeBuild('Bennet');
        team.setMember(3, bennet);
        team.setOnFieldMember(fischl);
        team.enemy.set(null);
        team.enemy.setResistances({electro: 0, pyro: 0, hydro: 0});
        fischl.setCharSettings({fischl_witch_homework: true});
        nicole.setCharSettings({nicole_witch_homework: true});
        return {team, fischl, nicole, bennet};
    }

    test("counts Bennett burst extra ATK on Nicole", () => {
        const {fischl, nicole, bennet} = setup();
        const bonus = () => {
            nicole.setCharSettings({nicole_witch_homework: false});
            const off = fischl.getFeatures(fischl.getBuildData())[AP].normal;
            nicole.setCharSettings({nicole_witch_homework: true});
            return fischl.getFeatures(fischl.getBuildData())[AP].normal - off;
        };
        bennet.setCharSettings({});
        const bonusOff = bonus();
        const nicoleOff = totalAtk(finalStats(nicole));
        expect(bonusOff).toBeGreaterThan(0);
        bennet.setCharSettings({bennet_fantastic_voyage: true});
        const bonusOn = bonus();
        const nicoleOn = totalAtk(finalStats(nicole));
        // Toggling the Rite cancels the receiver's own ATK (Bennett buffs
        // both members), so the 300% bonus scales exactly with Nicole's total
        // ATK: an extra-ATK (premod-ignoring) read would not move at all.
        expect(nicoleOn - nicoleOff).toBeGreaterThan(100);
        expect(bonusOn / bonusOff).toBeCloseTo(nicoleOn / nicoleOff, 6);
    });
});
