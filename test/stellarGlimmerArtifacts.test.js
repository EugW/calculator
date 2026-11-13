import { Artifact } from "../src/js/classes/Artifact";
import { CalcObjectArtifacts } from "../src/js/classes/CalcObject/Artifacts";
import { loadLegacyTeam } from "../src/js/classes/Legacy/Team";
import { Team } from "../src/js/classes/Team";
import { LEGACY_KINDS } from "../src/js/classes/Team/Legacy";
import { getReceivers, RECEIVERS } from "../src/js/classes/Team/Receivers";
import { getStackKey } from "../src/js/classes/Team/Stacking";
import { DB } from "../src/js/db/DB";
import { makeBaseBuild } from "./support/baseline";
import { equipSet } from "./support/teamConversion";
import { stackKeys } from "./support/team";

global.DB = DB;

const VV_ELEMENTS = "set.viridescent_venerer_4";
const VV_STELLAR_SWIRL = VV_ELEMENTS + "_stellarswirl";

function getSetCondition(setName, pieces, conditionName) {
    const conditions = DB.Artifacts.Sets.get(setName).getConditionsByPieces()[pieces];

    if (!conditionName) {
        return conditions[0];
    }

    return conditions.find((condition) => condition.getName() === conditionName);
}

function getStackPart(setName, key) {
    return DB.Artifacts.Sets.get(setName).getConditionsByPieces()[4].find((condition) => getStackKey(condition) == key);
}

function furnaceWearer(charKey) {
    const build = makeBaseBuild(charKey, 0);
    equipSet("HeartOfTheFurnace", 4)(build);
    build.setArtifactsSettings({"set.heart_of_the_furnace_4": true});
    return build;
}

function venererWearer(charKey) {
    const build = makeBaseBuild(charKey, 0);
    equipSet("ViridescentVenerer", 4)(build);
    build.setArtifactsSettings({[VV_ELEMENTS]: "cryo"});
    return build;
}

test("stable 7.0 Stellar Glimmer artifact sets are registered with append-only IDs", () => {
    const scarlet = DB.Artifacts.Sets.get("ScarletProof");
    const heart = DB.Artifacts.Sets.get("HeartOfTheFurnace");

    expect(scarlet.getId()).toBe(62);
    expect(scarlet.gameId).toBe(15047);
    expect(scarlet.getGoodId()).toBe("ScarletProof");
    expect(scarlet.itemIds).toHaveLength(30);
    expect(scarlet.itemIds).toEqual(expect.arrayContaining([23841, 23850, 47412, 47554]));
    expect(DB.Artifacts.Sets.getKeyByItem(47412)).toBe("ScarletProof");
    expect(DB.Artifacts.Sets.getKeyByItem(23850)).toBe("ScarletProof");

    expect(heart.getId()).toBe(63);
    expect(heart.gameId).toBe(15048);
    expect(heart.getGoodId()).toBe("HeartOfTheFurnace");
    expect(heart.itemIds).toHaveLength(30);
    expect(heart.itemIds).toEqual(expect.arrayContaining([23851, 23860, 48412, 48554]));
    expect(DB.Artifacts.Sets.getKeyByItem(48412)).toBe("HeartOfTheFurnace");
    expect(DB.Artifacts.Sets.getKeyByItem(23860)).toBe("HeartOfTheFurnace");
});

test("Scarlet Proof applies its exact two-piece and triggered four-piece stats", () => {
    const twoPiece = getSetCondition("ScarletProof", 2);
    const fourPiece = getSetCondition("ScarletProof", 4, "set.scarlet_proof_4");

    expect(twoPiece.getStats({}).get("atk_percent")).toBe(18);
    expect(fourPiece.getId()).toBe(56);
    expect(fourPiece.getData({"set.scarlet_proof_4": false}).stats.get("crit_rate")).toBe(0);

    const active = fourPiece.getData({"set.scarlet_proof_4": true}).stats;
    expect(active.get("crit_rate")).toBe(16);
    expect(active.get("dmg_stellarswirl")).toBe(40);
    expect(active.get("dmg_stellarglimmer")).toBe(0);
});

test("Heart of the Furnace gives its wearer ATK and the team the Stellar Glimmer bonus", () => {
    const twoPiece = getSetCondition("HeartOfTheFurnace", 2);
    const fourPiece = getSetCondition("HeartOfTheFurnace", 4, "set.heart_of_the_furnace_4");
    const teamPart = getStackPart("HeartOfTheFurnace", "heart_of_the_furnace_4");

    expect(twoPiece.getStats({}).get("atk_percent")).toBe(18);
    expect(fourPiece.getId()).toBe(57);

    const on = {"set.heart_of_the_furnace_4": true};
    expect(fourPiece.getData(on).stats.get("atk_percent")).toBe(12);
    expect(fourPiece.getData(on).stats.get("dmg_stellarglimmer")).toBe(0);

    expect(getReceivers(teamPart)).toBe(RECEIVERS.TEAM);
    expect(teamPart.getData(on).stats.get("dmg_stellarglimmer")).toBe(50);
    expect(teamPart.getData(on).stats.get("atk_percent")).toBe(0);
    expect(teamPart.getData({}).stats.get("dmg_stellarglimmer")).toBe(0);
});

test("Heart of the Furnace reaches off-field teammates and does not stack with a second copy", () => {
    const receiver = makeBaseBuild("Hutao", 0);
    const base = Team.solo(receiver).getBuildData().stats;
    const first = furnaceWearer("Albedo");
    const second = furnaceWearer("Beidou");

    const team = Team.fromMember(receiver);
    team.setMember(1, first);
    team.setMember(2, second);
    expect(stackKeys(team)).toEqual(["heart_of_the_furnace_4"]);

    const stats = receiver.getBuildData().stats;
    expect(stats.get("dmg_stellarglimmer") - base.get("dmg_stellarglimmer")).toBeCloseTo(0.5, 10);
    expect(stats.get("atk_percent") - base.get("atk_percent")).toBeCloseTo(0, 10);

    // the wearer keeps its own ATK and gets the team bonus once
    const wearerStats = first.getBuildData().stats;
    expect(wearerStats.get("dmg_stellarglimmer")).toBeCloseTo(0.5, 10);
});

test("Viridescent Venerer buffs Stellar Swirl and its Cryo shred does not double-stack", () => {
    const fourPieceConditions = DB.Artifacts.Sets.get("ViridescentVenerer").getConditionsByPieces()[4];
    const damageBonus = fourPieceConditions.find((condition) => condition.getType() === "static");
    const selfTrigger = getSetCondition("ViridescentVenerer", 4, VV_ELEMENTS);
    const cryoShred = getStackPart("ViridescentVenerer", "viridescent_venerer_4_cryo");

    expect(damageBonus.getStats({}).get("dmg_reaction_swirl")).toBe(60);
    expect(damageBonus.getStats({}).get("dmg_stellarswirl")).toBe(20);
    expect(selfTrigger.getId()).toBe(17);
    // The element selection is the set's only control: a Stellar Swirl on
    // Cryo is its Cryo choice.
    expect(fourPieceConditions.filter((condition) => condition.getName() && !condition.isHidden({})))
        .toEqual([selfTrigger]);
    expect(getReceivers(cryoShred)).toBe(RECEIVERS.TEAM);

    const selfSettings = {
        char_element: "anemo",
        [VV_ELEMENTS]: "cryo",
    };
    expect(cryoShred.getData(selfSettings).stats.get("enemy_res_cryo")).toBe(-40);

    // the old checkbox on its own is no shred any more
    expect(cryoShred.getData({char_element: "anemo", [VV_STELLAR_SWIRL]: true}).stats.get("enemy_res_cryo")).toBe(0);

    expect(cryoShred.getData({}).stats.get("enemy_res_cryo")).toBe(0);
    expect(cryoShred.getData({
        ...selfSettings,
        char_element: "hydro",
    }).stats.get("enemy_res_cryo")).toBe(0);

    // two wearers shred Cryo once: the one joining later yields the key
    const receiver = makeBaseBuild("Hutao", 0);
    const base = Team.solo(receiver).getBuildData().stats;
    const team = Team.fromMember(receiver);
    team.setMember(1, venererWearer("Sucrose"));
    team.setMember(2, venererWearer("Venti"));
    expect(stackKeys(team)).toEqual(["viridescent_venerer_4_cryo"]);
    expect(receiver.getBuildData().stats.get("enemy__res_cryo") - base.get("enemy__res_cryo")).toBeCloseTo(-0.4, 10);
});

describe("Viridescent Venerer's old Stellar Swirl checkbox is read and ignored", () => {
    const SELECTION_ID = 17;
    const CHECKBOX_ID = 55;
    const context = {char_element: "anemo"};
    const cryoShred = () => getStackPart("ViridescentVenerer", "viridescent_venerer_4_cryo");

    function wornVenerer() {
        const artifacts = new CalcObjectArtifacts();
        for (const [slot, mainStat] of [["flower", "hp"], ["plume", "atk"], ["sands", "atk_percent"], ["goblet", "dmg_anemo"]]) {
            artifacts.set(new Artifact(5, 20, slot, "ViridescentVenerer", mainStat));
        }
        return artifacts;
    }

    // The pieces of a serialized build, without its empty profile and member state.
    const serializedPieces = () => wornVenerer().serialize().slice(0, -2);

    // The selection is the user's: the checkbox adds no Cryo to it.
    test.each([
        [[1, CHECKBOX_ID], ""],
        [[2, SELECTION_ID, 8, CHECKBOX_ID], "pyro"],
        [[2, CHECKBOX_ID, SELECTION_ID, 8], "pyro"],
        [[2, SELECTION_ID, 9, CHECKBOX_ID], "cryo;pyro"],
    ])("a build saved before set-bonus profiles, with controls %j", (conditions, expected) => {
        const input = [...serializedPieces(), ...conditions, 999];
        const loaded = CalcObjectArtifacts.deserialize(input);
        expect(loaded).not.toBeNull();
        expect(input).toEqual([999]);

        const settings = loaded.getSettings();
        expect(settings[VV_ELEMENTS]).toBe(expected);
        expect(settings[VV_STELLAR_SWIRL]).toBeUndefined();
        expect(cryoShred().getData({...settings, ...context}).stats.get("enemy_res_cryo"))
            .toBe(expected.includes("cryo") ? -40 : 0);

        const again = CalcObjectArtifacts.deserialize(loaded.serialize(), {profile: true});
        expect(again.getSettings()[VV_ELEMENTS]).toBe(expected);
        expect(again.getSettings()[VV_STELLAR_SWIRL]).toBeUndefined();
    });

    test("a profile saved with the checkbox reads it and drops it", () => {
        // Profile: the selection (Pyro) and the checkbox; no member state.
        const input = [...serializedPieces(), 2, SELECTION_ID, 8, CHECKBOX_ID, 0, 0, 999];
        const loaded = CalcObjectArtifacts.deserialize(input, {profile: true});
        expect(loaded).not.toBeNull();
        expect(input).toEqual([999]);
        expect(loaded.getProfileSettings()).toEqual({[VV_ELEMENTS]: "pyro"});
        expect(loaded.getSettings()[VV_STELLAR_SWIRL]).toBeUndefined();
    });

    test("settings that still name the checkbox do not keep it", () => {
        const artifacts = wornVenerer();
        artifacts.setSettings({[VV_ELEMENTS]: "hydro", [VV_STELLAR_SWIRL]: true});
        expect(artifacts.getSettings()[VV_ELEMENTS]).toBe("hydro");
        expect(artifacts.getSettings()[VV_STELLAR_SWIRL]).toBeUndefined();
    });

    test("the old Buffs tab's row is read and ignored", () => {
        const legacy = (buffs) => ({party: [], settings: {}, dropped: [], buffs});
        const floatingSets = (team) => team.legacy.getEntries().filter((entry) => entry.kind == LEGACY_KINDS.SET);

        const receiver = makeBaseBuild("Hutao", 0);
        const base = Team.solo(receiver).getBuildData().stats;
        const team = Team.fromMember(receiver);
        const report = loadLegacyTeam(team, legacy({
            "set_other.viridescent_venerer_4": "hydro",
            "set_other.viridescent_venerer_4_stellarswirl": true,
        }));

        expect(report.dropped).toEqual([]);
        expect(floatingSets(team).map((entry) => entry.getSet())).toEqual(["ViridescentVenerer"]);
        expect(floatingSets(team)[0].getSettings()[VV_ELEMENTS]).toBe("hydro");

        const stats = receiver.getBuildData().stats;
        expect(stats.get("enemy__res_hydro") - base.get("enemy__res_hydro")).toBeCloseTo(-0.4, 10);
        expect(stats.get("enemy__res_cryo") - base.get("enemy__res_cryo")).toBeCloseTo(0, 10);

        // On its own the row makes no entry.
        const alone = Team.fromMember(makeBaseBuild("Hutao", 0));
        const aloneReport = loadLegacyTeam(alone, legacy({"set_other.viridescent_venerer_4_stellarswirl": true}));
        expect(aloneReport.dropped).toEqual([]);
        expect(floatingSets(alone)).toEqual([]);
    });
});
