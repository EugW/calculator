import { ArtifactSet } from "../../../classes/ArtifactSet";
import { Condition } from "../../../classes/Condition";
import { ConditionAnd } from "../../../classes/Condition/And";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanCharElement } from "../../../classes/Condition/Boolean/CharElement";
import { ConditionHexereiResonance } from "../../../classes/Condition/HexereiResonance";
import { ConditionNot } from "../../../classes/Condition/Not";
import { ConditionReceiver } from "../../../classes/Condition/Receiver";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { ConditionWitchHomework } from "../../../classes/Condition/WitchHomework";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { artifactSetTables } from "../../generated/ArtifactSetTables";
import { percent } from "../../Params";

const ELEMENTS = ['anemo', 'cryo', 'dendro', 'electro', 'geo', 'hydro', 'pyro'];

// "DMG Bonuses provided by Artifact Sets with the same name do not stack":
// one stack key for every part.
const teamPart = (condition, element, value) => new Condition({
    receivers: RECEIVERS.TEAM,
    stack: 'celestial_gift_4',
    condition: condition,
    stats: {['dmg_' + element]: value},
});

const triggered = () => new ConditionAnd([
    new ConditionBoolean({name: 'set.celestial_gift_4'}),
    new ConditionWitchHomework({}),
]);

const wearerElement = (element) => new ConditionBooleanCharElement({element: [element]});

// Light's Guidance: all nearby party members gain 20% DMG Bonus of the
// equipping character's element.
const lightsGuidance = ELEMENTS.map((element) => teamPart(new ConditionAnd([
    triggered(),
    new ConditionNot([new ConditionHexereiResonance({})]),
    wearerElement(element),
]), element, percent(artifactSetTables.CelestialGift.pc4.p1)));

// Mortal Hymn, with Hexerei: Secret Rite: 40% DMG Bonus of the equipping
// character's element and of the active member's element, once when they
// are the same.
const mortalHymn = ELEMENTS.map((element) => teamPart(new ConditionAnd([
    triggered(),
    new ConditionHexereiResonance({}),
    wearerElement(element),
]), element, percent(artifactSetTables.CelestialGift.pc4.p3))).concat(ELEMENTS.map((element) => teamPart(new ConditionAnd([
    triggered(),
    new ConditionHexereiResonance({}),
    new ConditionReceiver({condition: wearerElement(element)}),
    new ConditionNot([wearerElement(element)]),
]), element, percent(artifactSetTables.CelestialGift.pc4.p3))));

export const CelestialGift = new ArtifactSet({
    serializeId: 60,
    goodId: 'CelestialGift',
    gameId: 15045,
    itemIds: [45412, 45413, 45422, 45423, 45432, 45433, 45442, 45443, 45452, 45453, 45513, 45514, 45523, 45524, 45533, 45534, 45543, 45544, 45553, 45554, 23821, 23822, 23823, 23824, 23825, 23826, 23827, 23828, 23829, 23830],
    name: "artifact_set.celestial_gift",
    iconClass: "artifact-icon-celestial-gift",
    minRarity: 4,
    maxRarity: 5,
    setBonus: [
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'set_bonus.celestial_gift_2',
                    description: 'set_descr.celestial_gift_2',
                    stats: {
                        recharge: artifactSetTables.CelestialGift.pc2.recharge,
                    },
                })
            ],
        },
        {},
        {
            conditions: [
                new ConditionBoolean({
                    name: 'set.celestial_gift_4',
                    serializeId: 53,
                    title: 'set_bonus.celestial_gift_4',
                    description: 'set_descr.celestial_gift_4_1',
                    stats: {
                        text_percent: percent(artifactSetTables.CelestialGift.pc4.p1),
                    },
                    subConditions: [
                        new ConditionWitchHomework({}),
                    ],
                }),
                new ConditionStatic({
                    title: 'set_bonus.celestial_gift_4',
                    description: 'set_descr.celestial_gift_4_2',
                    info: {hexerei: true},
                    stats: {
                        text_percent: percent(artifactSetTables.CelestialGift.pc4.p3),
                    },
                    subConditions: [
                        new ConditionBoolean({name: 'set.celestial_gift_4'}),
                        new ConditionWitchHomework({}),
                        new ConditionHexereiResonance({}),
                    ],
                }),
                ...lightsGuidance,
                ...mortalHymn,
            ],
        },
    ],
});
