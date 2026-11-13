import { CalcObjectEnemy } from "../src/js/classes/CalcObject/Enemy";
import { CalcSet } from "../src/js/classes/CalcSet";
import { Team } from "../src/js/classes/Team";
import { Serializer } from "../src/js/classes/Serializer";
import { DB } from "../src/js/db/DB";

global.DB = DB;

function makeBuild() {
    const build = new CalcSet();
    const char = DB.Chars.getFirst();

    build.setChar(char);
    build.setWeapon(DB.Weapons.get(char.weapon).getFirst());

    return build;
}

test("custom enemy resistances below -200 survive packed hash reload", () => {
    const team = Team.fromMember(makeBuild());
    team.enemy.set(null);

    team.enemy.setResistances({
        phys: -250,
        anemo: -275,
        cryo: -300,
        geo: -225,
        hydro: -240,
        pyro: -260,
        electro: -280,
        dendro: -290,
    });

    const clone = Team.deserialize(Serializer.unpack(Serializer.pack(team)));

    expect(clone.enemy.getResistances()).toEqual({
        phys: -250,
        anemo: -275,
        cryo: -300,
        geo: -225,
        hydro: -240,
        pyro: -260,
        electro: -280,
        dendro: -290,
    });
});

test("legacy custom enemy resistance format remains readable", () => {
    const legacyInput = [
        90,
        1,
        -20 + 100,
        -30 + 100,
        -40 + 100,
        -50 + 100,
        -60 + 100,
        -70 + 100,
        -80 + 100,
        -90 + 100,
        0,
    ];

    const enemy = CalcObjectEnemy.deserialize(legacyInput);

    expect(enemy.getResistances()).toEqual({
        anemo: -20,
        cryo: -30,
        dendro: -40,
        electro: -50,
        geo: -60,
        hydro: -70,
        phys: -80,
        pyro: -90,
    });
});
