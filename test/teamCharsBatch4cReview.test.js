import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { featureValues, finalStats, makeBuild, enemyChange } from "./support/team";

global.DB = DB;

function teamOf(keys, constellation = 6) {
    const members = keys.map((key) => makeBuild(key));
    const team = Team.fromMember(members[0]);
    members.slice(1).forEach((member, index) => team.setMember(index + 1, member));
    members.forEach((member) => member.setCharLevels({level: 90, ascension: 6, constellation}));
    return {team, members};
}

describe("Durin's White Flame effects need the Purity form", () => {
    test("A1 RES shred reaches the team only in Purity", () => {
        const {members: [receiver, durin]} = teamOf(['Tartaglia', 'Durin']);
        durin.setCharSettings({durin_res_shred: 'pyro'});
        expect(enemyChange(receiver, 'enemy_res_pyro')).toBeCloseTo(-0.2, 10);
        expect(enemyChange(durin, 'enemy_res_pyro')).toBeCloseTo(-0.2, 10);

        durin.setCharSettings({durin_res_shred: 'pyro', durin_darkness_mode: true});
        expect(enemyChange(receiver, 'enemy_res_pyro')).toBeCloseTo(0, 10);
        expect(enemyChange(durin, 'enemy_res_pyro')).toBeCloseTo(0, 10);
    });

    test("C1 Cycle of Enlightenment reaches the on-field other member in Purity only", () => {
        const {team, members: [receiver, durin]} = teamOf(['Tartaglia', 'Durin']);
        const hit = () => featureValues(receiver)['skill.tartaglia_slash_dmg'][2];
        durin.setCharSettings({});
        const base = hit();

        durin.setCharSettings({durin_c1_cycle_party: true});
        expect(hit()).toBeGreaterThan(base + 100);

        team.setOnFieldMember(durin);
        expect(hit()).toBeCloseTo(base, 6);
        team.setOnFieldMember(receiver);

        durin.setCharSettings({durin_c1_cycle_party: true, durin_darkness_mode: true});
        expect(hit()).toBeCloseTo(base, 6);
    });
});

describe("Lohen's Flippant Masterpiece buffs Lohen and the chosen member", () => {
    test("only the selected teammate receives the 15% ATK", () => {
        const {members: [lohen, chosen, other]} = teamOf(['Lohen', 'Tartaglia', 'Ayaka']);
        const gain = (member, settings) => {
            lohen.setCharSettings({});
            const before = finalStats(member).get('atk_percent');
            lohen.setCharSettings(settings);
            return finalStats(member).get('atk_percent') - before;
        };
        const on = {lohen_flippant_masterpiece: true};
        expect(gain(lohen, on)).toBeCloseTo(0.15, 10);
        expect(gain(chosen, on)).toBeCloseTo(0, 10);

        const selected = Object.assign({lohen_flippant_masterpiece_receiver: String(chosen.char.getId())}, on);
        expect(gain(lohen, selected)).toBeCloseTo(0.15, 10);
        expect(gain(chosen, selected)).toBeCloseTo(0.15, 10);
        expect(gain(other, selected)).toBeCloseTo(0, 10);
    });
});

describe("Prune's Secret Rite Swirl bonus goes to the chosen Hexerei member", () => {
    test("the triggering character is selected and must be Hexerei", () => {
        const {members: [prune, lohen, durin]} = teamOf(['Prune', 'Lohen', 'Durin']);
        lohen.setCharSettings({lohen_witch_homework: true});
        durin.setCharSettings({durin_witch_homework: true});
        const base = {
            prune_witch_homework: true,
            prune_tolling_synchronicity: true,
            prune_witchseekers_vow_swirl: true,
        };
        prune.setCharSettings({});
        const lohenBase = finalStats(lohen).get('atk_percent');
        const durinBase = finalStats(durin).get('atk_percent');

        prune.setCharSettings(base);
        expect(finalStats(lohen).get('atk_percent')).toBeCloseTo(lohenBase, 10);

        prune.setCharSettings(Object.assign({prune_witchseekers_vow_swirl_receiver: String(lohen.char.getId())}, base));
        expect(finalStats(lohen).get('atk_percent') - lohenBase).toBeCloseTo(0.3, 10);
        expect(finalStats(durin).get('atk_percent')).toBeCloseTo(durinBase, 10);

        lohen.setCharSettings({});
        expect(finalStats(lohen).get('atk_percent')).toBeCloseTo(lohenBase, 10);
    });
});

describe("Odette's C4 Snow Swan's Dream for the others", () => {
    function snowSwan(constellation) {
        const {members: [receiver, odette]} = teamOf(['Tartaglia', 'Odette'], constellation);
        odette.setCharSettings({odette_snow_swans_dream: true});
        return {
            receiver: finalStats(receiver).get('dmg_stellarglimmer'),
            odette: finalStats(odette).get('dmg_stellarglimmer'),
        };
    }

    test("is half of Odette's own bonus at her burst level, C5 included", () => {
        const c4 = snowSwan(4);
        const c6 = snowSwan(6);
        expect(c4.odette).toBeGreaterThan(0);
        expect(c6.odette).toBeGreaterThan(c4.odette);
        expect(c4.receiver).toBeCloseTo(c4.odette / 2, 10);
        expect(c6.receiver).toBeCloseTo(c6.odette / 2, 10);
    });

    test("needs C4", () => {
        const c3 = snowSwan(3);
        expect(c3.odette).toBeGreaterThan(0);
        expect(c3.receiver).toBe(0);
    });

    test("Odette's serialize IDs are unique", () => {
        const ids = DB.Chars.get('Odette').getAllConditions()
            .map((condition) => condition.params.serializeId)
            .filter((id) => id !== undefined);
        expect(new Set(ids).size).toBe(ids.length);
    });
});
