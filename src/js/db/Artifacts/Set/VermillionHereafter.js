import { ArtifactSet } from "../../../classes/ArtifactSet";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { StatTable } from "../../../classes/StatTable";
import { artifactSetTables } from "../../generated/ArtifactSetTables";
import { percent } from "../../Params";

export const VermillionHereafter = new ArtifactSet({
    serializeId: 39,
    goodId: 'VermillionHereafter',
    gameId: 15023,
	itemIds: [97412, 97413, 97422, 97423, 97432, 97433, 97442, 97443, 97452, 97453, 97513, 97514, 97523, 97524, 97533, 97534, 97543, 97544, 97553, 97554, 23601, 23602, 23603, 23604, 23605, 23606, 23607, 23608, 23609, 23610],
    name: "artifact_set.vermillion_hereafter",
    iconClass: "artifact-icon-vermillion-hereafter",
    minRarity: 4,
    maxRarity: 5,
    setBonus: [
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'set_bonus.vermillion_hereafter_2',
                    description: 'set_descr.vermillion_hereafter_2',
                    stats: {
                        atk_percent: artifactSetTables.VermillionHereafter.pc2.atk_percent,
                    },
                })
            ],
        },
        {},
        {
            conditions: [
                new ConditionBoolean({
                    name: 'set.vermillion_hereafter_4_burst',
                    serializeId: 23,
                    title: 'set_bonus.vermillion_hereafter_4',
                    description: 'set_descr.vermillion_hereafter_4_1',
                    stats: {
                        atk_percent: percent(artifactSetTables.VermillionHereafter.pc4.p2),
                    },
                }),
                new ConditionStacks({
                    name: 'set.vermillion_hereafter_4_stacks',
                    serializeId: 24,
                    title: 'set_bonus.vermillion_hereafter_4',
                    description: 'set_descr.vermillion_hereafter_4_2',
                    maxStacks: artifactSetTables.VermillionHereafter.pc4.p4,
                    stats: [
                        new StatTable('atk_percent', [percent(artifactSetTables.VermillionHereafter.pc4.p3)]),
                    ],
                    condition: new ConditionBoolean({
                        name: 'set.vermillion_hereafter_4_burst',
                    }),
                }),
            ],
        },
    ],
});
