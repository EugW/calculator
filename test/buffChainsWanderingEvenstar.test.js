import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { featureValues, finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Wandering Evenstar):
// - Self ATK from own EM reads premod EM (game: UNIQUE_Catalyst_Pleroma_Handler
//   reads FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY into MasteryCache;
//   Catalyst_Pleroma_Buff_Self writes Actor_AttackExtraDelta; affix 114416:
//   24/30/36/42/48%. GO: input.premod.eleMas into total atk) and writes extra
//   flat ATK. The default channels are confirmed: extra EM (Sucrose A4,
//   Nahida A1, Key of Khaj-Nisut) must not count; premod EM (Columbina C2)
//   must count. KQM Nahida: her A1 EM does not count for Evenstar.
// - Party share (30% of the wielder's buff to nearby members) reads the
//   wielder's premod EM (game: Catalyst_Pleroma_Buff_Other writes
//   Actor_AttackExtraDelta of MasteryCache x ratio x TeamInheritRatio 0.30;
//   GO: teamBuff total atk). It was missing from this file and added as
//   partyPost, mirroring MakhairaAquamarine. Same chaining: the holder's
//   extra EM must not reach the party, the holder's premod EM must.
// - The written ATK is extra, so premod ATK readers (Flins A4) must ignore it.
// - Display features (atk_bonus, atk_bonus_bonus) are display only.
// - Holder-alone numbers are unchanged: with no extra EM, premod EM is the
//   total, so the formula below is the old behavior too.
//
// A 4-member team is used throughout, except for the true-solo formula checks
// (a single member cannot trigger Elemental Resonance; our engine otherwise
// applies Resonance in smaller teams, md/buff_chains.md).

const WEAPON_OFF = {};
const WEAPON_ON = {weapon_desert_pavilion: true};

function holdEvenstar(charKey, refine = 1) {
    const build = makeBuild(charKey);
    build.setWeapon(DB.Weapons.get('catalyst').get('WanderingEvenstar'));
    build.setWeaponLevels({level: 90, ascension: 6, refine});
    return build;
}

function withConstellation(key, constellation) {
    const build = makeBuild(key);
    build.setCharLevels({level: 90, ascension: 6, constellation});
    return build;
}

function delta(member, apply) {
    const before = finalStats(member);
    apply();
    const after = finalStats(member);
    return (stat) => after.get(stat) - before.get(stat);
}

// Klee holds Evenstar alone: no teammate, so no extra EM anywhere.
function setupSolo(refine = 1) {
    const klee = holdEvenstar('Klee', refine);
    Team.fromMember(klee);
    matchCarrierTotals(klee, {mastery_total: 1000});
    return klee;
}

// Klee holds Evenstar; Sucrose's A4 is the extra-EM source, toggled.
function setupSucrose() {
    const klee = holdEvenstar('Klee');
    const sucrose = makeBuild('Sucrose');
    const aino = makeBuild('Aino');
    const team = Team.fromMember(klee);
    team.setMember(1, sucrose);
    team.setMember(2, aino);
    team.setMember(3, makeBuild('Bennet'));
    team.setOnFieldMember(klee);
    klee.setWeaponSettings(WEAPON_ON);
    matchCarrierTotals(klee, {mastery_total: 1000});
    matchCarrierTotals(sucrose, {mastery_total: 1000});
    return {team, klee, sucrose, aino};
}

// Klee (on field) holds Evenstar; Columbina C2 (dendro) is the premod-EM
// source: 0.35% of her HP as EM to the active character. Columbina's C2
// needs Moonsign: Ascendant Gleam (party_moonsign >= 2), so Aino, a fellow
// Nod-Krai member with no ATK/EM interplay, fills the team.
function setupColumbina() {
    const klee = holdEvenstar('Klee');
    const columbina = withConstellation('Columbina', 2);
    const aino = makeBuild('Aino');
    const team = Team.fromMember(klee);
    team.setMember(1, columbina);
    team.setMember(2, aino);
    team.setMember(3, makeBuild('Bennet'));
    team.setOnFieldMember(klee);
    klee.setWeaponSettings(WEAPON_ON);
    matchCarrierTotals(columbina, {hp_total: 30000});
    return {team, klee, columbina, aino};
}

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

const C2_ON = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'dendro',
};

// Klee holds Evenstar; Flins's A4 (premod ATK reader) checks the write side.
function setupFlins() {
    const klee = holdEvenstar('Klee');
    const flins = makeBuild('Flins');
    const team = Team.fromMember(klee);
    team.setMember(1, flins);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Bennet'));
    team.setOnFieldMember(klee);
    matchCarrierTotals(klee, {mastery_total: 1000});
    return {team, klee, flins};
}

describe("Wandering Evenstar formula (holder alone, R1 and R5)", () => {
    test("self ATK is 24% (R1) / 48% (R5) of premod EM", () => {
        for (const [refine, expected] of [[1, 240], [5, 480]]) {
            const klee = setupSolo(refine);
            klee.setWeaponSettings(WEAPON_OFF);
            // No extra EM alone, so premod EM is the 1000 total: the game
            // ratio applies to it directly.
            expect(delta(klee, () => klee.setWeaponSettings(WEAPON_ON))('atk')).toBeCloseTo(expected, 6);
            klee.setWeaponSettings(WEAPON_ON);
        }
    });

    test("display features show the self and party values", () => {
        const klee = setupSolo(1);
        klee.setWeaponSettings(WEAPON_ON);
        const features = featureValues(klee);
        // 24% of 1000 EM for the holder, 30% of that for the party.
        expect(features['weapon.atk_bonus'][0]).toBeCloseTo(240, 6);
        expect(features['weapon.atk_bonus_bonus'][0]).toBeCloseTo(72, 6);
    });
});

describe("Wandering Evenstar party share formula", () => {
    test("other members gain 30% of the holder's buff (R1 and R5)", () => {
        const {klee, aino} = setupSucrose();
        for (const [refine, expected] of [[1, 72], [5, 144]]) {
            klee.setWeaponLevels({level: 90, ascension: 6, refine});
            klee.setWeaponSettings(WEAPON_OFF);
            // 1000 premod EM x ratio x 0.30 from the game data.
            expect(delta(aino, () => klee.setWeaponSettings(WEAPON_ON))('atk')).toBeCloseTo(expected, 6);
            klee.setWeaponSettings(WEAPON_ON);
        }
    });
});

describe("Wandering Evenstar reads premod EM", () => {
    test("ignores Sucrose A4 extra EM, self and party", () => {
        const {klee, sucrose, aino} = setupSucrose();
        // Sucrose A4 shares 20% of her 1000 premod EM: +200 extra EM on Klee.
        expect(delta(klee, () => sucrose.setCharSettings({sucrose_mollis_favonius: true}))('mastery')).toBeCloseTo(200, 6);
        // The extra EM must not move the self buff (holder ATK) nor the
        // party buff (it reads the holder's premod EM, unchanged).
        const dKlee = delta(klee, () => sucrose.setCharSettings({}));
        const dAino = delta(aino, () => sucrose.setCharSettings({sucrose_mollis_favonius: true}));
        expect(dKlee('atk')).toBeCloseTo(0, 8);
        expect(dAino('atk')).toBeCloseTo(0, 8);
        sucrose.setCharSettings({});
    });

    test("counts Columbina C2 premod EM, self and party", () => {
        const {klee, columbina, aino} = setupColumbina();
        columbina.setCharSettings(C2_ON);
        // Columbina's C2 reads her live total HP (game: FIGHT_PROP_MAX_HP,
        // total; her own C2 +40% HP is active here, so this is more than
        // 0.35% of the matched 30000): 0.35% of it as premod EM on Klee.
        const hpOn = totalHp(finalStats(columbina));
        const emOn = totalMastery(finalStats(klee));
        const atkOn = finalStats(klee).get('atk');
        const partyOn = finalStats(aino).get('atk');
        columbina.setCharSettings({});
        const emDelta = emOn - totalMastery(finalStats(klee));
        expect(emDelta).toBeCloseTo(0.0035 * hpOn, 6);
        // R1 self: 24% of the premod EM; party: 30% of that (game formula).
        expect(atkOn - finalStats(klee).get('atk')).toBeCloseTo(0.24 * emDelta, 6);
        expect(partyOn - finalStats(aino).get('atk')).toBeCloseTo(0.24 * 0.3 * emDelta, 6);
        columbina.setCharSettings(C2_ON);
    });
});

describe("Wandering Evenstar writes extra ATK", () => {
    test("Flins A4 (premod ATK reader) ignores the party share", () => {
        const {klee, flins} = setupFlins();
        klee.setWeaponSettings(WEAPON_OFF);
        const emBefore = totalMastery(finalStats(flins));
        // R1 party share on 1000 holder EM: +72 total ATK on Flins, all extra.
        expect(delta(flins, () => klee.setWeaponSettings(WEAPON_ON))('atk')).toBeCloseTo(72, 6);
        klee.setWeaponSettings(WEAPON_ON);
        // His A4 reads premod ATK (8%, game: FIGHT_PROP_NONEXTRA_ATTACK), so
        // the extra ATK must not move his EM.
        expect(totalMastery(finalStats(flins)) - emBefore).toBeCloseTo(0, 8);
    });
});
