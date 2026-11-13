import { setControlsOff } from "../src/js/classes/ArtifactSetProfile";
import { Team } from "../src/js/classes/Team";
import { FLOATING_ID_BASE, FloatingSet, FloatingWeapon } from "../src/js/classes/Team/Legacy";
import { ensureTestGlobals, makeBaseBuild } from "./support/baseline";
import { CONVERTED_SETS, CONVERTED_WEAPONS } from "./support/convertedBuffs";
import { finalStats, pinStats, stackKeys, stackSource, totalMastery } from "./support/team";
import { buffScenarios, checkFloating, equipSet, equipWeapon } from "./support/teamConversion";

ensureTestGlobals();

// The legacy source (Team/Legacy): a weapon or a set with no wielder in the
// team delivers the same declarations as on a member. The recorded party
// buff scenarios of the old model (`weapon_other.*`, `set_other.*`) are
// replayed with the item as a floating entry.

const STATED = {hp_total: 'hp', atk_total: 'atk', def_total: 'def', mastery_total: 'mastery'};

function floatingWeapon(team, type, key, refine, settings, stated) {
    const entry = team.legacy.add(new FloatingWeapon(DB.Weapons.get(type).get(key), refine));
    entry.setSettings(settings || {});
    for (const [kind, value] of Object.entries(stated || {})) {
        entry.setStated(kind, value);
    }
    return entry;
}

function floatingSet(team, set, settings) {
    const entry = team.legacy.add(new FloatingSet(set));
    // Only the given controls on: a new entry starts with every control on.
    entry.setSettings(Object.assign(setControlsOff(set), settings));
    return entry;
}

describe.each(CONVERTED_WEAPONS)("floating $weapon: $condition", (item) => {
    test.each(buffScenarios(item.condition))("%s", (scenario) => {
        const result = checkFloating({
            scenario: scenario,
            add: (team, receiver) => floatingWeapon(team, item.type, item.weapon, item.refine, {
                ...item.on,
                ...(item.receiverSetting ? {[item.receiverSetting]: receiver.char.getId()} : {}),
            }, Object.fromEntries(Object.entries(item.carrierTotals || {}).map(([total, value]) => [STATED[total], value]))),
            ignoreStats: item.ignoreStats,
            corrections: item.corrections,
        });
        expect(result.mismatches).toEqual([]);
    });
});

describe.each(CONVERTED_SETS)("floating $set: $condition", (item) => {
    test.each(buffScenarios(item.condition))("%s", (scenario) => {
        const result = checkFloating({
            scenario: scenario,
            add: (team) => floatingSet(team, item.set, item.on),
        });
        expect(result.mismatches).toEqual([]);
    });
});

describe("a floating entry is a source and nothing else", () => {
    test("it is no member: no slot, no composition, no receiver", () => {
        const receiver = makeBaseBuild('Hutao', 0);
        const team = Team.fromMember(receiver);
        const alone = receiver.getBuildData().settings.party_size;
        const entry = floatingSet(team, 'NoblesseOblige', {'set.noblesse_oblige_4': true});

        expect(team.getMembers()).toEqual([receiver]);
        expect(team.getSources()).toEqual([receiver, entry]);
        expect(entry.getSourceId()).toBe(FLOATING_ID_BASE + 1);
        expect(receiver.getBuildData().settings.party_size).toBe(alone);
        expect(team.view().evaluation().getMembers()).toEqual([receiver]);
    });

    test("a wielder's stat is what the entry states, and nothing else moves it", () => {
        // Key of Khaj-Nisut R1: 0.2% of the wielder's Max HP as EM for the team.
        const receiver = makeBaseBuild('Hutao', 0);
        const team = Team.fromMember(receiver);
        const base = totalMastery(finalStats(receiver));

        const entry = floatingWeapon(team, 'sword', 'KeyofKhajNisut', 1, {weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(receiver)) - base).toBeCloseTo(0, 9);
        expect([...entry.statsRead()]).toEqual(['hp']);

        entry.setStated('hp', 40000);
        expect(totalMastery(finalStats(receiver)) - base).toBeCloseTo(80, 6);

        // The weapon's own HP% and the party's effects do not reach it.
        team.modifySettings({'buffs.resonance_hydro': true});
        expect(totalMastery(finalStats(receiver)) - base).toBeCloseTo(80, 6);
    });

    test("the same weapon on a member and floating counts once, the member's by default", () => {
        const receiver = makeBaseBuild('Hutao', 0);
        const holder = makeBaseBuild('Kaeya', 0);
        equipWeapon('sword', 'KeyofKhajNisut', 1)(holder);
        holder.setWeaponSettings({weapon_key_of_khaj_nisut: 3});

        const team = Team.fromMember(receiver);
        const base = totalMastery(finalStats(receiver));
        team.setMember(1, holder);
        pinStats([[holder, 'hp', 30000]]);
        const entry = floatingWeapon(team, 'sword', 'KeyofKhajNisut', 1, {weapon_key_of_khaj_nisut: 3}, {hp: 40000});

        expect(stackKeys(team)).toEqual(['key_of_khaj_nisut']);
        expect(stackSource(team, 'key_of_khaj_nisut')).toBe(holder);
        expect(totalMastery(finalStats(receiver)) - base).toBeCloseTo(60, 6);

        team.setStackSource('key_of_khaj_nisut', entry);
        expect(team.stackChoices.key_of_khaj_nisut).toBe(entry.getSourceId());
        expect(totalMastery(finalStats(receiver)) - base).toBeCloseTo(80, 6);

        team.setStackSource('key_of_khaj_nisut', null);
        expect(totalMastery(finalStats(receiver)) - base).toBeCloseTo(0, 6);
    });

    test("two floating copies stack only where the game's buff does", () => {
        const receiver = makeBaseBuild('Hutao', 0);
        const team = Team.fromMember(receiver);
        const recharge = () => finalStats(receiver).get('recharge');
        const base = recharge();

        floatingWeapon(team, 'sword', 'XiphosMoonlight', 1, {whisper_of_the_jinn: true}, {mastery: 1000});
        const one = recharge() - base;
        expect(one).toBeGreaterThan(0);
        floatingWeapon(team, 'sword', 'XiphosMoonlight', 1, {whisper_of_the_jinn: true}, {mastery: 500});
        expect(recharge() - base).toBeCloseTo(one * 1.5, 9);
        expect(stackKeys(team)).toEqual([]);

        const first = floatingSet(team, 'NoblesseOblige', {'set.noblesse_oblige_4': true});
        const atk = finalStats(receiver).get('atk_percent');
        floatingSet(team, 'NoblesseOblige', {'set.noblesse_oblige_4': true});
        expect(finalStats(receiver).get('atk_percent')).toBeCloseTo(atk, 9);
        expect(stackSource(team, 'noblesse_oblige_4')).toBe(first);
    });

    test("a control of an entry can differ per receiving member, and the value is saved", () => {
        const receiver = makeBaseBuild('Hutao', 0);
        const mate = makeBaseBuild('Xingqiu', 0);
        const team = Team.fromMember(receiver);
        team.setMember(1, mate);
        const atk = (member) => finalStats(member).get('atk_percent');
        const base = [atk(receiver), atk(mate)];

        const entry = floatingSet(team, 'NoblesseOblige', {'set.noblesse_oblige_4': true});
        expect(atk(receiver) - base[0]).toBeCloseTo(0.2, 9);
        expect(atk(mate) - base[1]).toBeCloseTo(0.2, 9);

        team.setConditionValue(entry.getSourceId(), mate.char.getId(), 'set.noblesse_oblige_4', false);
        expect(atk(receiver) - base[0]).toBeCloseTo(0.2, 9);
        expect(atk(mate) - base[1]).toBeCloseTo(0, 9);

        const copy = Team.deserialize(team.serialize());
        expect(copy.conditionValues).toEqual(team.conditionValues);
        expect(atk(copy.getMember(1)) - base[1]).toBeCloseTo(0, 9);

        team.setConditionValue(entry.getSourceId(), mate.char.getId(), 'set.noblesse_oblige_4', null);
        expect(atk(mate) - base[1]).toBeCloseTo(0.2, 9);
        expect(() => team.setConditionValue(12345, mate.char.getId(), 'set.noblesse_oblige_4', false)).toThrow();
    });

    test("an enemy debuff of a floating set counts once", () => {
        const receiver = makeBaseBuild('Hutao', 0);
        const mate = makeBaseBuild('Xingqiu', 0);
        const team = Team.fromMember(receiver);
        team.setMember(1, mate);
        const res = (member) => finalStats(member).get('enemy__res_pyro');
        const base = res(receiver);

        floatingSet(team, 'ViridescentVenerer', {'set.viridescent_venerer_4': 'pyro'});
        expect(res(receiver) - base).toBeCloseTo(-0.4, 9);
        expect(res(mate) - base).toBeCloseTo(-0.4, 9);
    });

    test("a wearer's element can be stated; without one the wearer is taken to match", () => {
        const receiver = makeBaseBuild('Hutao', 0);
        const team = Team.fromMember(receiver);
        const res = () => finalStats(receiver).get('enemy__res_pyro');
        const base = res();

        const entry = floatingSet(team, 'ViridescentVenerer', {'set.viridescent_venerer_4': 'pyro'});
        expect(res() - base).toBeCloseTo(-0.4, 9);
        entry.setElement('geo');
        expect(res() - base).toBeCloseTo(0, 9);
        entry.setElement('anemo');
        expect(res() - base).toBeCloseTo(-0.4, 9);
    });
});

describe("the legacy source is saved with its team", () => {
    function makeTeam() {
        const receiver = makeBaseBuild('Hutao', 0);
        const team = Team.fromMember(receiver);
        const key = floatingWeapon(team, 'sword', 'KeyofKhajNisut', 3, {weapon_key_of_khaj_nisut: 3}, {hp: 41234});
        const xiphos = floatingWeapon(team, 'sword', 'XiphosMoonlight', 5, {whisper_of_the_jinn: true}, {mastery: 987});
        const venerer = floatingSet(team, 'ViridescentVenerer', {'set.viridescent_venerer_4': 'pyro;hydro'});
        venerer.setElement('anemo');
        const noblesse = floatingSet(team, 'NoblesseOblige', {'set.noblesse_oblige_4': true});
        return {team, receiver, key, xiphos, venerer, noblesse};
    }

    test("a round trip keeps every entry, its controls, stated stats and uid", () => {
        const {team, receiver} = makeTeam();
        const copy = Team.deserialize(team.serialize());

        expect(copy).not.toBeNull();
        expect(copy.legacy.getEntries().map((entry) => [entry.kind, entry.uid, entry.getName()]))
            .toEqual(team.legacy.getEntries().map((entry) => [entry.kind, entry.uid, entry.getName()]));
        expect(copy.legacy.getEntries().map((entry) => entry.getSettings()))
            .toEqual(team.legacy.getEntries().map((entry) => entry.getSettings()));
        expect(copy.legacy.getEntries()[0].getRefine()).toBe(3);
        expect(copy.legacy.getEntries()[2].element).toBe('anemo');
        expect({...finalStats(copy.getMember(0))}).toEqual({...finalStats(receiver)});
        expect(copy.serialize()).toEqual(team.serialize());
    });

    test("a removed entry's uid is not given to the next one while a later entry holds a higher one", () => {
        const {team, key, noblesse} = makeTeam();
        team.legacy.remove(key);
        const added = team.legacy.add(new FloatingSet('Instructor'));
        expect(added.uid).toBe(noblesse.uid + 1);
    });

    test("team copies carry the legacy source: clones, worker transport", () => {
        const {team, receiver} = makeTeam();
        const expected = {...finalStats(receiver)};

        const clone = team.clone();
        expect(clone.legacy).not.toBe(team.legacy);
        expect({...finalStats(clone.getMember(0))}).toEqual(expected);
        expect({...finalStats(team.cloneWithArtifactSettings().getMember(0))}).toEqual(expected);

        clone.legacy.getEntries()[0].setStated('hp', 1);
        expect({...finalStats(receiver)}).toEqual(expected);
    });

    test("invalid legacy data is rejected", () => {
        const {team} = makeTeam();
        const data = team.serialize();
        const legacy = team.legacy.serialize();
        const start = data.length - team.getRotation().serialize().length - legacy.length;
        expect(data.slice(start, start + legacy.length)).toEqual(legacy);

        const broken = (change) => {
            const copy = data.slice();
            change(copy);
            return Team.deserialize(copy);
        };
        expect(broken((copy) => { copy[start + 1] = 9; })).toBeNull();
        expect(broken((copy) => { copy[start + 2] = 0; })).toBeNull();
        expect(broken((copy) => { copy[start + 3] = 999999; })).toBeNull();
    });
});

describe("carrier and floating forms agree", () => {
    test("Noblesse Oblige from a teammate and floating give the receiver the same ATK", () => {
        const withCarrier = makeBaseBuild('Hutao', 0);
        const carrier = makeBaseBuild('Xingqiu', 0);
        equipSet('NoblesseOblige', 4)(carrier);
        carrier.setArtifactsSettings({'set.noblesse_oblige_4': true});
        Team.fromMember(withCarrier).setMember(1, carrier);

        const withEntry = makeBaseBuild('Hutao', 0);
        const team = Team.fromMember(withEntry);
        team.setMember(1, makeBaseBuild('Xingqiu', 0));
        floatingSet(team, 'NoblesseOblige', {'set.noblesse_oblige_4': true});

        expect(finalStats(withEntry).get('atk_percent')).toBeCloseTo(finalStats(withCarrier).get('atk_percent'), 12);
    });
});
