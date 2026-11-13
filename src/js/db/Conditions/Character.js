import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionNot } from "../../classes/Condition/Not";
import { lunarchargedCond, lunarcrystallizeCond, stellarswirlCond } from "../Features/Reactions";

/**
 * Takes the member out of a reaction the team deals together
 * (Feature2/Reaction/Team): it could trigger the reaction, but does not
 * apply the element in this team. Shown to the members that could.
 *
 * @param {string} name
 * @param {number} serializeId
 * @param {Condition} reaction whether the reaction is the member's to trigger
 * @returns {ConditionBoolean}
 */
function noContribution(name, serializeId, reaction) {
    return new ConditionBoolean({
        name: name,
        serializeId: serializeId,
        title: 'talent_name.' + name,
        description: 'talent_descr.' + name,
        hideCondition: [new ConditionNot([reaction])],
    });
}

export const Character = [
    new ConditionBoolean({
        name: 'imaginarium_theatre',
        serializeId: 25,
        title: 'talent_name.imaginarium_theatre',
        description: 'talent_descr.imaginarium_theatre',
        stats: {
            hp_percent: 20,
            def_percent: 20,
            atk_percent: 20,
        },
    }),
    noContribution('no_lunarcharged_contribution', 26, lunarchargedCond),
    noContribution('no_lunarcrystallize_contribution', 27, lunarcrystallizeCond),
    noContribution('no_stellarswirl_contribution', 28, stellarswirlCond),
];
