import { ArtifactSet } from "../../../classes/ArtifactSet";
import { Condition } from "../../../classes/Condition";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionCalcMoonsign } from "../../../classes/Condition/CalcMoonsign";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { ConditionStaticLevel } from "../../../classes/Condition/Static/Level";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { artifactSetTables } from "../../generated/ArtifactSetTables";
import { percent } from "../../Params";

export const NightOfTheSkysUnveiling = new ArtifactSet({
    serializeId: 56,
    goodId: 'NightOfTheSkysUnveiling',
    gameId: 15041,
    itemIds: [41412, 41413, 41422, 41423, 41432, 41433, 41442, 41443, 41452, 41453, 41513, 41514, 41523, 41524, 41533, 41534, 41543, 41544, 41553, 41554, 23781, 23782, 23783, 23784, 23785, 23786, 23787, 23788, 23789, 23790],
    name: "artifact_set.night_of_the_skys_unveiling",
    iconClass: "artifact-icon-night-of-the-skys-unveiling",
    minRarity: 4,
    maxRarity: 5,
    setBonus: [
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'set_bonus.night_of_the_skys_unveiling_2',
                    description: 'set_descr.night_of_the_skys_unveiling_2',
                    stats: {
                        mastery: artifactSetTables.NightOfTheSkysUnveiling.pc2.mastery,
                    },
                })
            ],
        },
        {},
        {
            conditions: [
                // Calculate moonsign level from party composition
                new ConditionCalcMoonsign({}),
                // Toggle only; party Lunar Reaction DMG is handled in Buffs/Artifacts.js
                new ConditionBoolean({
                    name: 'set.night_of_the_skys_unveiling_4',
                    serializeId: 48,
                    title: 'set_bonus.night_of_the_skys_unveiling_4',
                    description: 'set_descr.night_of_the_skys_unveiling_4_1',
                    stats: {
                        text_crit_nascent: percent(artifactSetTables.NightOfTheSkysUnveiling.pc4.p2),
                        text_crit_ascendant: percent(artifactSetTables.NightOfTheSkysUnveiling.pc4.p3),
                        text_percent_lunar: percent(artifactSetTables.NightOfTheSkysUnveiling.pc4.p4),
                    },
                }),
                // Crit Rate based on Moonsign level
                new ConditionStaticLevel({
                    title: 'set_bonus.night_of_the_skys_unveiling_4',
                    description: 'set_descr.night_of_the_skys_unveiling_4_2',
                    levelSetting: 'party_moonsign',
                    fromZero: true,
                    stats: [
                        new StatTable('crit_rate', [0, percent(artifactSetTables.NightOfTheSkysUnveiling.pc4.p2), percent(artifactSetTables.NightOfTheSkysUnveiling.pc4.p3)]),
                    ],
                    subConditions: [
                        new ConditionBoolean({name: 'set.night_of_the_skys_unveiling_4'}),
                    ],
                }),
                new Condition({
                    receivers: RECEIVERS.TEAM,
                    stack: 'night_of_the_skys_unveiling_4',
                    condition: new ConditionBoolean({name: 'set.night_of_the_skys_unveiling_4'}),
                    stats: {dmg_reaction_lunar: percent(artifactSetTables.NightOfTheSkysUnveiling.pc4.p4)},
                }),
            ],
        },
    ],
});
