import { Artifacts } from "../src/js/db/Buffs/Artifacts";
import { DB } from "../src/js/db/DB";

global.DB = DB;

function getSetCondition(setName, pieces, conditionName) {
    const conditions = DB.Artifacts.Sets.get(setName).getConditionsByPieces()[pieces];

    if (!conditionName) {
        return conditions[0];
    }

    return conditions.find((condition) => condition.getName() === conditionName);
}

function getBuffCondition(name) {
    return Artifacts.getConditions().find((condition) => condition.getName() === name);
}

function getResistanceCondition(stat) {
    return Artifacts.getConditions().find((condition) => {
        return condition.params.stats && condition.params.stats[stat] == -40;
    });
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

test("Heart of the Furnace applies wearer ATK and the umbrella Stellar Glimmer bonus", () => {
    const twoPiece = getSetCondition("HeartOfTheFurnace", 2);
    const fourPiece = getSetCondition("HeartOfTheFurnace", 4, "set.heart_of_the_furnace_4");

    expect(twoPiece.getStats({}).get("atk_percent")).toBe(18);
    expect(fourPiece.getId()).toBe(57);

    const active = fourPiece.getData({"set.heart_of_the_furnace_4": true}).stats;
    expect(active.get("atk_percent")).toBe(12);
    expect(active.get("dmg_stellarglimmer")).toBe(50);
});

test("Heart of the Furnace party bonus works off-field and cannot stack with the wearer's copy", () => {
    const partyBuff = getBuffCondition("set_other.heart_of_the_furnace_4");
    const selfBuff = getSetCondition("HeartOfTheFurnace", 4, "set.heart_of_the_furnace_4");

    expect(partyBuff).toBeTruthy();
    expect(partyBuff.getId()).toBe(73);

    const offField = partyBuff.getData({"set_other.heart_of_the_furnace_4": true}).stats;
    expect(offField.get("dmg_stellarglimmer")).toBe(50);
    expect(offField.get("atk_percent")).toBe(0);

    const bothSettings = {
        "set.heart_of_the_furnace_4": true,
        "set_other.heart_of_the_furnace_4": true,
        "set_pieces.heartofthefurnace": 4,
    };
    const selfStats = selfBuff.getData(bothSettings).stats;
    const partyStats = partyBuff.getData(bothSettings).stats;

    expect(selfStats.get("dmg_stellarglimmer")).toBe(50);
    expect(partyStats.get("dmg_stellarglimmer")).toBe(0);
    expect(selfStats.get("dmg_stellarglimmer") + partyStats.get("dmg_stellarglimmer")).toBe(50);
});

test("Viridescent Venerer buffs Stellar Swirl and its Cryo shred does not double-stack", () => {
    const fourPieceConditions = DB.Artifacts.Sets.get("ViridescentVenerer").getConditionsByPieces()[4];
    const damageBonus = fourPieceConditions.find((condition) => condition.getType() === "static");
    const stellarTrigger = getSetCondition(
        "ViridescentVenerer",
        4,
        "set.viridescent_venerer_4_stellarswirl",
    );
    const partyTrigger = getBuffCondition("set_other.viridescent_venerer_4_stellarswirl");
    const cryoShred = getResistanceCondition("enemy_res_cryo");

    expect(damageBonus.getStats({}).get("dmg_reaction_swirl")).toBe(60);
    expect(damageBonus.getStats({}).get("dmg_stellarswirl")).toBe(20);
    expect(stellarTrigger.getId()).toBe(55);
    expect(partyTrigger.getId()).toBe(72);

    const selfSettings = {
        char_element: "anemo",
        "set_pieces.viridescentvenerer": 4,
        "set.viridescent_venerer_4_stellarswirl": true,
    };
    expect(cryoShred.getData(selfSettings).stats.get("enemy_res_cryo")).toBe(-40);

    const selfNormalAndStellar = {
        ...selfSettings,
        "set.viridescent_venerer_4": "cryo",
    };
    expect(cryoShred.getData(selfNormalAndStellar).stats.get("enemy_res_cryo")).toBe(-40);

    const partyNormalAndStellar = {
        "set_other.viridescent_venerer_4": "cryo",
        "set_other.viridescent_venerer_4_stellarswirl": true,
    };
    expect(cryoShred.getData(partyNormalAndStellar).stats.get("enemy_res_cryo")).toBe(-40);

    expect(cryoShred.getData({}).stats.get("enemy_res_cryo")).toBe(0);
    expect(cryoShred.getData({
        ...selfSettings,
        char_element: "hydro",
    }).stats.get("enemy_res_cryo")).toBe(0);
});
