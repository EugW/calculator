import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, featureValues } from "./support/team";
import { equipWeapon, matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Angelos Heptades): both
// Pathfinder's Light post-effects keep the default channels (no reads/writes
// params changed in src/js/db/Weapon/Catalyst/AngelosHeptades.js).
//
// - Active variant: game data Weapon_Catalyst_Nicole (openConfig of affix
//   114523 for icon UI_EquipIcon_Catalyst_FairyGarden, in
//   ConfigAbility_Weapon_Catalyst2.json) computes BuffRatio in
//   UNIQUE_Weapon_Catalyst_Nicole_Buff_Driver from FIGHT_PROP_NONEXTRA_ATTACK
//   (premod) times BuffTransRatio (R1 0.10) per PerAttack (1000), capped at
//   BuffRatioMax (R1 0.26); Weapon_Catalyst_Nicole_Buff applies it as a
//   hit-level ModifyDamageMixin (no Actor_ write, so no premod/extra marker
//   on the write side; dmg_all has no extra lane, md/buff_chains.md).
// - Hexerei variant: UNIQUE_Weapon_Catalyst_Nicole_Hexenzirkel_Driver reads
//   the same FIGHT_PROP_NONEXTRA_ATTACK (premod) and scales it by
//   Hexenzirkel_Ratio (0.5, same affix entry), capped at half the max;
//   UNIQUE_Weapon_Catalyst_Nicole_Buff_Hexenzirkel_Buff is again a
//   ModifyDamageMixin with no Actor_ write. md/tools/extra_scan.js flags the
//   ability as R-nonextra:NONEXTRA_ATTACK with no extra writes.
// - KQM TCL equipment/weapons has no buff-chain test for this weapon.
// - GO (Weapons/Catalyst/AngelosHeptades): dmg_node reads input.premod.atk
//   (teamBuff.premod.all_dmg_; in our engine dmg_all has no extra lane and
//   damage reads totals by construction, so the write side needs nothing).
// - Game text (data/raw/weapon_texts.txt, angelos_heptades): "Increases your
//   active party member's DMG by 10% for every 1,000 ATK the equipping
//   character has, up to a maximum of 26%" (R1); off-field Hexerei members
//   gain 50%. Guide's Contentment (14 flat energy, R1) is not modeled here
//   (no post-effect) and reads no stat.
// - The ATK% condition and the text_* stats are flat toggles: premod by
//   construction. The FeaturePostEffectValue entries only display the
//   post-effects' values.
//
// Game-formula constants used below (R1): bonus = min(0.10 x holder premod
// ATK / 1000, 0.26); Hexerei off-field = half of that. Only the builds' live
// inputs (holder premod ATK, Columbina HP, Xingqiu talent values) are read
// from the engine; every expected number is computed from those formulas.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const RATE = 0.10 / 1000;
const CAP = 0.26;
const HEXEREI_RATE = 0.05 / 1000;
const HEXEREI_CAP = 0.13;

function totalAtk(stats) {
    return stats.getTotalPercent('atk');
}

function premodAtk(stats) {
    return totalAtk(stats) - (stats.get('atk_base') * (stats.get('atk_percent_extra') || 0) + (stats.get('atk_extra') || 0));
}

function extraAtk(stats) {
    return (stats.get('atk_extra') || 0) + stats.get('atk_base') * (stats.get('atk_percent_extra') || 0);
}

function holderBuild() {
    const holder = makeBuild('Nahida');
    equipWeapon('catalyst', 'AngelosHeptades', 1)(holder);
    return holder;
}

function gainOf(member) {
    return finalStats(member).get('dmg_all');
}

// Holder (Nahida, catalyst) on field + Bennett + neutral fillers: dendro,
// pyro, electro, anemo, so no resonance. Bennett's burst is extra ATK
// (md/buff_chains.md); the holder's premod ATK is matched exactly.
function setupBennett() {
    const holder = holderBuild();
    const bennett = makeBuild('Bennet');
    const team = Team.fromMember(holder);
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Fischl'));
    team.setMember(3, makeBuild('Venti'));
    team.setOnFieldMember(holder);
    holder.setWeaponSettings({weapon_angelos_heptades: false});
    bennett.setCharSettings({});
    matchCarrierTotals(holder, {atk_total: 2000});
    return {team, holder, bennett};
}

// Holder on field + Columbina C2 (electro: +1% of her HP as premod ATK on
// the active character) + neutral fillers. Aino is the second Nod-Krai
// member: Columbina's C2 needs Moonsign 2 (columbinaAscendantGleam). Totals
// are matched with C2 on: the Brilliance toggle also grants her own HP%
// (columbina_lunar_brilliance hp_percent), so matching with it off and
// switching it on would move her HP (test/buffChainsDurin.test.js matches
// the same way).
function setupC2() {
    const holder = holderBuild();
    const columbina = makeBuild('Columbina');
    columbina.setCharLevels({level: 90, ascension: 6, constellation: 2});
    const team = Team.fromMember(holder);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Fischl'));
    team.setMember(3, makeBuild('Aino'));
    team.setOnFieldMember(holder);
    holder.setWeaponSettings({weapon_angelos_heptades: true});
    columbina.setCharSettings(C2_ON);
    matchCarrierTotals(columbina, {hp_total: 30000});
    matchCarrierTotals(holder, {atk_total: 2000});
    return {team, holder, columbina};
}

// Hexerei recipient states, as in test/teamHexereiWeapons.test.js: holder
// off field, Venti (Hexerei, homework on) active, Durin (Hexerei, homework
// on) off field, Ayaka ordinary.
function hexereiMember(charKey) {
    const member = makeBuild(charKey);
    member.setCharSettings({[member.char.get().name + '_witch_homework']: true});
    return member;
}

function setupHexerei(atk) {
    const holder = holderBuild();
    const offHexerei = hexereiMember('Durin');
    const activeHexerei = hexereiMember('Venti');
    const ordinary = makeBuild('Ayaka');
    const team = Team.fromMember(holder);
    [offHexerei, activeHexerei, ordinary].forEach((member, i) => team.setMember(i + 1, member));
    team.setOnFieldMember(activeHexerei);
    holder.setWeaponSettings({weapon_angelos_heptades: false});
    matchCarrierTotals(holder, {atk_total: atk});
    return {holder, offHexerei, activeHexerei, ordinary};
}

// Xingqiu active recipient: his damage reduction reads premod Hydro DMG
// (dmg_hydro~, test/buffChainsXingqiu.test.js; KQM: Kazuha's A4 extra Hydro
// does not count), while his hits read totals and count dmg_all.
function setupXingqiu() {
    const holder = holderBuild();
    const xingqiu = makeBuild('Xingqiu');
    const team = Team.fromMember(xingqiu);
    team.setMember(1, holder);
    team.setMember(2, makeBuild('Fischl'));
    team.setMember(3, makeBuild('Venti'));
    team.setOnFieldMember(xingqiu);
    holder.setWeaponSettings({weapon_angelos_heptades: false});
    matchCarrierTotals(holder, {atk_total: 2000});
    return {holder, xingqiu};
}

function resetFeatures(charKey) {
    for (const feature of DB.Chars.get(charKey).getFeatures()) {
        feature.compiled = undefined;
    }
}

function reductionOf(xingqiu) {
    resetFeatures('Xingqiu');
    return featureValues(xingqiu)['skill.dmg_reduction'][0];
}

function skillNormalOf(xingqiu) {
    resetFeatures('Xingqiu');
    return featureValues(xingqiu)['skill.skill_dmg'][0];
}

const C2_ON = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'electro',
};

describe('Angelos Heptades reads premod ATK', () => {
    test('solo numbers: 10% per 1000 ATK, cap 26%, no extra lane', () => {
        const {holder} = setupBennett();
        const before = gainOf(holder);
        holder.setWeaponSettings({weapon_angelos_heptades: true});
        // No extra ATK present: premod and total agree (2000).
        expect(premodAtk(finalStats(holder))).toBeCloseTo(2000, 6);
        expect(extraAtk(finalStats(holder))).toBe(0);
        expect(gainOf(holder) - before).toBeCloseTo(Math.min(RATE * 2000, CAP), 9);
        // Past the cap the bonus stays flat: 4000 would give 0.40 uncapped.
        matchCarrierTotals(holder, {atk_total: 4000});
        expect(premodAtk(finalStats(holder))).toBeCloseTo(4000, 6);
        expect(gainOf(holder) - before).toBeCloseTo(CAP, 9);
    });

    test('ignores Bennett burst extra ATK', () => {
        const {holder, bennett} = setupBennett();
        holder.setWeaponSettings({weapon_angelos_heptades: true});
        const gainBefore = gainOf(holder);
        const atkBefore = totalAtk(finalStats(holder));
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        const atkAfter = totalAtk(finalStats(holder));
        // Sanity: Bennett applied (extra ATK raises the total).
        expect(atkAfter - atkBefore).toBeGreaterThan(100);
        expect(extraAtk(finalStats(holder))).toBeCloseTo(atkAfter - atkBefore, 6);
        expect(premodAtk(finalStats(holder))).toBeCloseTo(2000, 6);
        // The premod-read bonus stays at the game formula value.
        expect(gainOf(holder)).toBeCloseTo(gainBefore, 9);
        expect(gainOf(holder) - gainBefore).toBe(0);
    });

    test('counts Columbina C2 premod ATK', () => {
        const {holder, columbina} = setupC2();
        const gainOn = gainOf(holder);
        const atkOn = totalAtk(finalStats(holder));
        expect(premodAtk(finalStats(holder))).toBeCloseTo(2000, 6);
        columbina.setCharSettings({});
        const gainOff = gainOf(holder);
        const atkOff = totalAtk(finalStats(holder));
        // 1% of 30000 total HP, premod: the holder (on field) loses 300 ATK.
        expect(atkOn - atkOff).toBeCloseTo(300, 6);
        expect(premodAtk(finalStats(holder))).toBeCloseTo(1700, 6);
        // 10% per 1000 of the 300 premod ATK = 0.03, uncapped.
        expect(gainOn - gainOff).toBeCloseTo(RATE * 300, 9);
        expect(gainOn - gainOff).toBeCloseTo(0.03, 9);
    });

    test('Hexerei off-field variant reads the same premod ATK at half rate', () => {
        const {holder, offHexerei, activeHexerei, ordinary} = setupHexerei(2000);
        const before = [holder, offHexerei, activeHexerei, ordinary].map(gainOf);
        holder.setWeaponSettings({weapon_angelos_heptades: true});
        const gains = [holder, offHexerei, activeHexerei, ordinary].map((member, i) => gainOf(member) - before[i]);
        // Active Hexerei: full; off-field Hexerei: half; holder off field and
        // non-Hexerei, ordinary member: nothing.
        expect(gains[2]).toBeCloseTo(Math.min(RATE * 2000, CAP), 9);
        expect(gains[1]).toBeCloseTo(Math.min(HEXEREI_RATE * 2000, HEXEREI_CAP), 9);
        expect(gains[0]).toBe(0);
        expect(gains[3]).toBe(0);
        // The half rate caps at half the max: 6000 would give 0.30 uncapped.
        const {holder: holder2, offHexerei: off2, activeHexerei: active2} = setupHexerei(6000);
        const before2 = [active2, off2].map(gainOf);
        holder2.setWeaponSettings({weapon_angelos_heptades: true});
        expect(gainOf(active2) - before2[0]).toBeCloseTo(CAP, 9);
        expect(gainOf(off2) - before2[1]).toBeCloseTo(HEXEREI_CAP, 9);
    });
});

describe('Angelos Heptades writes dmg_all (no extra lane)', () => {
    test('recipient hits count it, Xingqiu reduction ignores it', () => {
        const {holder, xingqiu} = setupXingqiu();
        const reductionBefore = reductionOf(xingqiu);
        // Solo Xingqiu: base 29% + 20% x premod Hydro (his own A4, 20%).
        expect(reductionBefore).toBeCloseTo(33, 9);
        const normalBefore = skillNormalOf(xingqiu);
        const statsBefore = finalStats(xingqiu);
        holder.setWeaponSettings({weapon_angelos_heptades: true});
        const statsAfter = finalStats(xingqiu);
        // The active recipient gains the game-formula bonus; nothing else moves.
        expect(statsAfter.get('dmg_all') - statsBefore.get('dmg_all')).toBeCloseTo(Math.min(RATE * 2000, CAP), 9);
        expect(statsAfter.get('dmg_hydro') - statsBefore.get('dmg_hydro')).toBe(0);
        // The premod-Hydro reduction stays: a generic DMG bonus is hit-level
        // in the game (ModifyDamageMixin, no Hydro ADD_HURT write), and
        // dmg_all is not part of dmg_hydro here.
        expect(reductionOf(xingqiu)).toBeCloseTo(reductionBefore, 9);
        // The hit itself counts the bonus: only the (1 + bonuses) factor
        // moves, everything else (talent scaling, enemy) cancels in the ratio.
        const bonusOf = (stats) => stats.get('dmg_all') + stats.get('dmg_hydro') + (stats.get('dmg_skill') || 0) + (stats.get('dmg_skill_hydro') || 0);
        const expected = normalBefore * (1 + bonusOf(statsAfter)) / (1 + bonusOf(statsBefore));
        expect(skillNormalOf(xingqiu)).toBeCloseTo(expected, 6);
        expect(skillNormalOf(xingqiu) - normalBefore).toBeGreaterThan(0);
    });
});
