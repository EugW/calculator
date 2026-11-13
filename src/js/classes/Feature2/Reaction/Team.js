import { BuildData } from "../../Build/Data";
import { moveTree } from "../../Team/Namespace";
import { PROGRAM } from "../../Team/Scope";
import { CDamageContribution } from "../Compile/Types/Damage";
import { FeatureDamage } from "../Damage";

/**
 * Reaction damage the team deals together: Lunar-Charged, Lunar-Crystallize
 * and Stellar Swirl. Every member that takes part contributes what the
 * reaction would deal as its own (`unit`: its level, its stats, its CRIT);
 * the contributions are ranked after their CRIT rolls and weighted by rank
 * (CDamageContribution).
 *
 * A member takes part when the reaction is its own to trigger (the unit's
 * condition) and it is not taken out (`optOut`, a control of every
 * character). The result is the team's: the same in the view of every member
 * that takes part, and no member's own.
 */
export class FeatureReactionTeam extends FeatureDamage {
    /**
     * @param {Object} params {name, unit: the reaction as one member deals
     *     it (FeatureReaction), optOut: the setting that takes a member out}
     */
    constructor(params) {
        let unit = params.unit;
        super({
            name: params.name,
            category: unit.category,
            element: unit.element,
            damageType: unit.damageType,
            tags: unit.tags,
            cannotReact: true,
        });
        this.unit = unit;
        this.optOut = params.optOut;
    }

    /**
     * @returns {boolean} true: it is no member's own hit (rotation_self.total)
     */
    isTeamHit() {
        return true;
    }

    /**
     * @param {BuildData} data a member's data
     * @returns {boolean} whether the member takes part
     */
    contributes(data) {
        return this.unit.isActive(data) && !data.settings[this.optOut];
    }

    isActive(data) {
        return this.contributes(data);
    }

    checkConditions(data) {
        return this.contributes(data);
    }

    /**
     * @param {BuildData} data
     * @returns {CDamageContribution}
     */
    getTree(data) {
        let program = data.settings ? data.settings[PROGRAM] : null;
        if (!program) {
            // Data built outside a team's program: the member alone.
            return new CDamageContribution([this.unit.getTree(data)]);
        }

        let trees = [];
        for (let member of program.memberData()) {
            // The program's member is read as given: its data may be a
            // candidate's, or a rotation hit's.
            let memberData = member.slot == program.slot ? data : member.data;
            if (!this.contributes(memberData)) continue;

            let tree = moveTree(this.unit.getTree(memberData), member.slot, program.slot);
            tree.slot = member.slot;
            trees.push(tree);
        }
        return new CDamageContribution(trees);
    }
}
