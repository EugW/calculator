import { ArtifactSet } from "../../../classes/ArtifactSet";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionCalcElements } from "../../../classes/Condition/CalcElements";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { ConditionStaticLevel } from "../../../classes/Condition/Static/Level";
import { StatTable } from "../../../classes/StatTable";
import { artifactSetTables } from "../../generated/ArtifactSetTables";
import { percent, times } from "../../Params";

export const GildedDreams = new ArtifactSet({
    serializeId: 40,
    goodId: 'GildedDreams',
    gameId: 15026,
	itemIds: [21412, 21413, 21422, 21423, 21432, 21433, 21442, 21443, 21452, 21453, 21513, 21514, 21523, 21524, 21533, 21534, 21543, 21544, 21553, 21554, 23631, 23632, 23633, 23634, 23635, 23636, 23637, 23638, 23639, 23640],
    name: "artifact_set.gilded_dreams",
    iconClass: "artifact-icon-gilded-dreams",
    minRarity: 4,
    maxRarity: 5,
    setBonus: [
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'set_bonus.gilded_dreams_2',
                    description: 'set_descr.gilded_dreams_2',
                    stats: {
                        mastery: artifactSetTables.GildedDreams.pc2.mastery,
                    },
                }),
            ],
        },
        {},
        {
            conditions: [
                new ConditionBoolean({
                    name: 'set.gilded_dreams_4',
                    serializeId: 27,
                    title: 'set_bonus.gilded_dreams_4',
                    description: 'set_descr.gilded_dreams_4_1',
                    stats: {
                        text_percent: percent(artifactSetTables.GildedDreams.pc4.p1),
                        text_value: artifactSetTables.GildedDreams.pc4.p2,
                    },
                }),
                new ConditionCalcElements({}),
                new ConditionStaticLevel({
                    title: 'set_bonus.gilded_dreams_4',
                    description: 'set_descr.gilded_dreams_4_2',
                    levelSetting: 'party_elements_same',
                    fromZero: true,
                    stats: [
                        new StatTable('text_percent', [percent(artifactSetTables.GildedDreams.pc4.p1)]),
                        new StatTable('atk_percent', times(percent(artifactSetTables.GildedDreams.pc4.p1), [0, 1, 2, 3])),
                        new StatTable('text_value', [0.001, 1, 2, 3]),
                    ],
                    subConditions: [
                        new ConditionBoolean({name: 'set.gilded_dreams_4'}),
                        new ConditionBoolean({name: 'party_elements_same'}),
                    ],
                }),
                new ConditionStaticLevel({
                    title: 'set_bonus.gilded_dreams_4',
                    description: 'set_descr.gilded_dreams_4_3',
                    levelSetting: 'party_elements_different',
                    fromZero: true,
                    stats: [
                        new StatTable('text_value', [artifactSetTables.GildedDreams.pc4.p2]),
                        new StatTable('mastery', times(artifactSetTables.GildedDreams.pc4.p2, [0, 1, 2, 3])),
                        new StatTable('text_value2', [0.001, 1, 2, 3]),
                    ],
                    subConditions: [
                        new ConditionBoolean({name: 'set.gilded_dreams_4'}),
                        new ConditionBoolean({name: 'party_elements_different'}),
                    ],
                }),
            ],
        },
    ],
});
