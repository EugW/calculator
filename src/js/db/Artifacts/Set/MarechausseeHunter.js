import { ArtifactSet } from "../../../classes/ArtifactSet";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { StatTable } from "../../../classes/StatTable";
import { artifactSetTables } from "../../generated/ArtifactSetTables";
import { percent, times } from "../../Params";

export const MarechausseeHunter = new ArtifactSet({
    serializeId: 46,
    goodId: 'MarechausseeHunter',
    gameId: 15031,
	itemIds: [31412, 31413, 31422, 31423, 31432, 31433, 31442, 31443, 31452, 31453, 31513, 31514, 31523, 31524, 31533, 31534, 31543, 31544, 31553, 31554, 23681, 23682, 23683, 23684, 23685, 23686, 23687, 23688, 23689, 23690],
    name: 'artifact_set.marechaussee_hunter',
    iconClass: 'artifact-icon-marechaussee-hunter',
    minRarity: 4,
    maxRarity: 5,
    setBonus: [
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'set_bonus.marechaussee_hunter_2',
                    description: 'set_descr.marechaussee_hunter_2',
                    settings: {},
                    stats: {
                        dmg_normal: percent(artifactSetTables.MarechausseeHunter.pc2.p1),
                        dmg_charged: percent(artifactSetTables.MarechausseeHunter.pc2.p1),
                    },
                })
            ],
        },
        {},
        {
            conditions: [
                new ConditionStacks({
                    name: 'set.marechaussee_hunter_4',
                    serializeId: 33,
                    title: 'set_bonus.marechaussee_hunter_4',
                    description: 'set_descr.marechaussee_hunter_4',
                    maxStacks: artifactSetTables.MarechausseeHunter.pc4.p3,
                    stats: [
                        new StatTable('crit_rate', times(percent(artifactSetTables.MarechausseeHunter.pc4.p1), [1, 2, 3])),
                    ],
                })
            ],
        },
    ],
});
