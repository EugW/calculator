import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Makhaira Aquamarine):
// - Self ATK from own EM (weaponPost) and party ATK from the holder's EM
//   (partyPost, 30% of the self buff): game
//   (Weapon_Claymore_Pleroma, UNIQUE_Claymore_Pleroma_Handler) reads
//   FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY (premod) into MasteryCache and writes
//   Actor_AttackExtraDelta (extra) via MasteryCache x MasteryTransformRatio
//   (24%/30%/36%/42%/48%, affix 1124150-4; party x TeamInheritRatio 0.3).
//   extra_scan: NONEXTRA_ELEMENT_MASTERY read, Actor_AttackExtraDelta write.
//   GO reads input.premod.eleMas into total.atk. KQM has no direct Makhaira
//   interaction test; the sister Pleroma weapon Xiphos does not affect Raiden
//   A4 / Emblem (premod readers). The default premod read and extra write are
//   confirmed for both post-effects, so premod EM writers (Albedo A4 flat EM)
//   count and extra EM writers (Key party EM) do not; premod ATK readers
//   (Flins A4) ignore the written ATK while total ATK readers (Durin A4)
//   count it.
// - FeaturePostEffectValue atk_bonus (weaponPost) and atk_bonus_bonus (party
//   ratio display, 30% of self): displays read the same premod EM; need
//   nothing beyond the post-effect channels.
// - Conditions (weapon_desert_pavilion toggle, text_percent): always premod,
//   need nothing.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const R1_SELF = 0.24;
const R1_PARTY = 24 * 0.003; // 0.072, 30% of self
const R5_SELF = 0.48;
const R5_PARTY = 48 * 0.003; // 0.144

function equipMakhaira(build, refine = 1) {
    build.setWeapon(DB.Weapons.get('claymore').get('MakhairaAquamarine'));
    build.setWeaponLevels({level: 90, ascension: 6, refine});
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

// Diluc (pyro claymore, no EM/ATK conversions of his own) holding Makhaira,
// with three neutrals of other elements so there is no resonance.
function setupHolder(refine = 1) {
    const holder = makeBuild('Diluc');
    equipMakhaira(holder, refine);
    const team = Team.fromMember(holder);
    team.setMember(1, makeBuild('Aino'));
    team.setMember(2, makeBuild('Kazuha'));
    team.setMember(3, makeBuild('Fischl'));
    team.setOnFieldMember(holder);
    holder.setWeaponSettings({});
    return {team, holder};
}

function holderGain(holder, stat) {
    holder.setWeaponSettings({});
    const off = finalStats(holder).get(stat);
    holder.setWeaponSettings({weapon_desert_pavilion: true});
    const on = finalStats(holder).get(stat);
    return on - off;
}

describe("Makhaira Aquamarine self and party formula (premod EM -> extra ATK)", () => {
    test("R1: 24% of premod EM to self, 30% of that to the party", () => {
        const {holder} = setupHolder(1);
        matchCarrierTotals(holder, {mastery_total: 1000});
        // No extra EM present, so premod EM is the 1000 total.
        expect(totalMastery(finalStats(holder))).toBeCloseTo(1000, 6);
        expect(holderGain(holder, 'atk')).toBeCloseTo(R1_SELF * 1000, 6);

        // Party member gets 30% of the self buff, from the holder's EM.
        const receiver = holder.team.getSlots()[1];
        holder.setWeaponSettings({});
        const off = finalStats(receiver).get('atk');
        holder.setWeaponSettings({weapon_desert_pavilion: true});
        expect(finalStats(receiver).get('atk') - off).toBeCloseTo(R1_PARTY * 1000, 6);
        holder.setWeaponSettings({});
    });

    test("R5: 48% of premod EM to self, 30% of that to the party", () => {
        const {holder} = setupHolder(5);
        matchCarrierTotals(holder, {mastery_total: 1000});
        expect(holderGain(holder, 'atk')).toBeCloseTo(R5_SELF * 1000, 6);

        const receiver = holder.team.getSlots()[1];
        holder.setWeaponSettings({});
        const off = finalStats(receiver).get('atk');
        holder.setWeaponSettings({weapon_desert_pavilion: true});
        expect(finalStats(receiver).get('atk') - off).toBeCloseTo(R5_PARTY * 1000, 6);
        holder.setWeaponSettings({});
    });

    test("scales linearly with premod EM", () => {
        const {holder} = setupHolder(1);
        matchCarrierTotals(holder, {mastery_total: 1000});
        holder.setWeaponSettings({weapon_desert_pavilion: true});
        const atk1000 = finalStats(holder).get('atk');
        matchCarrierTotals(holder, {mastery_total: 2000});
        // Doubling the premod EM doubles the grant: +240 ATK.
        expect(finalStats(holder).get('atk') - atk1000).toBeCloseTo(R1_SELF * 1000, 6);
    });
});

describe("Makhaira reads premod EM", () => {
    test("counts Albedo A4 flat (premod) EM", () => {
        const holder = makeBuild('Diluc');
        equipMakhaira(holder, 1);
        const albedo = makeBuild('Albedo');
        const team = Team.fromMember(holder);
        team.setMember(1, albedo);
        team.setMember(2, makeBuild('Kazuha'));
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(holder);
        holder.setWeaponSettings({weapon_desert_pavilion: true});
        albedo.setCharSettings({});
        matchCarrierTotals(holder, {mastery_total: 1000});

        // Albedo A4 is a flat 125 EM team condition (game:
        // Actor_ElemMasteryDelta, premod; KQM Sucrose evidence: flat EM
        // counts for premod readers).
        const atkBefore = finalStats(holder).get('atk');
        const emBefore = totalMastery(finalStats(holder));
        albedo.setCharSettings({albedo_homuncular_nature: true});
        expect(totalMastery(finalStats(holder)) - emBefore).toBeCloseTo(125, 6);
        // 24% of the 125 premod EM reaches the holder's own ATK.
        expect(finalStats(holder).get('atk') - atkBefore).toBeCloseTo(R1_SELF * 125, 6);

        // The same 125 premod EM reaches the party through the 30% share.
        const receiver = team.getSlots()[2];
        holder.setWeaponSettings({weapon_desert_pavilion: true});
        albedo.setCharSettings({});
        const partyOff = finalStats(receiver).get('atk');
        albedo.setCharSettings({albedo_homuncular_nature: true});
        expect(finalStats(receiver).get('atk') - partyOff).toBeCloseTo(R1_PARTY * 125, 6);
    });

    test("ignores the Key's extra EM", () => {
        const holder = makeBuild('Diluc');
        equipMakhaira(holder, 1);
        const kazuha = makeBuild('Kazuha');
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        const team = Team.fromMember(holder);
        team.setMember(1, kazuha);
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(holder);
        holder.setWeaponSettings({weapon_desert_pavilion: true});
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        matchCarrierTotals(holder, {mastery_total: 1000});

        const atkBefore = finalStats(holder).get('atk');
        const emBefore = totalMastery(finalStats(holder));
        // The Key's party EM is extra (game: Actor_ElemMasteryExtraDelta;
        // KQM: Xiphos/Key EM does not feed premod EM readers).
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(holder)) - emBefore).toBeGreaterThan(1);
        // The premod read leaves the grant alone.
        expect(finalStats(holder).get('atk') - atkBefore).toBeCloseTo(0, 8);
    });
});

describe("Makhaira writes extra ATK", () => {
    function setupReceiver(receiverKey, holderKey = 'Diluc') {
        const holder = makeBuild(holderKey);
        equipMakhaira(holder, 1);
        const receiver = makeBuild(receiverKey);
        const team = Team.fromMember(receiver);
        team.setMember(1, holder);
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Kazuha'));
        team.setOnFieldMember(receiver);
        holder.setWeaponSettings({});
        return {team, holder, receiver};
    }

    test("Flins A4 (premod ATK) ignores it", () => {
        const {holder, receiver} = setupReceiver('Flins');
        matchCarrierTotals(holder, {mastery_total: 1000});
        matchCarrierTotals(receiver, {atk_total: 1000});
        // Flins A4: 8% of premod ATK (cap 160; 1000 ATK gives 80 EM).
        const emBefore = totalMastery(finalStats(receiver));
        const atkBefore = finalStats(receiver).get('atk');
        holder.setWeaponSettings({weapon_desert_pavilion: true});
        // Sanity: the 72 party ATK applied (extra ATK raises the total).
        expect(finalStats(receiver).get('atk') - atkBefore).toBeCloseTo(R1_PARTY * 1000, 4);
        // His premod-read A4 leaves his EM alone.
        expect(totalMastery(finalStats(receiver)) - emBefore).toBeCloseTo(0, 8);
    });

    test("Durin A4 (total ATK) counts it", () => {
        // Sayu (anemo claymore) holds Makhaira so the team has no resonance
        // (Durin pyro, Sayu anemo, Aino hydro, Fischl electro).
        const holder = makeBuild('Sayu');
        equipMakhaira(holder, 1);
        const durin = makeBuild('Durin');
        const team = Team.fromMember(durin);
        team.setMember(1, holder);
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(durin);
        durin.setCharSettings({durin_primordial_fusion: true});
        holder.setWeaponSettings({});
        matchCarrierTotals(holder, {mastery_total: 1000});
        matchCarrierTotals(durin, {atk_total: 1000});
        // Durin A4: 3% per 100 ATK (0.0003 per ATK, cap 0.75; 1000 ATK
        // gives 0.30, linear here).
        const specialBefore = finalStats(durin).get('dmg_burst_periodic_special');
        expect(specialBefore).toBeCloseTo(0.30, 8);
        const atkBefore = totalAtk(finalStats(durin));
        holder.setWeaponSettings({weapon_desert_pavilion: true});
        const atkAfter = totalAtk(finalStats(durin));
        expect(atkAfter - atkBefore).toBeCloseTo(R1_PARTY * 1000, 4);
        // The total read counts the extra ATK one to one at that rate.
        expect(finalStats(durin).get('dmg_burst_periodic_special') - specialBefore)
            .toBeCloseTo(0.0003 * (atkAfter - atkBefore), 8);
    });
});
