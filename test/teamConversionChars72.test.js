import { Team } from "../src/js/classes/Team";
import { valeriyPolestarField } from "../src/js/db/Char/Valeriy";
import { featureValues, makeBuild } from "./support/team";
import { characterConversionTests } from "./support/teamCharacterConversion";
import { recorded } from "./support/teamConversion";

/**
 * The party rows of the released 7.2: Kinich (new in it), Mitya, Valeriy.
 * Their scenarios are recorded by the released engine at a540f057
 * (md/tools/baseline_update_recorder.test.js); the rest of the recording is
 * of 54e1d63.
 */
const CONVERTED = [
    {
        // C2: the Dendro RES of opponents hit by his skill, for the team.
        char: 'Kinich',
        constellation: 6,
        on: {
            kinich_tiger_beetles_palm_1: true,
        },
    },
    {
        // The recorded row has an Overloaded core: C1's CRIT DMG and C2's
        // 234 Elemental Mastery for the active character (the recorded
        // receiver), C6's elevation and the Base Stellar-Conduct DMG of
        // Stellar Jubilee from the typed 800 Elemental Mastery (at its cap).
        // The Gradient Beacons give nothing outside the Steady State, and
        // C2's RES decrease needs a Polestar Field, which the row has not.
        char: 'Mitya',
        constellation: 6,
        on: {
            mitya_detection_core: 'overloaded',
            mitya_gradient_beacons: 5,
            mitya_the_observer_seeking_what_is_missing: true,
            mitya_the_matter_that_slumbers_beyond_inertness: true,
        },
        carrierTotals: {mastery_total: 800},
        ignoreStats: ['mitya_mastery_total'],
    },
    {
        // Offensive Directive from his ATK and talent level (13 with C3),
        // with the 130 Impact Momentum of C4, C2's Elemental Mastery and
        // C6's CRIT for Electro DMG. "Valeriy enters the Radiance:
        // Stellar-Conduct state while within a Polestar Field": the released
        // row had the state without one, so its gate is open here as
        // recorded; the test below checks it.
        char: 'Valeriy',
        constellation: 6,
        openConditions: [valeriyPolestarField],
        on: {
            valeriy_radiance_stellarconduct: true,
            valeriy_offensive_directive: 15,
            valeriy_impact_momentum: 130,
            valeriy_ranks_that_charge_as_one: true,
            valeriy_the_strength_to_breach_enemy_lines: true,
        },
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['valeriy_atk_total', 'valeriy_char_skill_attack', 'valeriy_char_skill_attack_bonus'],
    },
];

characterConversionTests(CONVERTED);

test("the scenarios of the three rows are of the released 7.2", () => {
    const scenarios = recorded('party.json').scenarios;
    for (const {char} of CONVERTED) {
        const ids = Object.keys(scenarios).filter((id) => id.endsWith('__with_' + char));
        expect(ids.length).toBe(7);
        expect(ids.map((id) => scenarios[id].commit)).toEqual(ids.map(() => 'a540f057'));
    }
});

test("Valeriy's Radiance: Stellar-Conduct state needs the team's Polestar Field", () => {
    const receiver = makeBuild('Keqing');
    const valeriy = makeBuild('Valeriy');
    const team = Team.fromMember(receiver);
    team.setMember(1, valeriy);

    valeriy.setCharSettings({valeriy_offensive_directive: 15, valeriy_impact_momentum: 100});
    const electro = featureValues(receiver)['skill.keqing_skill_stiletto'][0];
    valeriy.setCharSettings({valeriy_offensive_directive: 0, valeriy_impact_momentum: 100});
    const plain = featureValues(receiver)['skill.keqing_skill_stiletto'][0];
    expect(electro).toBeGreaterThan(plain);

    // The control alone is not the state: without a Polestar Field the
    // directive still raises ordinary Electro DMG.
    valeriy.setCharSettings({
        valeriy_radiance_stellarconduct: true,
        valeriy_offensive_directive: 15,
        valeriy_impact_momentum: 100,
    });
    expect(featureValues(receiver)['skill.keqing_skill_stiletto'][0]).toBeCloseTo(electro, 8);

    // In the field it raises Electro DMG considered Stellar-Conduct instead.
    team.modifySettings({polestar_field: true});
    valeriy.setCharSettings({valeriy_offensive_directive: 0, valeriy_impact_momentum: 100});
    const plainInField = featureValues(receiver)['skill.keqing_skill_stiletto'][0];
    valeriy.setCharSettings({
        valeriy_radiance_stellarconduct: true,
        valeriy_offensive_directive: 15,
        valeriy_impact_momentum: 100,
    });
    expect(featureValues(receiver)['skill.keqing_skill_stiletto'][0]).toBeCloseTo(plainInField, 8);
});
