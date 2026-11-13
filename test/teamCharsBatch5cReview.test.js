import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { featureValues, finalStats, makeBuild } from "./support/team";

global.DB = DB;

function teamOf(keys, constellations) {
    const members = keys.map((key, index) => {
        const build = makeBuild(key);
        build.setCharLevels({level: 90, ascension: 6, constellation: constellations[index] || 0});
        return build;
    });
    const team = Team.fromMember(members[0]);
    members.slice(1).forEach((member, index) => team.setMember(index + 1, member));
    return {team, members};
}

describe("Escoffier's Fresh, Fragrant Stew", () => {
    test("needs C2", () => {
        const hit = (constellation) => {
            const {members: [ayaka, escoffier]} = teamOf(['Ayaka', 'Escoffier'], [0, constellation]);
            escoffier.setCharSettings({});
            const base = featureValues(ayaka)['skill.skill_dmg'][2];
            escoffier.setCharSettings({escoffier_fresh_fragrant_stew_is_an_art: true});
            return featureValues(ayaka)['skill.skill_dmg'][2] - base;
        };
        expect(hit(1)).toBeCloseTo(0, 6);
        expect(hit(2)).toBeGreaterThan(100);
    });
});

describe("the Electro Traveler's Abundance Amulet", () => {
    test("reaches only the member chosen as picking it up", () => {
        const {members: [traveler, alhaitham, ayaka]} = teamOf(['TravelerElectro', 'Alhaitham', 'Ayaka'], [0, 0, 0]);
        const gain = (member, receiver) => {
            traveler.setCharSettings({});
            const before = finalStats(member).get('recharge');
            traveler.setCharSettings({
                traveler_abundance_amulet: true,
                traveler_abundance_amulet_receiver: receiver ? String(receiver.char.getId()) : '',
            });
            return finalStats(member).get('recharge') - before;
        };
        expect(gain(alhaitham, null)).toBeCloseTo(0, 10);
        expect(gain(alhaitham, alhaitham)).toBeGreaterThan(0.2);
        expect(gain(ayaka, alhaitham)).toBeCloseTo(0, 10);
        expect(gain(traveler, alhaitham)).toBeCloseTo(0, 10);
        expect(gain(traveler, traveler)).toBeGreaterThan(0.2);
    });
});
