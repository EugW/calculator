import { ConditionDropdownTeamMember } from "../src/js/classes/Condition/Dropdown/TeamMember";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { equipWeapon } from "./support/teamConversion";
import { finalStats, makeBuild, offField, stackSource } from "./support/team";

global.DB = DB;
const targetSetting = 'weapon_thrilling_tales_receiver';

function setup() {
    const first = makeBuild('Barbara');
    const second = makeBuild('Kokomi');
    const nicole = makeBuild('Nicole');
    const active = makeBuild('Ayaka');
    equipWeapon('catalyst', 'ThrillingTales', 5)(first);
    equipWeapon('catalyst', 'ThrillingTales', 1)(second);
    const team = Team.fromMember(first);
    [second, nicole, active].forEach((member, i) => team.setMember(i + 1, member));
    team.setOnFieldMember(active);
    const baseline = team.getMembers().map((member) => finalStats(member).get('atk_percent'));
    return {team, first, second, nicole, active, baseline};
}

function direct(holder, receiver) {
    holder.setWeaponSettings({weapon_thrilling_tales: true, [targetSetting]: receiver.char.getId()});
}

test("two TTDS holders buff different recipients, including off-field Nicole", () => {
    const {team, first, second, nicole, active, baseline} = setup();
    direct(first, nicole);
    direct(second, active);
    const gains = () => team.getMembers().map((member, i) => finalStats(member).get('atk_percent') - baseline[i]);
    gains().forEach((value, i) => expect(value).toBeCloseTo([0, 0, 0.48, 0.24][i], 10));
    expect(team.stackSources().getConflicts()).toEqual([]);
    team.setOnFieldMember(first);
    gains().forEach((value, i) => expect(value).toBeCloseTo([0, 0, 0.48, 0.24][i], 10));
    expect(offField(nicole)).toBe(true);
});

test("same-recipient conflicts choose a source without suppressing a later different target", () => {
    const {team, first, second, nicole, active, baseline} = setup();
    direct(first, nicole);
    direct(second, nicole);
    // The earliest slot supplies it.
    expect(stackSource(team, 'thrilling_tales', nicole)).toBe(first);
    expect(finalStats(nicole).get('atk_percent') - baseline[2]).toBeCloseTo(0.48, 10);
    expect(() => team.setStackSource('thrilling_tales', first)).toThrow(/recipient/);
    team.setStackSource('thrilling_tales', second, nicole);
    expect(finalStats(nicole).get('atk_percent') - baseline[2]).toBeCloseTo(0.24, 10);
    // The chosen source targets another member: the other source supplies Nicole.
    direct(second, active);
    expect(finalStats(active).get('atk_percent') - baseline[3]).toBeCloseTo(0.24, 10);
    expect(finalStats(nicole).get('atk_percent') - baseline[2]).toBeCloseTo(0.48, 10);
});

test("a conflict is resolved the same way whichever member is read", () => {
    const {team, first, second, nicole, baseline} = setup();
    direct(first, nicole);
    direct(second, nicole);
    const evaluation = team.evaluate();
    expect(() => evaluation.member(first).programData()).not.toThrow();
    expect(() => evaluation.member(second).programData()).not.toThrow();
    expect(finalStats(nicole).get('atk_percent') - baseline[2]).toBeCloseTo(0.48, 10);
});

test("target, field selection and recipient-specific choices survive saves and copies", () => {
    const {team, first, second, nicole, active} = setup();
    direct(first, nicole);
    direct(second, nicole);
    team.setStackSource('thrilling_tales', second, nicole);
    for (const copy of [team.clone(), team.cloneWithArtifactSettings(), Team.deserialize(team.serialize())]) {
        expect(copy).not.toBeNull();
        expect(Number(copy.getMember(0).getSettings()[targetSetting])).toBe(nicole.char.getId());
        expect(copy.getMember(0).getSettings().weapon_thrilling_tales).toBe(true);
        expect(stackSource(copy, 'thrilling_tales', copy.getMember(2))).toBe(copy.getMember(1));
        expect(copy.getOnFieldMember().char.getId()).toBe(active.char.getId());
        expect(finalStats(copy.getMember(2)).get('atk_percent')).toBe(finalStats(nicole).get('atk_percent'));
        copy.setStackSource('thrilling_tales', copy.getMember(0), copy.getMember(2));
        expect(stackSource(team, 'thrilling_tales', nicole)).toBe(second);
    }
});

test("the selector lists teammates; no selection or a self-selection delivers nothing", () => {
    const {team, first, nicole, baseline} = setup();
    const control = first.weapon.getConditions().find((item) => item instanceof ConditionDropdownTeamMember);
    expect(control.getDropdownItems(first.getBuildData().settings).map((item) => Number(item.value)))
        .toEqual(team.getMembers().slice(1).map((member) => member.char.getId()));
    first.setWeaponSettings({weapon_thrilling_tales: true});
    expect(finalStats(nicole).get('atk_percent')).toBe(baseline[2]);
    direct(first, first);
    // Kept, like a choice of a character who is away: it chooses nobody.
    expect(control.getSelectedItems(first.getBuildData().settings)).toEqual([]);
    expect(finalStats(first).get('atk_percent')).toBe(baseline[0]);
});

test("a target follows slot reordering and is kept while the character is away", () => {
    const {team, first, nicole, baseline} = setup();
    direct(first, nicole);
    team.swapMembers(2, 3);
    expect(finalStats(nicole).get('atk_percent') - baseline[2]).toBeCloseTo(0.48, 10);
    team.removeMember(3);
    expect(Number(first.getSettings()[targetSetting])).toBe(nicole.char.getId());
    team.setMember(3, nicole);
    expect(finalStats(nicole).get('atk_percent') - baseline[2]).toBeCloseTo(0.48, 10);
    // Another character in the slot: the target chooses nobody.
    nicole.setChar(DB.Chars.get('Lisa'));
    expect(Number(first.getSettings()[targetSetting])).toBe(DB.Chars.get('Nicole').getId());
    expect(finalStats(nicole).get('atk_percent')).toBe(finalStats(Team.solo(nicole.characterBuild())).get('atk_percent'));
});

test("TTDS on off-field Nicole feeds her live ATK into Angelos's delivered bonus", () => {
    const {team, first, nicole, active} = setup();
    equipWeapon('catalyst', 'AngelosHeptades', 1)(nicole);
    nicole.setWeaponSettings({weapon_angelos_heptades: true});
    const atkBefore = finalStats(nicole).getTotalPercent('atk');
    const bonusBefore = finalStats(active).get('dmg_all');
    direct(first, nicole);
    const atkAfter = finalStats(nicole).getTotalPercent('atk');
    const expected = Math.min(0.26, atkAfter * 0.0001) - Math.min(0.26, atkBefore * 0.0001);
    expect(expected).toBeGreaterThan(0);
    expect(finalStats(active).get('dmg_all') - bonusBefore).toBeCloseTo(expected, 10);
    expect(team.getOnFieldMember()).toBe(active);
    direct(first, active);
    expect(finalStats(active).get('dmg_all')).toBeCloseTo(bonusBefore, 10);
});
