import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild } from "./support/team";

global.DB = DB;

const AP = 'other.nicole_arcane_projection';
const UNITY = 'other.nicole_arcane_projection_unity';

/** Set a member's total ATK before Nicole's buffs exactly. */
function setAtk(member, total) {
    member.modifyBuffsSettings({'custom_buffs.atk': 0});
    // The member's own pass: before any teammate's effects.
    const stats = member.team.evaluate().resolve(member).stats;
    const current = stats.get('atk_base') * (1 + stats.get('atk_percent') / 100) + stats.get('atk');
    member.modifyBuffsSettings({'custom_buffs.atk': total - current});
}

function feature(member, name) {
    return member.getFeatures(member.getBuildData())[name];
}

function setup(receiverKey = 'Fischl') {
    const receiver = makeBuild(receiverKey);
    const nicole = makeBuild('Nicole');
    const team = Team.fromMember(receiver);
    team.setMember(1, nicole);
    team.enemy.set(null);
    team.enemy.setResistances({electro: 0, pyro: 0, hydro: 0});
    return {team, receiver, nicole};
}

test("Arcane Projection is the receiver's damage at Nicole's burst level", () => {
    const {team, receiver, nicole} = setup();
    const standalone = Team.solo(makeBuild('Fischl'));
    expect(standalone.getFeaturesHash()[AP]).toBeUndefined();
    expect(Object.keys(receiver.getFeaturesHash())).toContain(AP);
    expect(receiver.getFeatureByName(AP).getElement(receiver.getBuildData())).toBe('electro');

    setAtk(receiver, 1000);
    const low = feature(receiver, AP).normal;
    setAtk(receiver, 2000);
    expect(feature(receiver, AP).normal).toBeCloseTo(low * 2, 6);

    // Nicole's burst talent, including her C5 bonus, sets the multiplier.
    const table = DB.Chars.get('Nicole').talents.get('burst.nicole_arcane_projection');
    const level10 = feature(receiver, AP).normal;
    nicole.setCharLevels({level: 90, ascension: 6, constellation: 5});
    expect(feature(receiver, AP).normal).toBeCloseTo(level10 * table.getValue(13) / table.getValue(10), 6);
    receiver.setCharSkills({attack: 10, elemental: 10, burst: 1});
    expect(feature(receiver, AP).normal).toBeCloseTo(level10 * table.getValue(13) / table.getValue(10), 6);

    team.removeMember(1);
    expect(receiver.getFeaturesHash()[AP]).toBeUndefined();
});

test("Arcane Projection: Unity needs Nicole's C1 and scales on the receiver's ATK", () => {
    const {receiver, nicole} = setup();
    expect(receiver.getFeaturesHash(receiver.getBuildData())[UNITY]).toBeUndefined();

    nicole.setCharLevels({level: 90, ascension: 6, constellation: 1});
    setAtk(receiver, 1000);
    const low = feature(receiver, UNITY).normal;
    setAtk(receiver, 3000);
    expect(feature(receiver, UNITY).normal).toBeCloseTo(low * 3, 6);
});

test("Secret Rite adds 300% of Nicole's live ATK to Hexerei receivers' Arcane Projections", () => {
    const {receiver, nicole} = setup();
    nicole.setCharSettings({nicole_witch_homework: true});
    setAtk(receiver, 1000);
    const base = feature(receiver, AP).normal;

    // One Hexerei member is not a Secret Rite.
    setAtk(nicole, 1000);
    expect(feature(receiver, AP).normal).toBeCloseTo(base, 6);

    receiver.setCharSettings({fischl_witch_homework: true});
    const at1000 = feature(receiver, AP).normal - base;
    setAtk(nicole, 2000);
    const at2000 = feature(receiver, AP).normal - base;
    expect(at1000).toBeGreaterThan(0);
    expect(at2000).toBeCloseTo(at1000 * 2, 6);
});

test("Pathfinder's Blessing adds 70% of Nicole's live ATK to the receiver's attacks", () => {
    const {receiver, nicole} = setup();
    nicole.setCharLevels({level: 90, ascension: 6, constellation: 4});
    const hit = () => feature(receiver, 'attack.normal_hit_1').normal;
    // Nicole's ATK also changes her Grace bonus, so compare at each ATK.
    const blessing = (nicoleAtk) => {
        setAtk(nicole, nicoleAtk);
        nicole.setCharSettings({nicole_grace_of_kenosis: 'guidance'});
        const without = hit();
        nicole.setCharSettings({
            nicole_grace_of_kenosis: 'guidance',
            nicole_whether_left_or_right_no_matter_which_way_you_turn: true,
        });
        return hit() - without;
    };
    const nicoleAtk = () => finalStats(nicole).getTotalPercent('atk');

    // Proportional to Nicole's final ATK, which includes her own Guidance,
    // C2 and Grace bonuses.
    const at1000 = blessing(1000) / nicoleAtk();
    expect(at1000).toBeGreaterThan(0);
    expect(blessing(2000) / nicoleAtk()).toBeCloseTo(at1000, 9);

    nicole.setCharLevels({level: 90, ascension: 6, constellation: 3});
    expect(blessing(1000)).toBeCloseTo(0, 6);
});

test("Grace of Kenosis scales on Nicole's live ATK and skill level, C3 included", () => {
    const {receiver, nicole} = setup();
    const ratio = (level) => DB.Chars.get('Nicole').talents.get('skill.nicole_grace_of_kenosis_atk_bonus_ratio').getValue(level) / 100;
    const atk = () => finalStats(receiver).get('atk');
    const base = atk();
    nicole.setCharSkills({attack: 10, elemental: 1, burst: 10});
    nicole.setCharSettings({nicole_grace_of_kenosis: 'grace'});
    setAtk(nicole, 1000);
    expect(atk() - base).toBeCloseTo(1000 * ratio(1), 6);
    setAtk(nicole, 1500);
    expect(atk() - base).toBeCloseTo(1500 * ratio(1), 6);

    // C2 adds 300 ATK to every member, Nicole too, outside the Grace cap.
    nicole.setCharLevels({level: 90, ascension: 6, constellation: 2});
    expect(atk() - base).toBeCloseTo(300 + 1800 * ratio(1), 6);
    nicole.setCharLevels({level: 90, ascension: 6, constellation: 3});
    expect(atk() - base).toBeCloseTo(300 + 1800 * ratio(4), 6);
});

test("teammates keep Guidance of Theosis only on-field until C6; Nicole always", () => {
    const {team, receiver, nicole} = setup();
    const atk = (member) => finalStats(member).get('atk');
    nicole.setCharSettings({nicole_grace_of_kenosis: 'guidance'});
    const onField = atk(receiver);
    const nicoleOffField = atk(nicole);

    // The Grace bonus is the same either way; only Guidance's +300 differs.
    team.setOnFieldMember(nicole);
    expect(onField - atk(receiver)).toBeCloseTo(300, 6);
    expect(atk(nicole)).toBeCloseTo(nicoleOffField, 6);

    nicole.setCharLevels({level: 90, ascension: 6, constellation: 6});
    const c6OffField = atk(receiver);
    team.setOnFieldMember(receiver);
    expect(atk(receiver)).toBeCloseTo(c6OffField, 6);
});

test("C2 shreds the RES of each Guidance holder's element for the whole team", () => {
    const {team, receiver, nicole} = setup();
    const xingqiu = makeBuild('Xingqiu');
    team.setMember(2, xingqiu);
    nicole.setCharLevels({level: 90, ascension: 6, constellation: 2});
    const shred = (member) => {
        nicole.setCharSettings({nicole_grace_of_kenosis: 'grace'});
        const before = finalStats(member);
        nicole.setCharSettings({nicole_grace_of_kenosis: 'guidance'});
        const after = finalStats(member);
        return ['pyro', 'electro', 'hydro'].map((element) => {
            const stat = 'enemy__res_' + element;
            return after.get(stat) - before.get(stat);
        });
    };

    // Holders: Nicole (Pyro) and the on-field Fischl (Electro).
    expect(shred(receiver)).toEqual([-0.25, -0.25, 0]);
    expect(shred(xingqiu)).toEqual([-0.25, -0.25, 0]);
    expect(shred(nicole)).toEqual([-0.25, -0.25, 0]);

    team.setOnFieldMember(xingqiu);
    expect(shred(receiver)).toEqual([-0.25, 0, -0.25]);

    nicole.setCharLevels({level: 90, ascension: 6, constellation: 6});
    expect(shred(receiver)).toEqual([-0.25, -0.25, -0.25]);
});

test("off-field Nicole's controls survive a team save and keep delivering", () => {
    const {team, receiver, nicole} = setup();
    nicole.setCharLevels({level: 90, ascension: 6, constellation: 4});
    nicole.setCharSettings({
        nicole_grace_of_kenosis: 'guidance',
        nicole_whether_left_or_right_no_matter_which_way_you_turn: true,
    });
    const hit = feature(receiver, 'attack.normal_hit_1').normal;
    const projection = feature(receiver, AP).normal;

    const loaded = Team.deserialize(team.serialize());
    const copy = loaded.getMember(0);
    expect(loaded.getOnFieldMember()).toBe(copy);
    expect(feature(copy, 'attack.normal_hit_1').normal).toBeCloseTo(hit, 6);
    expect(feature(copy, AP).normal).toBeCloseTo(projection, 6);

    const clone = receiver.clone();
    expect(feature(clone, AP).normal).toBeCloseTo(projection, 6);
});
