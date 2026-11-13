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

export const SilkenMoonsSerenade = new ArtifactSet({
    serializeId: 57,
    goodId: 'SilkenMoonsSerenade',
    gameId: 15042,
    itemIds: [42412, 42413, 42422, 42423, 42432, 42433, 42442, 42443, 42452, 42453, 42513, 42514, 42523, 42524, 42533, 42534, 42543, 42544, 42553, 42554, 23791, 23792, 23793, 23794, 23795, 23796, 23797, 23798, 23799, 23800],
    name: "artifact_set.silken_moons_serenade",
    iconClass: "artifact-icon-silken-moons-serenade",
    minRarity: 4,
    maxRarity: 5,
    setBonus: [
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'set_bonus.silken_moons_serenade_2',
                    description: 'set_descr.silken_moons_serenade_2',
                    stats: {
                        recharge: artifactSetTables.SilkenMoonsSerenade.pc2.recharge,
                    },
                })
            ],
        },
        {},
        {
            conditions: [
                // Toggle only; actual party stat application is handled in Buffs/Artifacts.js
                new ConditionBoolean({
                    name: 'set.silken_moons_serenade_4',
                    serializeId: 50,
                    title: 'set_bonus.silken_moons_serenade_4',
                    description: 'set_descr.silken_moons_serenade_4_combined',
                    stats: {
                        text_em_nascent: artifactSetTables.SilkenMoonsSerenade.pc4.p2,
                        text_em_ascendant: artifactSetTables.SilkenMoonsSerenade.pc4.p3,
                        text_percent_lunar: percent(artifactSetTables.SilkenMoonsSerenade.pc4.p4),
                    },
                }),
                // Moonsign level of the wearer's team, for the EM part
                new ConditionCalcMoonsign({}),
                new ConditionStaticLevel({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stack: 'silken_moons_serenade_4_mastery',
                    levelSetting: 'party_moonsign',
                    fromZero: true,
                    stats: [
                        new StatTable('mastery', [0, artifactSetTables.SilkenMoonsSerenade.pc4.p2, artifactSetTables.SilkenMoonsSerenade.pc4.p3]),
                    ],
                    condition: new ConditionBoolean({name: 'set.silken_moons_serenade_4'}),
                }),
                new Condition({
                    receivers: RECEIVERS.TEAM,
                    stack: 'silken_moons_serenade_4_lunar',
                    condition: new ConditionBoolean({name: 'set.silken_moons_serenade_4'}),
                    stats: {dmg_reaction_lunar: percent(artifactSetTables.SilkenMoonsSerenade.pc4.p4)},
                }),
            ],
        },
    ],
});
