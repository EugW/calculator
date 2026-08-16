import { ArtifactSet } from "../../../classes/ArtifactSet";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionStatic } from "../../../classes/Condition/Static";

export const ScarletProof = new ArtifactSet({
    serializeId: 62,
    goodId: 'ScarletProof',
    gameId: 15047,
    itemIds: [47412, 47413, 47422, 47423, 47432, 47433, 47442, 47443, 47452, 47453, 47513, 47514, 47523, 47524, 47533, 47534, 47543, 47544, 47553, 47554, 23841, 23842, 23843, 23844, 23845, 23846, 23847, 23848, 23849, 23850],
    name: "artifact_set.scarlet_proof",
    iconClass: "artifact-icon-scarlet-proof",
    minRarity: 4,
    maxRarity: 5,
    setBonus: [
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'set_bonus.scarlet_proof_2',
                    description: 'set_descr.scarlet_proof_2',
                    stats: {
                        atk_percent: 18,
                    },
                }),
            ],
        },
        {},
        {
            conditions: [
                new ConditionBoolean({
                    name: 'set.scarlet_proof_4',
                    serializeId: 56,
                    title: 'set_bonus.scarlet_proof_4',
                    description: 'set_descr.scarlet_proof_4',
                    stats: {
                        crit_rate: 16,
                        dmg_stellarswirl: 40,
                    },
                }),
            ],
        },
    ],
});
