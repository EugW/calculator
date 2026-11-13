import { ArtifactSet } from "../../../classes/ArtifactSet";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { StatTable } from "../../../classes/StatTable";
import { artifactSetTables } from "../../generated/ArtifactSetTables";
import { percent, times } from "../../Params";

export const VourukashasGlow = new ArtifactSet({
    serializeId: 45,
    goodId: 'VourukashasGlow',
    gameId: 15030,
	itemIds: [30412, 30413, 30422, 30423, 30432, 30433, 30442, 30443, 30452, 30453, 30513, 30514, 30523, 30524, 30533, 30534, 30543, 30544, 30553, 30554, 23671, 23672, 23673, 23674, 23675, 23676, 23677, 23678, 23679, 23680],
    name: "artifact_set.vourukashas_glow",
    iconClass: "artifact-icon-vourukashas-glow",
    minRarity: 4,
    maxRarity: 5,
    setBonus: [
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'set_bonus.vourukashas_glow_2',
                    description: 'set_descr.vourukashas_glow_2',
                    stats: {
                        hp_percent: artifactSetTables.VourukashasGlow.pc2.hp_percent,
                    },
                }),
            ],
        },
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'set_bonus.vourukashas_glow_4',
                    description: 'set_descr.vourukashas_glow_4_1',
                    stats: {
                        dmg_skill: percent(artifactSetTables.VourukashasGlow.pc4.p1),
                        dmg_burst: percent(artifactSetTables.VourukashasGlow.pc4.p1),
                    },
                }),
                new ConditionStacks({
                    name: 'set.vourukashas_glow_4',
                    serializeId: 32,
                    title: 'set_bonus.vourukashas_glow_4',
                    description: 'set_descr.vourukashas_glow_4_2',
                    maxStacks: artifactSetTables.VourukashasGlow.pc4.p4,
                    stats: [
                        new StatTable('dmg_skill', times(percent(times(artifactSetTables.VourukashasGlow.pc4.p1, artifactSetTables.VourukashasGlow.pc4.p2)), [1, 2, 3, 4, 5])),
                        new StatTable('dmg_burst', times(percent(times(artifactSetTables.VourukashasGlow.pc4.p1, artifactSetTables.VourukashasGlow.pc4.p2)), [1, 2, 3, 4, 5])),
                    ],
                }),
            ],
        },
    ],
});
