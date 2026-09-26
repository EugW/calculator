import { Artifact } from "../src/js/classes/Artifact";
import { CalcObjectArtifacts } from "../src/js/classes/CalcObject/Artifacts";
import { CalcObjectBuffs } from "../src/js/classes/CalcObject/Buffs";
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
    const selfTrigger = getSetCondition(
        "ViridescentVenerer",
        4,
        "set.viridescent_venerer_4",
    );
    const partyTrigger = getBuffCondition("set_other.viridescent_venerer_4");
    const cryoShred = getResistanceCondition("enemy_res_cryo");

    expect(damageBonus.getStats({}).get("dmg_reaction_swirl")).toBe(60);
    expect(damageBonus.getStats({}).get("dmg_stellarswirl")).toBe(20);
    expect(selfTrigger.getId()).toBe(17);
    expect(partyTrigger.getId()).toBe(8);
    expect(fourPieceConditions.filter((condition) => !condition.isHidden({}) && condition.getType() !== 'static'))
        .toEqual([selfTrigger]);
    expect(Artifacts.getConditions().filter((condition) =>
        !condition.isHidden({}) && condition.params.title === 'set_bonus.viridescent_venerer_4'
    )).toEqual([partyTrigger]);

    const selfSettings = {
        char_element: "anemo",
        "set_pieces.viridescentvenerer": 4,
        "set.viridescent_venerer_4": "cryo",
    };
    expect(cryoShred.getData(selfSettings).stats.get("enemy_res_cryo")).toBe(-40);

    const selfAndParty = {
        ...selfSettings,
        "set_other.viridescent_venerer_4": "cryo",
    };
    expect(cryoShred.getData(selfAndParty).stats.get("enemy_res_cryo")).toBe(-40);

    const partySettings = {
        "set_other.viridescent_venerer_4": "cryo",
    };
    expect(cryoShred.getData(partySettings).stats.get("enemy_res_cryo")).toBe(-40);

    expect(cryoShred.getData({}).stats.get("enemy_res_cryo")).toBe(0);
    expect(cryoShred.getData({
        ...selfSettings,
        char_element: "hydro",
    }).stats.get("enemy_res_cryo")).toBe(0);
});

test.each([
    ['self', CalcObjectArtifacts, 'set', 17, 55],
    ['party', CalcObjectBuffs, 'set_other', 8, 72],
])('old %s VV checkbox migrates to the existing Cryo selection', (scope, CalcClass, prefix, selectorId, legacyId) => {
    const name = prefix + '.viridescent_venerer_4';
    const legacyName = name + '_stellarswirl';
    const cryoShred = getResistanceCondition('enemy_res_cryo');
    const saved = new CalcClass();
    if (scope === 'self') {
        for (const [slot, mainStat] of [['flower', 'hp'], ['plume', 'atk'], ['sands', 'atk_percent'], ['goblet', 'dmg_anemo']]) {
            saved.set(new Artifact(5, 20, slot, 'ViridescentVenerer', mainStat));
        }
    }
    const serializedArtifacts = scope === 'self' ? saved.serialize({}).slice(0, -1) : [];

    for (const [conditions, expectedMask] of [
        [[1, legacyId], 1],
        [[2, selectorId, 8, legacyId], 9],
        [[2, legacyId, selectorId, 8], 9],
        [[2, selectorId, 9, legacyId], 9],
    ]) {
        const input = [...serializedArtifacts, ...conditions, 999];
        const loaded = CalcClass.deserialize(input);
        expect(loaded).not.toBeNull();
        expect(input).toEqual([999]);
        const settings = loaded.getSettings();
        const elements = settings[name].split(';');
        expect(elements.filter((element) => element === 'cryo')).toHaveLength(1);
        expect(elements.includes('pyro')).toBe(expectedMask === 9);
        expect(settings[legacyName]).toBeUndefined();

        const context = {char_element: 'anemo', 'set_pieces.viridescentvenerer': 4};
        expect(cryoShred.getData({...settings, ...context}).stats.get('enemy_res_cryo')).toBe(-40);
        const vvConditions = loaded.getConditions().filter((condition) => [name, legacyName].includes(condition.getName()));
        expect(loaded.serializeConditions({...settings, ...context}, vvConditions))
            .toEqual([1, selectorId, expectedMask]);
        const roundTrip = CalcClass.deserialize(loaded.serialize({...settings, ...context}));
        expect(roundTrip.getSettings()[name].split(';').sort()).toEqual(elements.sort());
        expect(roundTrip.getSettings()[legacyName]).toBeUndefined();

        loaded.modifySettings({[name]: 'pyro'});
        expect(cryoShred.getData({...loaded.getSettings(), ...context}).stats.get('enemy_res_cryo')).toBe(0);
    }

    const savedSettings = {[name]: 'hydro', [legacyName]: true};
    const loaded = new CalcClass();
    loaded.setSettings(savedSettings);
    expect(loaded.getSettings()[name]).toBe('hydro;cryo');
    expect(loaded.getSettings()[legacyName]).toBeUndefined();
    expect(savedSettings).toEqual({[name]: 'hydro', [legacyName]: true});
});
