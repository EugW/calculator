import { ArtifactSet } from "../../../classes/ArtifactSet";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { ConditionWitchHomework } from "../../../classes/Condition/WitchHomework";

export const ADayCarvedFromRisingWinds = new ArtifactSet({
    serializeId: 59,
    goodId: 'ADayCarvedFromRisingWinds',
    gameId: 15044,
    itemIds: [44412, 44413, 44422, 44423, 44432, 44433, 44442, 44443, 44452, 44453, 44513, 44514, 44523, 44524, 44533, 44534, 44543, 44544, 44553, 44554, 23811, 23812, 23813, 23814, 23815, 23816, 23817, 23818, 23819, 23820],
    name: "artifact_set.a_day_carved_from_rising_winds",
    iconClass: "artifact-icon-a-day-carved-from-rising-winds",
    minRarity: 4,
    maxRarity: 5,
    setBonus: [
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'set_bonus.a_day_carved_from_rising_winds_2',
                    description: 'set_descr.a_day_carved_from_rising_winds_2',
                    stats: {
                        atk_percent: 18,
                    },
                })
            ],
        },
        {},
        {
            conditions: [
                // Blessing of Pastoral Winds: ATK +25%
                new ConditionBoolean({
                    name: 'set.a_day_carved_from_rising_winds_4',
                    serializeId: 52,
                    title: 'set_bonus.a_day_carved_from_rising_winds_4',
                    description: 'set_descr.a_day_carved_from_rising_winds_4_1',
                    stats: {
                        atk_percent: 25,
                    },
                }),
                // Resolve of Pastoral Winds: Additional CRIT Rate +20% when Witch's Homework completed
                new ConditionStatic({
                    title: 'set_bonus.a_day_carved_from_rising_winds_4',
                    description: 'set_descr.a_day_carved_from_rising_winds_4_2',
                    info: {hexerei: true},
                    stats: {
                        crit_rate: 20,
                    },
                    subConditions: [
                        new ConditionBoolean({name: 'set.a_day_carved_from_rising_winds_4'}),
                        new ConditionWitchHomework({}),
                    ],
                }),
            ],
        },
    ],
});
