import { CalcObjectBuffs } from "../src/js/classes/CalcObject/Buffs";
import { LEGACY_BUFF_CONDITIONS } from "../src/js/classes/Legacy/Buffs";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { ensureTestGlobals, makeBaseBuild } from "./support/baseline";
import { CONVERTED_SETS as CONVERTED } from "./support/convertedBuffs";
import { buffScenarios, checkConversion, equipSet } from "./support/teamConversion";

ensureTestGlobals();

// Party set buffs converted to effects delivered by the sets themselves:
// each row of CONVERTED replaces a recorded `set_other.*` scenario per
// receiver, here with a carrier teammate wearing the set.
describe.each(CONVERTED)("$condition", (item) => {
    const scenarios = buffScenarios(item.condition);

    test("has recorded scenarios", () => {
        expect(scenarios.length).toBeGreaterThan(0);
    });

    test.each(scenarios)("%s", (scenario) => {
        const result = checkConversion({
            file: 'buffs.json',
            scenario: scenario,
            carrierFilter: item.carrierFilter,
            equip: equipSet(item.set, 4),
            switchOn: (carrier) => carrier.setArtifactsSettings(item.on),
        });
        expect(result.mismatches).toEqual([]);
    });
});

test("saved data with retired party set IDs still decodes", () => {
    const ids = [7, 8, 9, 10, 11, 12, 21, 50, 51, 53, 54, 60, 64, 68, 69, 72, 73];
    const retired = LEGACY_BUFF_CONDITIONS.filter((cond) => ids.includes(cond.getId()));

    expect(retired.length).toBe(17);

    for (const cond of retired) {
        const input = cond.getType() == 'checkbox'
            ? [1, cond.getId()]
            : [1, cond.getId(), 3];

        const buffs = CalcObjectBuffs.deserialize(input);
        expect(buffs).not.toBeNull();
        expect(input.length).toBe(0);
        expect(buffs.serialize(buffs.getSettings())).toEqual([0]);
    }
});

test("Song of Days Past gives the team flat DMG from the wearer's recorded healing", () => {
    // The recorded party scenarios switched the toggle and the healing input
    // separately, so this checks the delivered multiplier directly.
    const receiver = makeBaseBuild('Hutao', 0);
    const wearer = makeBaseBuild('Barbara', 0);
    equipSet('SongOfDaysPast', 4)(wearer);
    wearer.setArtifactsSettings({'set.song_of_days_past_4': true, days_past_healing_recorded: 15000});

    const team = Team.fromMember(receiver);
    team.setMember(1, wearer);

    const data = receiver.getBuildData();
    const delivered = data.multipliers.filter((item) => item.scaling == 'days_past_healing_recorded');
    expect(delivered.length).toBe(1);
    expect(delivered[0].getTree(data).execute(data)).toBeCloseTo(0.08 * 15000, 6);

    wearer.setArtifactsSettings({'set.song_of_days_past_4': false, days_past_healing_recorded: 15000});
    expect(receiver.getBuildData().multipliers.filter((item) => item.scaling == 'days_past_healing_recorded').length).toBe(0);
});
