import { ArtifactSet } from "../../../classes/ArtifactSet";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionCalcMoonsign } from "../../../classes/Condition/CalcMoonsign";
import { ConditionStatic } from "../../../classes/Condition/Static";

export const AubadeOfMorningstarAndMoon = new ArtifactSet({
    serializeId: 58,
    goodId: 'AubadeOfMorningstarAndMoon',
    gameId: 15043,
    itemIds: [43412, 43413, 43422, 43423, 43432, 43433, 43442, 43443, 43452, 43453, 43513, 43514, 43523, 43524, 43533, 43534, 43543, 43544, 43553, 43554, 23801, 23802, 23803, 23804, 23805, 23806, 23807, 23808, 23809, 23810],
    name: "artifact_set.aubade_of_morningstar_and_moon",
    iconClass: "artifact-icon-aubade-of-morningstar-and-moon",
    minRarity: 4,
    maxRarity: 5,
    setBonus: [
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'set_bonus.aubade_of_morningstar_and_moon_2',
                    description: 'set_descr.aubade_of_morningstar_and_moon_2',
                    stats: {
                        mastery: 80,
                    },
                })
            ],
        },
        {},
        {
            conditions: [
                // Calculate moonsign level from party composition
                new ConditionCalcMoonsign({}),
                // Base off-field Lunar Reaction DMG +20%
                new ConditionBoolean({
                    name: 'set.aubade_of_morningstar_and_moon_4',
                    serializeId: 51,
                    title: 'set_bonus.aubade_of_morningstar_and_moon_4',
                    description: 'set_descr.aubade_of_morningstar_and_moon_4_1',
                    stats: {
                        dmg_reaction_lunar: 20,
                    },
                }),
                // Additional +40% when Moonsign level >= 2 (Ascendant Gleam)
                new ConditionStatic({
                    title: 'set_bonus.aubade_of_morningstar_and_moon_4',
                    description: 'set_descr.aubade_of_morningstar_and_moon_4_2',
                    stats: {
                        dmg_reaction_lunar: 40,
                    },
                    subConditions: [
                        new ConditionBoolean({name: 'set.aubade_of_morningstar_and_moon_4'}),
                        new ConditionBooleanValue({
                            setting: 'party_moonsign',
                            cond: 'ge',
                            value: 2,
                        }),
                    ],
                }),
            ],
        },
    ],
});
