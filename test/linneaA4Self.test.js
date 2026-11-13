import { BuildData } from "../src/js/classes/Build/Data";
import { PRIORITIES } from "../src/js/classes/PostEffect";
import { CHANNELS } from "../src/js/classes/PostEffect/Channels";
import { PostEffectStats } from "../src/js/classes/PostEffect/Stats";
import { Linnea } from "../src/js/db/Char/Linnea";
import { StatTable } from "../src/js/classes/StatTable";

test("linnea self A4 scales from current DEF", () => {
    const baseSettings = {
        char_ascension: 4,
        char_level: 90,
        char_constellation: 0,
        char_id: Linnea.getId(),
        char_name: "linnea",
        char_element: "geo",
        char_origin: "nodkrai",
        linnea_universal_naturalist_archive: true,
    };

    const data1 = new BuildData(baseSettings, {
        def_base: 907,
        def: 2292,
    });
    data1.postEffects = Linnea.getPostEffects();
    data1.applyPostEffects();

    const data2 = new BuildData(baseSettings, {
        def_base: 907,
        def: 1785,
    });
    data2.postEffects = Linnea.getPostEffects();
    data2.applyPostEffects();

    expect(data1.stats.get("mastery")).toBeCloseTo(159.95, 5);
    expect(data2.stats.get("mastery")).toBeCloseTo(134.6, 5);
});

test("linnea self A4 is disabled until the self toggle is enabled", () => {
    const settings = {
        char_ascension: 4,
        char_level: 90,
        char_constellation: 0,
        char_id: Linnea.getId(),
        char_name: "linnea",
        char_element: "geo",
        char_origin: "nodkrai",
    };

    const data = new BuildData(settings, {
        def_base: 907,
        def: 2292,
    });
    data.postEffects = Linnea.getPostEffects();
    data.applyPostEffects();

    expect(data.stats.get("mastery")).toBeCloseTo(0, 5);
});

// Game data: Avatar_Linnea_PermanentSkill_2 reads FIGHT_PROP_NONEXTRA_DEFENSE
// (premod), so her A4 counts a premod DEF write and ignores an extra one.
test("linnea self A4 counts a premod DEF write, ignores an extra DEF write", () => {
    const settings = {
        char_ascension: 4,
        char_level: 90,
        char_constellation: 0,
        char_id: Linnea.getId(),
        char_name: "linnea",
        char_element: "geo",
        char_origin: "nodkrai",
        linnea_universal_naturalist_archive: true,
    };

    // A stage-1 effect writes the premod part (like Columbina's C2 DEF).
    const premodDefPost = new PostEffectStats({
        from: "bonus_def_source",
        percent: new StatTable("def", [1]),
        priority: PRIORITIES.SET_BONUS,
    });
    expect(premodDefPost.getWrites()).toBe(CHANNELS.PREMOD);

    // A default-stage effect writes the extra part (like an ordinary buff).
    const extraDefPost = new PostEffectStats({
        from: "bonus_def_source",
        percent: new StatTable("def", [1]),
        priority: PRIORITIES.STAT_LOCAL,
    });
    expect(extraDefPost.getWrites()).toBe(CHANNELS.TOTAL);

    const data = new BuildData(settings, {
        def_base: 907,
        def: 1785,
        bonus_def_source: 507,
    });
    data.postEffects = [
        ...Linnea.getPostEffects(),
        premodDefPost,
        extraDefPost,
    ];
    data.applyPostEffects();

    // DEF counts both writes; the A4 EM only the premod one: 5% of the
    // premod DEF (907 base + 1785 + 507 premod write) = 159.95.
    expect(data.stats.get("def")).toBeCloseTo(2799, 5);
    expect(data.stats.get("mastery")).toBeCloseTo(159.95, 5);
});
