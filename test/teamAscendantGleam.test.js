import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { makeBaseBuild } from "./support/baseline";
import { finalStats, makeBuild } from "./support/team";
import { buffScenarios, matchCarrierTotals, recorded } from "./support/teamConversion";

global.DB = DB;

const SOURCE = 'ascendant_gleam_source';

/**
 * The receiver, the two Moonsign members of the recording (Ascendant Gleam)
 * and a non-Moonsign member the team chooses as the source.
 */
function setup(receiverKey, sourceKey, totals) {
    const receiver = makeBaseBuild(receiverKey, 0);
    const team = Team.fromMember(receiver);
    team.setMember(1, makeBuild('Ineffa'));
    team.setMember(2, makeBuild('Aino'));
    const source = makeBuild(sourceKey);
    team.setMember(3, source);
    team.modifySettings({[SOURCE]: source.char.getId()});
    matchCarrierTotals(source, totals);
    return {team, receiver, source};
}

/** Lunar Reaction DMG a member gains from the team's choice of source. */
function bonus(member) {
    const team = member.team;
    const chosen = team.getSettings()[SOURCE];
    const on = finalStats(member).get('dmg_reaction_lunar');
    team.modifySettings({[SOURCE]: 0});
    const off = finalStats(member);
    team.modifySettings({[SOURCE]: chosen});
    return on - off.get('dmg_reaction_lunar');
}

describe.each(buffScenarios('buffs.ascendant_gleam_buff'))("recorded %s", (id) => {
    test("the typed-in maximum is the capped bonus of a real member", () => {
        const scenario = recorded('buffs.json').scenarios[id];
        expect(scenario.inputs.party).toEqual(['Ineffa', 'Aino']);
        const typed = scenario.inputs.buffsSettings['buffs.ascendant_gleam_buff'];
        expect(typed).toBe(36);

        // 0.9% per 100 ATK: 5000 ATK would be 45%, capped at 36%.
        const {team, receiver} = setup(scenario.inputs.receiver, 'Bennet', {atk_total: 5000});
        expect(bonus(receiver)).toBeCloseTo(typed / 100, 10);

        // Only this stat changes on the receiver.
        const on = finalStats(receiver);
        team.modifySettings({[SOURCE]: 0});
        const off = finalStats(receiver);
        const changed = Object.keys(on).filter((key) => {
            return !/^m\d__/.test(key) && typeof on[key] == 'number' && Math.abs(on[key] - (off[key] || 0)) > 1e-9;
        });
        expect(changed).toEqual(['dmg_reaction_lunar']);
    });
});

test.each([
    ['Bennet', {atk_total: 2000}, 0.18],
    ['Xingqiu', {hp_total: 30000}, 0.18],
    ['Noelle', {def_total: 1500}, 0.15],
    ['Sucrose', {mastery_total: 800}, 0.18],
])("%s gives the party its element's stat-scaled bonus", (sourceKey, totals, expected) => {
    const {team} = setup('Hutao', sourceKey, totals);
    for (const member of team.getMembers()) {
        expect(bonus(member)).toBeCloseTo(expected, 10);
    }
});

test("the choice lists the non-Moonsign members during Ascendant Gleam", () => {
    const {team, receiver, source} = setup('Hutao', 'Bennet', {atk_total: 2000});
    const cond = DB.Buffs.get('ElementalResonance').getConditions().find((item) => item.getName() == SOURCE);
    const settings = receiver.view().getSettings();
    expect(cond.isHidden(settings)).toBe(false);
    expect(cond.getDropdownItems(settings).map((item) => Number(item.value)))
        .toEqual([receiver.char.getId(), source.char.getId()]);

    // A Moonsign member chosen anyway is not a source.
    team.modifySettings({[SOURCE]: team.getMember(1).char.getId()});
    expect(finalStats(receiver).get('dmg_reaction_lunar')).toBeCloseTo(0, 10);

    // One Moonsign member is Nascent Gleam only: no choice, no bonus.
    team.modifySettings({[SOURCE]: source.char.getId()});
    team.removeMember(2);
    expect(cond.isHidden(receiver.view().getSettings())).toBe(true);
    expect(bonus(receiver)).toBeCloseTo(0, 10);
});

test("choosing another member moves the bonus to its stats", () => {
    const {team, receiver} = setup('Hutao', 'Bennet', {atk_total: 2000});
    const hutaoAtk = finalStats(receiver).getTotalPercent('atk');

    team.modifySettings({[SOURCE]: receiver.char.getId()});
    expect(finalStats(receiver).get('dmg_reaction_lunar')).toBeCloseTo(Math.min(0.00009 * hutaoAtk, 0.36), 10);
    expect(team.stackSources().getConflicts()).toEqual([]);
});

test("the choice is team state: saved with the team, kept while the member is away", () => {
    const {team, receiver, source} = setup('Hutao', 'Bennet', {atk_total: 2000});
    team.setOnFieldMember(receiver);
    const loaded = Team.deserialize(team.serialize());
    expect(loaded.getSettings()[SOURCE]).toBe(source.char.getId());
    // Saved custom buffs are rounded; the fixture's fractional ATK is not exact.
    expect(finalStats(loaded.getMember(0)).get('dmg_reaction_lunar')).toBeCloseTo(0.18, 5);
    expect(loaded.getMember(3).serialize()).toEqual(source.serialize());

    team.removeMember(3);
    expect(team.getSettings()[SOURCE]).toBe(source.char.getId());
    expect(finalStats(team.getMember(0)).get('dmg_reaction_lunar')).toBe(0);
    team.setMember(3, source);
    expect(finalStats(team.getMember(0)).get('dmg_reaction_lunar')).toBeCloseTo(0.18, 5);
});

// md/buff_chains.md: the game copies the source's non-extra ATK, DEF and EM
// (TeamAbility_MoonPhase, FIGHT_PROP_NONEXTRA_*) and its Max HP. In game, with
// Bennett as the source at 1,998 ATK, a Lunar-Charged hit did 41,791 whether
// or not he stood in his own burst, and 40,338 with Fischl (1,273 ATK).
describe("the bonus reads the source's premod ATK and EM", () => {
    test("Bennett's own burst ATK (extra) does not count", () => {
        const {team, receiver, source} = setup('Hutao', 'Bennet', {atk_total: 1998});
        team.setOnFieldMember(source);
        expect(bonus(receiver)).toBeCloseTo(0.00009 * 1998, 10);

        source.setCharSettings({bennet_fantastic_voyage: true});
        // He stands in his own burst: his total ATK rises by the extra part.
        expect(finalStats(source).get('atk_extra')).toBeGreaterThan(100);
        expect(bonus(receiver)).toBeCloseTo(0.00009 * 1998, 10);
    });

    test("a lower-ATK source gives less: 1,273 ATK against 1,998", () => {
        const {receiver} = setup('Hutao', 'Fischl', {atk_total: 1273});
        expect(bonus(receiver)).toBeCloseTo(0.00009 * 1273, 10);
    });

    test("Ineffa's A4 EM (extra) on an Anemo source does not count", () => {
        const {team, receiver, source} = setup('Hutao', 'Sucrose', {mastery_total: 800});
        // Ineffa's A4 gives its EM to the on-field member.
        team.setOnFieldMember(source);
        expect(bonus(receiver)).toBeCloseTo(0.18, 10);

        team.getMember(1).setCharSettings({ineffa_panoramic_permutation_protocol: true});
        expect(finalStats(source).get('mastery_extra')).toBeGreaterThan(10);
        expect(bonus(receiver)).toBeCloseTo(0.18, 10);
    });
});
