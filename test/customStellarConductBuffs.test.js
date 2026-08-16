import { CalcSet } from "../src/js/classes/CalcSet";
import { DB } from "../src/js/db/DB";

global.DB = DB;

function makeBuild() {
    const build = new CalcSet();
    const char = DB.Chars.getFirst();

    build.setChar(char);
    build.setWeapon(DB.Weapons.get(char.weapon).getFirst());
    build.setEnemy(DB.Enemies.getFirst().getFirst());

    return build;
}

test("custom Stellar-Conduct buffs survive build clone serialization", () => {
    const build = makeBuild();

    build.modifyBuffsSettings({
        "custom_buffs.dmg_stellarconduct": 12.3,
        "custom_buffs.stellarconduct_multi": 45.6,
        "custom_buffs.dmg_stellarconduct_special": 10.2,
    });

    const clone = build.clone();
    const cloneSettings = clone.getSettings();

    expect(cloneSettings["custom_buffs.dmg_stellarconduct"]).toBeCloseTo(12.3, 5);
    expect(cloneSettings["custom_buffs.stellarconduct_multi"]).toBeCloseTo(45.6, 5);
    expect(cloneSettings["custom_buffs.dmg_stellarconduct_special"]).toBeCloseTo(10.2, 5);
});

test("custom Stellar-Conduct buffs are preserved in cloneWithArtifactSettings build data", () => {
    const build = makeBuild();

    build.modifyBuffsSettings({
        "custom_buffs.dmg_stellarconduct": 12.3,
        "custom_buffs.stellarconduct_multi": 45.6,
        "custom_buffs.dmg_stellarconduct_special": 10.2,
    });

    const buildData = build.cloneWithArtifactSettings().getBuildData();

    expect(buildData.stats.get("dmg_stellarconduct")).toBeCloseTo(0.123, 5);
    expect(buildData.stats.get("stellarconduct_multi")).toBeCloseTo(0.456, 5);
    expect(buildData.stats.get("dmg_stellarconduct_special")).toBeCloseTo(0.102, 5);
});
