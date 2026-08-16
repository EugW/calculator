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

test("custom lunar buffs survive build clone serialization", () => {
    const build = makeBuild();

    build.modifyBuffsSettings({
        "custom_buffs.dmg_all": 12.3,
        "custom_buffs.lunarbloom_multi": 45.6,
        "custom_buffs.dmg_lunar_special": 7.8,
        "custom_buffs.dmg_lunarbloom_special": 9.1,
    });

    const clone = build.clone();
    const cloneSettings = clone.getSettings();

    expect(cloneSettings["custom_buffs.dmg_all"]).toBeCloseTo(12.3, 5);
    expect(cloneSettings["custom_buffs.lunarbloom_multi"]).toBeCloseTo(45.6, 5);
    expect(cloneSettings["custom_buffs.dmg_lunar_special"]).toBeCloseTo(7.8, 5);
    expect(cloneSettings["custom_buffs.dmg_lunarbloom_special"]).toBeCloseTo(9.1, 5);
});

test("custom lunar buffs are preserved in cloneWithArtifactSettings build data", () => {
    const build = makeBuild();

    build.modifyBuffsSettings({
        "custom_buffs.dmg_all": 12.3,
        "custom_buffs.lunarbloom_multi": 45.6,
        "custom_buffs.dmg_lunar_special": 7.8,
        "custom_buffs.dmg_lunarbloom_special": 9.1,
    });

    const buildData = build.cloneWithArtifactSettings().getBuildData();

    expect(buildData.stats.get("dmg_all")).toBeCloseTo(0.123, 5);
    expect(buildData.stats.get("lunarbloom_multi")).toBeCloseTo(0.456, 5);
    expect(buildData.stats.get("dmg_lunar_special")).toBeCloseTo(0.078, 5);
    expect(buildData.stats.get("dmg_lunarbloom_special")).toBeCloseTo(0.091, 5);
});
