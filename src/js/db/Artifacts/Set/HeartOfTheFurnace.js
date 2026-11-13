import { ArtifactSet } from "../../../classes/ArtifactSet";
import { Condition } from "../../../classes/Condition";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { artifactSetTables } from "../../generated/ArtifactSetTables";
import { percent } from "../../Params";

export const HeartOfTheFurnace = new ArtifactSet({
    serializeId: 63,
    goodId: 'HeartOfTheFurnace',
    gameId: 15048,
    itemIds: [48412, 48413, 48422, 48423, 48432, 48433, 48442, 48443, 48452, 48453, 48513, 48514, 48523, 48524, 48533, 48534, 48543, 48544, 48553, 48554, 23851, 23852, 23853, 23854, 23855, 23856, 23857, 23858, 23859, 23860],
    name: "artifact_set.heart_of_the_furnace",
    iconClass: "artifact-icon-heart-of-the-furnace",
    minRarity: 4,
    maxRarity: 5,
    setBonus: [
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'set_bonus.heart_of_the_furnace_2',
                    description: 'set_descr.heart_of_the_furnace_2',
                    stats: {
                        atk_percent: artifactSetTables.HeartOfTheFurnace.pc2.atk_percent,
                    },
                }),
            ],
        },
        {},
        {
            conditions: [
                new ConditionBoolean({
                    name: 'set.heart_of_the_furnace_4',
                    serializeId: 57,
                    title: 'set_bonus.heart_of_the_furnace_4',
                    description: 'set_descr.heart_of_the_furnace_4',
                    stats: {
                        atk_percent: percent(artifactSetTables.HeartOfTheFurnace.pc4.p1),
                    },
                }),
                new Condition({
                    receivers: RECEIVERS.TEAM,
                    stack: 'heart_of_the_furnace_4',
                    condition: new ConditionBoolean({name: 'set.heart_of_the_furnace_4'}),
                    stats: {dmg_stellarglimmer: percent(artifactSetTables.HeartOfTheFurnace.pc4.p2)},
                }),
            ],
        },
    ],
});
