import { ArtifactSet } from "../../../classes/ArtifactSet";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionStatic } from "../../../classes/Condition/Static";

export const DisenchantmentInDeepShadow = new ArtifactSet({
    serializeId: 61,
    goodId: 'DisenchantmentInDeepShadow',
    gameId: 15046,
    itemIds: [46412, 46413, 46422, 46423, 46432, 46433, 46442, 46443, 46452, 46453, 46513, 46514, 46523, 46524, 46533, 46534, 46543, 46544, 46553, 46554, 23831, 23832, 23833, 23834, 23835, 23836, 23837, 23838, 23839, 23840],
    name: "artifact_set.disenchantment_in_deep_shadow",
    iconClass: "artifact-icon-disenchantment-in-deep-shadow",
    minRarity: 4,
    maxRarity: 5,
    setBonus: [
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'set_bonus.disenchantment_in_deep_shadow_2',
                    description: 'set_descr.disenchantment_in_deep_shadow_2',
                    stats: {
                        atk_percent: 18,
                    },
                })
            ],
        },
        {},
        {
            suggesterSettings: {
                "set.disenchantment_in_deep_shadow_4_2": 1,
            },
            conditions: [
                new ConditionStatic({
                    title: 'set_bonus.disenchantment_in_deep_shadow_4',
                    description: 'set_descr.disenchantment_in_deep_shadow_4_1',
                    stats: {
                        dmg_reaction_superconduct: 80,
                        dmg_stellarconduct: 40,
                    },
                }),
                new ConditionBoolean({
                    name: 'set.disenchantment_in_deep_shadow_4_2',
                    serializeId: 54,
                    title: 'set_bonus.disenchantment_in_deep_shadow_4',
                    description: 'set_descr.disenchantment_in_deep_shadow_4_2',
                    stats: {
                        crit_rate_enemy: 16,
                    },
                }),
            ],
        },
    ],
});
