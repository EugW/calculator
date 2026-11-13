import { Stats } from "../src/js/classes/Stats";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { featureValues, finalStats, makeBuild } from "./support/team";

global.DB = DB;

// Numbers that were typed wrong and are now the game's, stated here as the
// game shows them per refinement (md/generated_params.md lists what they were).

/** What a weapon's passive gives under these settings, in calculator units. */
function passive(type, key, settings) {
    const stats = new Stats();
    for (const cond of DB.Weapons.get(type).get(key).getConditions()) {
        stats.concat(cond.getData(settings).stats);
    }
    return stats;
}

function byRefine(type, key, settings, stat) {
    return [1, 2, 3, 4, 5].map((refine) => (
        passive(type, key, Object.assign({weapon_refine: refine}, settings)).get(stat)
    ));
}

test("Fading Twilight: Afterglow gives 10/12.5/15/17.5/20% DMG", () => {
    expect(byRefine('bow', 'FadingTwilight', {weapon_fading_twilight_2: true}, 'dmg_all'))
        .toEqual([10, 12.5, 15, 17.5, 20]);
    // The states next to it, for the whole 6%/10%/14% row.
    expect(byRefine('bow', 'FadingTwilight', {weapon_fading_twilight_1: true}, 'dmg_all'))
        .toEqual([6, 7.5, 9, 10.5, 12]);
    expect(byRefine('bow', 'FadingTwilight', {weapon_fading_twilight_3: true}, 'dmg_all'))
        .toEqual([14, 17.5, 21, 24.5, 28]);
});

test("Thundering Pulse: one Thunder Emblem stack gives 12/15/18/21/24% Normal Attack DMG", () => {
    expect(byRefine('bow', 'ThunderingPulse', {weapon_thundering_pulse_2: 1}, 'dmg_normal'))
        .toEqual([12, 15, 18, 21, 24]);
    expect(byRefine('bow', 'ThunderingPulse', {weapon_thundering_pulse_2: 2}, 'dmg_normal'))
        .toEqual([24, 30, 36, 42, 48]);
    expect(byRefine('bow', 'ThunderingPulse', {weapon_thundering_pulse_2: 3}, 'dmg_normal'))
        .toEqual([40, 50, 60, 70, 80]);
});

test("Splendor of Tranquil Waters: each HP stack gives 14/17.5/21/24.5/28% Max HP", () => {
    expect(byRefine('sword', 'SplendorOfStillWaters', {weapon_splendor_of_tranquil_waters_2: 1}, 'hp_percent'))
        .toEqual([14, 17.5, 21, 24.5, 28]);
    expect(byRefine('sword', 'SplendorOfStillWaters', {weapon_splendor_of_tranquil_waters_2: 2}, 'hp_percent'))
        .toEqual([28, 35, 42, 49, 56]);
});

test("A Thousand Blazing Suns: Scorching Brilliance gives 28/35/42/49/56% ATK, 75% more in Nightsoul's Blessing", () => {
    const on = {weapon_a_thousand_blazing_suns: true};
    expect(byRefine('claymore', 'AThousandBlazingSuns', on, 'atk_percent'))
        .toEqual([28, 35, 42, 49, 56]);

    // A Natlan wielder in Nightsoul's Blessing: the base plus 75% of it.
    const nightsoul = Object.assign({char_origin: 'natlan', 'common.nightsoul_blessing_state': true}, on);
    expect(byRefine('claymore', 'AThousandBlazingSuns', nightsoul, 'atk_percent'))
        .toEqual([49, 61.25, 73.5, 85.75, 98]);
    expect(byRefine('claymore', 'AThousandBlazingSuns', nightsoul, 'crit_dmg'))
        .toEqual([35, 43.75, 52.5, 61.25, 70]);
});

test("Sequence of Solitude: the hit deals 40/50/60/70/80% of Max HP, as its description says", () => {
    expect(byRefine('bow', 'SequenceofSolitude', {}, 'text_percent_dmg')).toEqual([40, 50, 60, 70, 80]);

    // The hit itself: Max HP does not depend on the refinement, so the damage
    // grows with the multiplier alone.
    const weapon = DB.Weapons.get('bow').get('SequenceofSolitude');
    const damage = [1, 2, 3, 4, 5].map((refine) => {
        const amber = makeBuild('Amber');
        amber.setWeapon(weapon);
        amber.setWeaponLevels({level: 90, ascension: 6, refine});
        Team.fromMember(amber);
        return featureValues(amber)['weapon.sequence_of_solitude_dmg'][0];
    });
    expect(damage[0]).toBeGreaterThan(0);
    for (const [index, ratio] of [1, 1.25, 1.5, 1.75, 2].entries()) {
        expect(damage[index] / damage[0]).toBeCloseTo(ratio, 10);
    }
});

describe("Blackmarrow Lantern", () => {
    test("Bloom +48..96%, Lunar-Bloom +12..24% below Ascendant Gleam", () => {
        expect(byRefine('catalyst', 'BlackmarrowLantern', {}, 'dmg_reaction_bloom'))
            .toEqual([48, 60, 72, 84, 96]);
        expect(byRefine('catalyst', 'BlackmarrowLantern', {}, 'dmg_reaction_lunarbloom'))
            .toEqual([12, 15, 18, 21, 24]);
    });

    function holdLantern(charKey, refine) {
        const build = makeBuild(charKey);
        build.setWeapon(DB.Weapons.get('catalyst').get('BlackmarrowLantern'));
        build.setWeaponLevels({level: 90, ascension: 6, refine});
        return build;
    }

    test.each([[1, 0.12], [5, 0.24]])(
        "R%i: Ascendant Gleam adds the same Lunar-Bloom bonus again",
        (refine, bonus) => {
            // Klee gives herself no Lunar-Bloom bonus; Aino is the first
            // Nod-Krai member (Nascent Gleam), Ineffa the second.
            const klee = holdLantern('Klee', refine);
            const team = Team.fromMember(klee);
            expect(finalStats(klee).get('dmg_reaction_lunarbloom')).toBeCloseTo(bonus, 10);

            team.setMember(1, makeBuild('Aino'));
            const nascent = finalStats(klee).get('dmg_reaction_lunarbloom');

            team.setMember(2, makeBuild('Ineffa'));
            const ascendant = finalStats(klee).get('dmg_reaction_lunarbloom');

            expect(nascent).toBeCloseTo(bonus, 10);
            expect(ascendant - nascent).toBeCloseTo(bonus, 10);
            // The Bloom bonus does not depend on the Moonsign.
            expect(finalStats(klee).get('dmg_reaction_bloom')).toBeCloseTo(bonus * 4, 10);
        },
    );
});

test("Kinich: Canopy Hunter has a Nightsoul point limit of 20 and an 18s cooldown", () => {
    const talents = DB.Chars.get('Kinich').talents;
    expect(talents.get('skill.nightsoul_points_limit').getValues()).toEqual([20]);
    expect(talents.get('skill.cd').getValues()).toEqual([18]);
});
