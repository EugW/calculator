import { Condition } from "../src/js/classes/Condition";
import { DB } from "../src/js/db/DB";
import { Artifacts as ArtifactBuffs } from "../src/js/db/Buffs/Artifacts";
import { Weapons as WeaponBuffs } from "../src/js/db/Buffs/Weapons";

global.window = {};
require("../src/js/lang/eng.js");
const english = window.lang_strings;
require("../src/js/lang/rus.js");
const russian = window.lang_strings;
global.DB = DB;

const characterKeys = [
    'TravelerCryo',
    'Alyosha',
    'Odette',
    'Vodyanitsa',
    'Vesna',
];

const weaponKeys = {
    sword: [
        'HereticsMoltenBlade',
        'Emberwell',
        'WhitelakeFrostfeather',
        'NewBough',
        'SilverLight',
        'BeyondTheChrysalis',
    ],
    claymore: ['ForgedByTheGoldenMelody', 'BladeOfAtonement'],
    polearm: ['Frostbreath', 'SongOfTheVigil'],
    catalyst: ['ClashOfKings', 'EchoesOfTheHeart', 'WintersHeavyHeart', 'HymnofTheMaelstrom'],
    bow: ['JadeVista', 'CovenantOfFrostAndSnow', 'BreezeborneRefrain'],
};

function localized(strings, key) {
    if (!key) return '';
    const [category, name] = key.toLowerCase().split('.');
    return strings[category] && strings[category][name] || key;
}

function visibleConditions(conditions) {
    return Condition.unwrap(conditions).filter((condition) => (
        !condition.params.isHidden && condition.params.title
    ));
}

function duplicateText(conditions, strings) {
    const seen = new Map();
    const duplicates = [];

    for (const condition of visibleConditions(conditions)) {
        const title = localized(strings, condition.params.title);
        const description = localized(strings, condition.params.description);
        const signature = `${title}\u0000${description}`;
        const previous = seen.get(signature);

        if (previous) {
            duplicates.push({
                title,
                conditions: [previous, condition.getName() || condition.params.description],
            });
        } else {
            seen.set(signature, condition.getName() || condition.params.description);
        }
    }

    return duplicates;
}

function duplicateBareHeadings(conditions, strings) {
    const headings = new Map();

    for (const condition of visibleConditions(conditions)) {
        const title = localized(strings, condition.params.title);
        const descriptions = headings.get(title) || [];
        descriptions.push(localized(strings, condition.params.description));
        headings.set(title, descriptions);
    }

    return [...headings.entries()]
        .filter(([, descriptions]) => descriptions.length > 1 && descriptions.includes(''))
        .map(([title]) => title);
}

function expectPanelTextToBeDistinct(panel, conditions) {
    for (const [language, strings] of [['eng', english], ['rus', russian]]) {
        expect({panel, language, duplicates: duplicateText(conditions, strings)})
            .toEqual({panel, language, duplicates: []});
        expect({panel, language, bareHeadings: duplicateBareHeadings(conditions, strings)})
            .toEqual({panel, language, bareHeadings: []});
    }
}

test('new character switch text is distinct within each self and party panel', () => {
    for (const key of characterKeys) {
        const character = DB.Chars.get(key);
        expectPanelTextToBeDistinct(`${key}:self`, character.getAllConditions());
        expectPanelTextToBeDistinct(`${key}:party`, character.getPartyConditions());
    }
});

test('new weapon switch text is distinct within each weapon panel', () => {
    for (const [type, keys] of Object.entries(weaponKeys)) {
        for (const key of keys) {
            expectPanelTextToBeDistinct(
                `${type}:${key}`,
                DB.Weapons.get(type).get(key).getConditions(),
            );
        }
    }
});

test('new and updated artifact switch text is distinct in self and party panels', () => {
    for (const key of ['ViridescentVenerer', 'ScarletProof', 'HeartOfTheFurnace']) {
        const byPieces = DB.Artifacts.Sets.get(key).getConditionsByPieces();
        for (const [pieces, conditions] of Object.entries(byPieces)) {
            expectPanelTextToBeDistinct(`${key}:${pieces}`, conditions);
        }
    }

    const artifactPartyConditions = Condition.unwrap(ArtifactBuffs.getConditions()).filter(
        (condition) => /^set_other\.(viridescent_venerer|heart_of_the_furnace)/
            .test(condition.getName() || ''),
    );
    expectPanelTextToBeDistinct('artifacts:party', artifactPartyConditions);
});

test('new party weapon controls do not repeat their source card text', () => {
    const partyConditions = Condition.unwrap(WeaponBuffs.getConditions()).filter(
        (condition) => /^weapon_other\.(weapon_hymn_of_the_maelstrom|weapon_breezeborne_refrain)/
            .test(condition.getName() || ''),
    );
    expectPanelTextToBeDistinct('weapons:party', partyConditions);
});