import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { equipWeapon, matchCarrierTotals } from "./support/teamConversion";
import { finalStats, makeBuild, offField, stackSource } from "./support/team";

global.DB = DB;

function hexerei(charKey, on = true) {
    const member = makeBuild(charKey);
    member.setCharSettings({[member.char.get().name + '_witch_homework']: on});
    return member;
}

function effectGain(holder, toggle, members, stat) {
    holder.setWeaponSettings({[toggle]: false});
    const before = members.map((member) => finalStats(member).get(stat));
    holder.setWeaponSettings({[toggle]: true});
    return members.map((member, i) => finalStats(member).get(stat) - before[i]);
}

describe("Athame Artis", () => {
    test.each([1, 5])("R%i uses the holder's trigger and each recipient's field state", (refine) => {
        const holder = hexerei('Durin');
        const otherHexerei = hexerei('Venti');
        const active = makeBuild('Hutao');
        const off = makeBuild('Ayaka');
        equipWeapon('sword', 'AthameArtis', refine)(holder);
        const team = Team.fromMember(holder);
        [otherHexerei, active, off].forEach((member, i) => team.setMember(i + 1, member));
        team.setOnFieldMember(active);
        const members = [holder, otherHexerei, active, off];
        const own = refine == 1 ? 0.2 : 0.4;
        const others = refine == 1 ? 0.16 : 0.32;

        let gains = effectGain(holder, 'weapon_athame_artis', members, 'atk_percent');
        [own * 1.75, 0, others * 1.75, 0].forEach((expected, i) => {
            expect(gains[i]).toBeCloseTo(expected, 10);
        });

        otherHexerei.setCharSettings({venti_witch_homework: false});
        gains = effectGain(holder, 'weapon_athame_artis', members, 'atk_percent');
        [own, 0, others, 0].forEach((expected, i) => expect(gains[i]).toBeCloseTo(expected, 10));
    });
});

describe("Angelos Heptades", () => {
    function setup(refine, atk) {
        const holder = makeBuild('Nahida');
        const offHexerei = hexerei('Durin');
        const activeHexerei = hexerei('Venti');
        const ordinary = makeBuild('Ayaka');
        equipWeapon('catalyst', 'AngelosHeptades', refine)(holder);
        const team = Team.fromMember(holder);
        [offHexerei, activeHexerei, ordinary].forEach((member, i) => team.setMember(i + 1, member));
        team.setOnFieldMember(activeHexerei);
        matchCarrierTotals(holder, {atk_total: atk});
        return {holder, offHexerei, activeHexerei, ordinary, team};
    }

    test.each([
        [1, 1000, 0.1],
        [1, 4000, 0.26],
        [5, 1000, 0.22],
        [5, 4000, 0.58],
    ])("R%i at %i ATK gives full or half of %f by recipient state", (refine, atk, expected) => {
        const {holder, offHexerei, activeHexerei, ordinary, team} = setup(refine, atk);
        const members = [holder, offHexerei, activeHexerei, ordinary];
        const gains = effectGain(holder, 'weapon_angelos_heptades', members, 'dmg_all');
        [0, expected / 2, expected, 0].forEach((value, i) => expect(gains[i]).toBeCloseTo(value, 10));

        // Any on-field recipient qualifies, including a non-Hexerei holder.
        for (const member of [holder, ordinary]) {
            team.setOnFieldMember(member);
            const [gain] = effectGain(holder, 'weapon_angelos_heptades', [member], 'dmg_all');
            expect(gain).toBeCloseTo(expected, 10);
        }
    });

    test("the recipient needs its own Witch's Homework and Hexerei resonance", () => {
        const {holder, offHexerei, activeHexerei} = setup(1, 1000);
        offHexerei.setCharSettings({durin_witch_homework: false});
        holder.modifyBuffsSettings({'party.durin_witch_homework': true});
        let gains = effectGain(holder, 'weapon_angelos_heptades', [offHexerei, activeHexerei], 'dmg_all');
        expect(gains[0]).toBe(0);
        expect(gains[1]).toBeCloseTo(0.1, 10);

        offHexerei.setCharSettings({durin_witch_homework: true});
        activeHexerei.setCharSettings({venti_witch_homework: false});
        gains = effectGain(holder, 'weapon_angelos_heptades', [offHexerei], 'dmg_all');
        expect(gains[0]).toBe(0);
    });

    test("changing holder ATK changes delivered damage without copying teammate stats", () => {
        const {holder, offHexerei, activeHexerei} = setup(1, 1000);
        const members = [offHexerei, activeHexerei];
        const before = effectGain(holder, 'weapon_angelos_heptades', members, 'dmg_all');
        matchCarrierTotals(holder, {atk_total: 1500});
        const after = effectGain(holder, 'weapon_angelos_heptades', members, 'dmg_all');
        expect(after[0] - before[0]).toBeCloseTo(0.025, 10);
        expect(after[1] - before[1]).toBeCloseTo(0.05, 10);
    });

    test("field state and the weapon toggle survive team save/load and copies", () => {
        const {holder, offHexerei, team} = setup(5, 2000);
        // Flat custom buffs serialize as integers. Use an exact integer here
        // so this check isolates field state and the weapon activation.
        holder.modifyBuffsSettings({'custom_buffs.atk': 1000});
        holder.setWeaponSettings({weapon_angelos_heptades: true});
        const copies = [Team.deserialize(team.serialize()), team.clone(), team.cloneWithArtifactSettings()];
        for (const copy of copies) {
            expect(copy).not.toBeNull();
            expect(copy.getMember(0).getSettings().weapon_angelos_heptades).toBe(true);
            expect(offField(copy.getMember(1))).toBe(true);
            expect(offField(copy.getMember(2))).toBe(false);
            expect(finalStats(copy.getMember(1)).get('dmg_all')).toBeCloseTo(finalStats(offHexerei).get('dmg_all'), 10);
        }
        team.setOnFieldMember(offHexerei);
        expect(offField(copies[0].getMember(1))).toBe(true);
    });
});

test.each([
    ['sword', 'AthameArtis', 'weapon_athame_artis', 'athame_artis', 'Keqing', 'Kaeya', 'atk_percent', 0.32, 0.16],
    ['catalyst', 'AngelosHeptades', 'weapon_angelos_heptades', 'angelos_heptades', 'Nahida', 'Kokomi', 'dmg_all', 0.22, 0.1],
])("%s/%s keeps one explicit source", (type, weapon, toggle, stack, firstChar, secondChar, stat, r5, r1) => {
    const receiver = makeBuild('Hutao');
    const first = makeBuild(firstChar);
    const second = makeBuild(secondChar);
    equipWeapon(type, weapon, 5)(first);
    equipWeapon(type, weapon, 1)(second);
    const team = Team.fromMember(receiver);
    team.setMember(1, first);
    team.setMember(2, second);
    if (weapon == 'AngelosHeptades') {
        matchCarrierTotals(first, {atk_total: 1000});
        matchCarrierTotals(second, {atk_total: 1000});
    }
    const before = finalStats(receiver).get(stat);
    first.setWeaponSettings({[toggle]: true});
    second.setWeaponSettings({[toggle]: true});
    // The earliest slot supplies it.
    expect(stackSource(team, stack)).toBe(first);
    expect(finalStats(receiver).get(stat) - before).toBeCloseTo(r5, 10);

    team.setStackSource(stack, second);
    expect(finalStats(receiver).get(stat) - before).toBeCloseTo(r1, 10);
});
