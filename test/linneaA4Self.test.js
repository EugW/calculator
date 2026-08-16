import { BuildData } from "../src/js/classes/Build/Data";
import { PRIORITIES } from "../src/js/classes/PostEffect";
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

test("linnea self A4 includes same-priority DEF post effects after DEF is updated", () => {
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

    const extraDefPost = new PostEffectStats({
        from: "bonus_def_source",
        percent: new StatTable("def", [1]),
        priority: PRIORITIES.STAT_LOCAL,
    });

    const data = new BuildData(settings, {
        def_base: 907,
        def: 1785,
        bonus_def_source: 507,
    });
    data.postEffects = [
        ...Linnea.getPostEffects(),
        extraDefPost,
    ];
    data.applyPostEffects();

    expect(data.stats.get("def")).toBeCloseTo(2292, 5);
    expect(data.stats.get("mastery")).toBeCloseTo(159.95, 5);
});
