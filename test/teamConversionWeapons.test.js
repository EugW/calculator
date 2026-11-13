import { CalcObjectBuffs } from "../src/js/classes/CalcObject/Buffs";
import { LEGACY_BUFF_CONDITIONS } from "../src/js/classes/Legacy/Buffs";
import { DB } from "../src/js/db/DB";
import { Team } from "../src/js/classes/Team";
import { ensureTestGlobals, makeBaseBuild } from "./support/baseline";
import { CONVERTED_WEAPONS as CONVERTED } from "./support/convertedBuffs";
import { buffScenarios, checkConversion, equipWeapon, matchCarrierTotals } from "./support/teamConversion";
import { stackKeys } from "./support/team";

ensureTestGlobals();

// Party weapon buffs converted to effects delivered by the weapon itself:
// each row of CONVERTED replaces a recorded `weapon_other.*` scenario per
// receiver, here with a carrier teammate holding the weapon.
describe.each(CONVERTED)("$condition", (item) => {
    const scenarios = buffScenarios(item.condition);

    test("has recorded scenarios", () => {
        expect(scenarios.length).toBeGreaterThan(0);
    });

    test.each(scenarios)("%s", (scenario) => {
        const result = checkConversion({
            file: 'buffs.json',
            scenario: scenario,
            weaponType: item.type,
            equip: equipWeapon(item.type, item.weapon, item.refine),
            switchOn: (carrier, receiver) => carrier.setWeaponSettings({
                ...item.on,
                ...(item.receiverSetting ? {[item.receiverSetting]: receiver.char.getId()} : {}),
            }),
            carrierTotals: item.carrierTotals,
            ignoreStats: item.ignoreStats,
            corrections: item.corrections,
        });
        expect(result.mismatches).toEqual([]);
    });
});

test("saved data with retired buff IDs still decodes", () => {
    const ids = [13, 14, 15, 16, 18, 19, 27, 28, 29, 30, 31, 32, 33, 34,
        35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 52,
        55, 56, 57, 58, 59, 61, 62, 63, 65, 66, 67, 74, 75, 76, 77];
    const retired = LEGACY_BUFF_CONDITIONS.filter((cond) => ids.includes(cond.getId()));

    expect(retired.length).toBe(ids.length);

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

test("Millennial Movement: only the ATK% part is shared between different weapons", () => {
    // The example in md/team_refactor.md: Elegy for the End R5 and Song of
    // Broken Pines R1. The incoming Pines yields the shared ATK% part; Elegy's
    // EM and Pines' Normal ATK SPD both apply.
    const receiver = makeBaseBuild('Hutao', 0);
    const elegy = makeBaseBuild('Venti', 0);
    equipWeapon('bow', 'ElegyfortheEnd', 5)(elegy);
    elegy.setWeaponSettings({weapon_elegy_for_the_end: true});
    const pines = makeBaseBuild('Eula', 0);
    equipWeapon('claymore', 'SongofBrokenPines', 1)(pines);
    pines.setWeaponSettings({weapon_song_of_broken_pines: true});

    const team = Team.fromMember(receiver);
    const base = receiver.getBuildData().stats;
    team.setMember(1, elegy);
    team.setMember(2, pines);
    expect(stackKeys(team)).toEqual(['millennial_movement_atk']);

    let stats = receiver.getBuildData().stats;
    expect(stats.get('atk_percent') - base.get('atk_percent')).toBeCloseTo(0.4, 10);
    expect(stats.get('mastery') - base.get('mastery')).toBeCloseTo(200, 10);
    expect(stats.get('atk_speed_normal') - base.get('atk_speed_normal')).toBeCloseTo(0.12, 10);

    // Pines triggered later: its lower ATK% replaces Elegy's.
    team.setStackSource('millennial_movement_atk', pines);
    stats = receiver.getBuildData().stats;
    expect(stats.get('atk_percent') - base.get('atk_percent')).toBeCloseTo(0.2, 10);
    expect(stats.get('mastery') - base.get('mastery')).toBeCloseTo(200, 10);
});

test("Hymn of the Maelstrom gives the team ATK from its holder's HP", () => {
    // The recorded party scenarios never set the holder HP and the mode
    // together, so the check against them is trivial; this checks the value.
    // R5, 3 stacks, Hymn mode, holder at 60,000 HP: per stack
    // min(16%, (60000 - 40000) / 1000 * 0.8%) = 16%, so 48% in total.
    const receiver = makeBaseBuild('Hutao', 0);
    const holder = makeBaseBuild('Nahida', 0);
    equipWeapon('catalyst', 'HymnofTheMaelstrom', 5)(holder);
    holder.setWeaponSettings({
        weapon_hymn_of_the_maelstrom_mode: 'hymn',
        weapon_hymn_of_the_maelstrom_stacks: 3,
    });

    const team = Team.fromMember(receiver);
    const base = receiver.getBuildData();
    base.applyPostEffects();

    team.setMember(1, holder);
    matchCarrierTotals(holder, {hp_total: 60000});

    const data = receiver.getBuildData();
    data.applyPostEffects();
    expect(data.stats.get('atk_percent') - base.stats.get('atk_percent')).toBeCloseTo(0.48, 10);
});
