import { MemberView } from "./MemberView";
import { RotationCompiler } from "./RotationCompiler";

/**
 * A team as the calculator shows it: one evaluation of its state, read by
 * the view of every member (member()).
 *
 * A view is a snapshot of one state and is never updated. Whoever reads one
 * state repeatedly keeps a view: the app keeps one per refresh
 * (App.teamView). After a change, a new view is needed.
 */
export class TeamView {
    /**
     * @param {Team} team
     */
    constructor(team) {
        this.team = team;
        this.evaluationCache = null;
        this.rotationCache = undefined;
        this.members = new Map();
    }

    /**
     * The team's rotation compiled once for every member's view (see
     * RotationCompiler).
     *
     * @returns {Object|null}
     */
    compiledRotation() {
        if (this.rotationCache === undefined) {
            this.rotationCache = new RotationCompiler(this.team).compile();
        }
        return this.rotationCache;
    }

    /**
     * @returns {TeamEvaluation}
     */
    evaluation() {
        this.evaluationCache ||= this.team.evaluate();
        return this.evaluationCache;
    }

    /**
     * @param {CalcSet} member
     * @returns {MemberView}
     */
    member(member) {
        if (this.team.slotOf(member) < 0) {
            throw new Error('The build is not a member of this team');
        }

        let view = this.members.get(member);
        if (!view) {
            view = new MemberView(member, this);
            this.members.set(member, view);
        }
        return view;
    }

    /**
     * Active sources of every stack key: they belong to the whole team.
     *
     * @returns {StackLedger}
     */
    stackSources() {
        return this.evaluation().collectStackSources();
    }

    /**
     * @returns {Array.<StackGroup>} non-stacking effects with a choice to
     *     make, and who supplies each (Team/Stacking)
     */
    stackGroups() {
        return this.evaluation().stackGroups();
    }

    /**
     * @returns {{settings: BuildSettings, stats: Stats}} the team's enemy as resolved, a copy
     */
    getEnemy() {
        return this.evaluation().enemyData();
    }
}
