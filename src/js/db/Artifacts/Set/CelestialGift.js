import { ArtifactSet } from "../../../classes/ArtifactSet";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionHexereiResonance } from "../../../classes/Condition/HexereiResonance";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { ConditionWitchHomework } from "../../../classes/Condition/WitchHomework";

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
                        recharge: 20,
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
                        dmg_own: 20,
                        text_percent: 20,
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
                        dmg_own: 20,
                        text_percent: 40,
                    },
                    subConditions: [
                        new ConditionBoolean({name: 'set.celestial_gift_4'}),
                        new ConditionWitchHomework({}),
                        new ConditionHexereiResonance({}),
                    ],
                }),
            ],
        },
    ],
});
