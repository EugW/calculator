import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild } from "./support/team";

global.DB = DB;

// The craftable Nod-Krai weapons give their bonus once, and the same amount
// again at Moonsign: Ascendant Gleam (two or more Nod-Krai party members).
// Game text, R1 (R5 is double):
// - Prospector's Shovel: Lunar-Charged DMG +12%, "an additional 12%".
// - Serenity's Call: Max HP +16% for 12s, "further increased by 16%".
// - Snare Hook, Master Key: Elemental Mastery +60 for 12s, "further increased by 60".
// Blackmarrow Lantern is covered in gameValueFixes.test.js.

// The holders are not from Nod-Krai; Aino is the first Nod-Krai member
// (Nascent Gleam), Ineffa the second (Ascendant Gleam).
const CASES = [
    ['polearm', 'ProspectorsShovel', 'Xiangling', null, 'dmg_reaction_lunarcharged', 0.12, 0.24],
    ['sword', 'SerenitysCall', 'Keqing', 'weapon_serenitys_call', 'hp_percent', 0.16, 0.32],
    ['bow', 'SnareHook', 'Amber', 'weapon_snare_hook', 'mastery', 60, 120],
    ['claymore', 'MasterKey', 'Diluc', 'weapon_master_key', 'mastery', 60, 120],
];

function hold(type, key, charKey, refine) {
    const build = makeBuild(charKey);
    build.setWeapon(DB.Weapons.get(type).get(key));
    build.setWeaponLevels({level: 90, ascension: 6, refine});
    return build;
}

/** The stat with the weapon's effect, minus the stat without it. */
function effect(member, toggle, stat, withoutWeapon) {
    if (!toggle) {
        return finalStats(member).get(stat) - withoutWeapon;
    }
    member.setWeaponSettings({[toggle]: false});
    const off = finalStats(member).get(stat);
    member.setWeaponSettings({[toggle]: true});
    return finalStats(member).get(stat) - off;
}

describe.each(CASES)("%s %s", (type, key, charKey, toggle, stat, r1, r5) => {
    test.each([[1, r1], [5, r5]])("R%i: the bonus, and the same again at Ascendant Gleam", (refine, bonus) => {
        const member = hold(type, key, charKey, refine);
        const team = Team.fromMember(member);
        // A weapon without a toggle is compared with the holder's own stat,
        // which no teammate here changes.
        const own = finalStats(makeSoloWithout(type, charKey)).get(stat);

        expect(effect(member, toggle, stat, own)).toBeCloseTo(bonus, 10);

        team.setMember(1, makeBuild('Aino'));
        expect(effect(member, toggle, stat, own)).toBeCloseTo(bonus, 10);

        team.setMember(2, makeBuild('Ineffa'));
        expect(effect(member, toggle, stat, own)).toBeCloseTo(bonus * 2, 10);
    });

    if (toggle) {
        test("nothing at Ascendant Gleam while the effect is off", () => {
            const member = hold(type, key, charKey, 1);
            const team = Team.fromMember(member);
            team.setMember(1, makeBuild('Aino'));
            team.setMember(2, makeBuild('Ineffa'));
            member.setWeaponSettings({[toggle]: false});
            const off = finalStats(member).get(stat);

            const plain = makeBuild(charKey);
            const plainTeam = Team.fromMember(plain);
            plainTeam.setMember(1, makeBuild('Aino'));
            plainTeam.setMember(2, makeBuild('Ineffa'));
            // The weapons differ only in what their passive gives this stat.
            expect(off).toBeCloseTo(finalStats(plain).get(stat), 10);
        });
    }
});

/** The holder alone with the default weapon of that type: the stat's own value. */
function makeSoloWithout(type, charKey) {
    const build = makeBuild(charKey);
    Team.fromMember(build);
    return build;
}

test("the Ascendant Gleam part has its own description with the same placeholder", () => {
    for (const [type, key, , , stat] of CASES) {
        const weapon = DB.Weapons.get(type).get(key);
        const extra = weapon.getConditions().find((cond) => /_2$/.test(cond.params.description || ''));
        expect(extra).toBeDefined();
        expect(extra.getStats({weapon_refine: 1}).get(stat)).toBeGreaterThan(0);
    }
});
