import { Feature2 } from "../src/js/classes/Feature2";
import { FeatureDamage } from "../src/js/classes/Feature2/Damage";
import { FeatureDamageStellarConduct } from "../src/js/classes/Feature2/Damage/StellarConduct";
import { FeatureDamageStellarSwirl } from "../src/js/classes/Feature2/Damage/StellarSwirl";
import { FeatureReactionLunarBloom } from "../src/js/classes/Feature2/Reaction/Transformative/Lunar/Bloom";
import { FeatureReactionLunarBloomLike } from "../src/js/classes/Feature2/Reaction/Transformative/Lunar/BloomLike";
import { FeatureReactionLunarCharged } from "../src/js/classes/Feature2/Reaction/Transformative/Lunar/Charged";
import { FeatureReactionLunarChargedLike } from "../src/js/classes/Feature2/Reaction/Transformative/Lunar/ChargedLike";
import { FeatureReactionLunarCrystallize } from "../src/js/classes/Feature2/Reaction/Transformative/Lunar/Crystallize";
import { FeatureReactionLunarCrystallizeLike } from "../src/js/classes/Feature2/Reaction/Transformative/Lunar/CrystallizeLike";

test.each([
    [new FeatureDamageStellarConduct({element: "cryo"}), "stellar-conduct-cryo"],
    [new FeatureDamageStellarConduct({element: "electro"}), "stellar-conduct-electro"],
    [new FeatureDamageStellarSwirl({element: "anemo"}), "stellar-swirl-anemo"],
    [new FeatureDamageStellarSwirl({element: "cryo"}), "stellar-swirl-cryo"],
    [new FeatureReactionLunarCharged({element: "electro"}), "lunar-charged"],
    [new FeatureReactionLunarBloom({element: "dendro"}), "lunar-bloom"],
    [new FeatureReactionLunarCrystallize({element: "geo"}), "lunar-crystallize"],
])("feature damage exposes its gradient name style", (feature, expected) => {
    expect(feature.isDamage()).toBe(true);
    expect(feature.getNameStyle()).toBe(expected);
});

test("ordinary damage uses its element style and non-damage features remain neutral", () => {
    expect(new FeatureDamage({element: "pyro"}).getNameStyle()).toBe("element-pyro");
    expect(new Feature2({category: "other", name: "value"}).getNameStyle()).toBe("");
    expect(new Feature2({category: "other", name: "value"}).isDamage()).toBe(false);
});

test("unsupported future Stellar combinations fall back to their element style", () => {
    expect(new FeatureDamageStellarConduct({element: "pyro"}).getNameStyle()).toBe("element-pyro");
    expect(new FeatureDamageStellarSwirl({element: "hydro"}).getNameStyle()).toBe("element-hydro");
});

test.each([
    [new FeatureReactionLunarChargedLike({element: "electro"}), "electro"],
    [new FeatureReactionLunarBloomLike({element: "dendro"}), "dendro"],
    [new FeatureReactionLunarCrystallizeLike({element: "geo"}), "geo"],
])("direct Lunar damage keeps its elemental icon", (feature, element) => {
    expect(feature.icon).toBeUndefined();
    expect(feature.getElement()).toBe(element);
});

test("element icons use the two-row v2 sprite without Lunar icon cells", () => {
    const rotationCss = fs.readFileSync(path.join(process.cwd(), "src/css/Components/Tab/Rotation.css"), "utf8");
    const featuresCss = fs.readFileSync(path.join(process.cwd(), "src/css/Components/Tab/Features.css"), "utf8");
    const iconsDir = path.join(process.cwd(), "src/images/icons");

    expect(fs.existsSync(path.join(iconsDir, "element_40_v2.png"))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, "element_40_v3.png"))).toBe(false);
    expect(rotationCss).toContain("element_40_v2.png");
    expect(featuresCss).toContain("element_40_v2.png");
    expect(rotationCss).not.toContain("stat-lunar");
    expect(featuresCss).not.toContain("stat-lunar");
});

test.each([
    ["stellar-conduct-cryo", "#F2FCFD", "#9AF4FC"],
    ["stellar-conduct-electro", "#F6F0FF", "#A4BDFF"],
    ["lunar-charged", "#D0A7FF", "#FDFEFC"],
    ["lunar-bloom", "#B0FFA1", "#FFFFFF"],
    ["lunar-crystallize", "#FFD9A4", "#FBFFFB"],
    ["stellar-swirl-anemo", "#F3FFFE", "#6FFBBA"],
    ["stellar-swirl-cryo", "#F0FCFF", "#99F4FC"],
])("gradient CSS preserves the measured %s fill colors", (nameStyle, top, bottom) => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/css/Components/FeatureName.css"), "utf8");
    const selector = ".damage-feature-name-" + nameStyle;
    const start = css.indexOf(selector);
    const end = css.indexOf("}", start);
    const block = css.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(block).toContain("--feature-name-top: " + top);
    expect(block).toContain("--feature-name-bottom: " + bottom);
    expect(css).not.toContain("text-stroke");
    expect(css).not.toContain("drop-shadow");
});
import fs from "fs";
import path from "path";
