import { Artifact } from '../src/js/classes/Artifact';
import { CalcObjectArtifacts } from '../src/js/classes/CalcObject/Artifacts';
import { DB } from '../src/js/db/DB';

global.DB = DB;

const slots = ['flower', 'plume', 'sands', 'goblet', 'circlet'];

function equip(sets) {
    let artifacts = new CalcObjectArtifacts();
    sets.forEach((set, i) => {
        if (set) {
            artifacts.set(new Artifact(5, 20, slots[i], set, 'hp', []));
        }
    });
    return artifacts;
}

test("every set gives its first bonus at one or two pieces", () => {
    for (const set of DB.Artifacts.Sets.getList()) {
        const expected = set.availableSlots().length == 1 ? 1 : 2;
        expect([set.name, set.getMinBonusPieces()]).toEqual([set.name, expected]);
    }
});

test("a four-piece set is one bonus set", () => {
    expect(equip(['GladiatorFinale', 'GladiatorFinale', 'GladiatorFinale', 'GladiatorFinale', 'WandererTroupe']).bonusSets())
        .toEqual([{set: 'GladiatorFinale', pieces: 4}]);
    expect(equip(['GladiatorFinale', 'GladiatorFinale', 'GladiatorFinale', 'GladiatorFinale', 'GladiatorFinale']).bonusSets())
        .toEqual([{set: 'GladiatorFinale', pieces: 5}]);
});

test("2+2 is two bonus sets, a single piece is none", () => {
    expect(equip(['WandererTroupe', 'GladiatorFinale', 'GladiatorFinale', 'WandererTroupe', 'Instructor']).bonusSets())
        .toEqual([{set: 'WandererTroupe', pieces: 2}, {set: 'GladiatorFinale', pieces: 2}]);
    expect(equip(['GladiatorFinale', 'GladiatorFinale', 'GladiatorFinale', 'WandererTroupe', null]).bonusSets())
        .toEqual([{set: 'GladiatorFinale', pieces: 3}]);
    expect(equip([]).bonusSets()).toEqual([]);
});

test("a one-piece set counts with a single piece", () => {
    expect(equip(['GladiatorFinale', 'GladiatorFinale', 'GladiatorFinale', 'GladiatorFinale', 'PrayersForIllumination']).bonusSets())
        .toEqual([{set: 'GladiatorFinale', pieces: 4}, {set: 'PrayersForIllumination', pieces: 1}]);
});
