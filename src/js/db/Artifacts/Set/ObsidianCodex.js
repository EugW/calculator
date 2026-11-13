import { ArtifactSet } from "../../../classes/ArtifactSet";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanNightSoul } from "../../../classes/Condition/Boolean/NightSoul";
import { ConditionRetired } from "../../../classes/Condition/Retired";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { artifactSetTables } from "../../generated/ArtifactSetTables";
import { percent } from "../../Params";

export const ObsidianCodex = new ArtifactSet({
    serializeId: 53,
    goodId: 'ObsidianCodex',
    gameId: 15038,
	itemIds: [38412, 38413, 38422, 38423, 38432, 38433, 38442, 38443, 38452, 38453, 38513, 38514, 38523, 38524, 38533, 38534, 38543, 38544, 38553, 38554, 23751, 23752, 23753, 23754, 23755, 23756, 23757, 23758, 23759, 23760],
    name: "artifact_set.obsidian_codex",
    iconClass: "artifact-icon-obsidian-codex",
    minRarity: 4,
    maxRarity: 5,
    setBonus: [
        {},
        {
            conditions: [
                new ConditionBoolean({
                    name: 'common.nightsoul_blessing_state',
                    serializeId: 41,
                    title: 'talent_name.nightsoul_blessing_state',
                    subConditions: [
                        new ConditionBooleanNightSoul(),
                    ],
                }),
                new ConditionStatic({
                    title: 'set_bonus.obsidian_codex_2',
                    description: 'set_descr.obsidian_codex_2',
                    stats: {
                        dmg_all: percent(artifactSetTables.ObsidianCodex.pc2.p1),
                    },
                    subConditions: [
                        new ConditionBooleanNightSoul(),
                        new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
                    ],
                }),
            ],
        },
        {},
        {
            conditions: [
                // Its own toggle (42) until the set-bonus profile: the bonus
                // follows the character's Nightsoul's Blessing, a member state.
                new ConditionRetired({serializeId: 42, type: 'checkbox'}),
                new ConditionStatic({
                    title: 'set_bonus.obsidian_codex_4',
                    description: 'set_descr.obsidian_codex_4',
                    stats: {
                        crit_rate: percent(artifactSetTables.ObsidianCodex.pc4.p2),
                    },
                    subConditions: [
                        new ConditionBooleanNightSoul(),
                        new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
                    ],
                }),
            ],
        },
    ],
});

