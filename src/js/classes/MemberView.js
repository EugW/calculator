import { PRIORITIES } from "./PostEffect";

/**
 * A member as the calculator shows it: its data in its team's evaluation
 * (MemberEvaluation) and the features it deals, including its compiled
 * rotation. It belongs to a view of the team (TeamView), whose one
 * evaluation every member's view reads.
 *
 * A view is a snapshot of one state and is never updated. Whoever reads one
 * state repeatedly keeps a view: the app keeps one per refresh
 * (App.teamView). After a change, a new view is needed. The build's own read
 * methods (CalcSet.getBuildData, getFeatureByName, ...) use a new view every
 * call.
 */
export class MemberView {
    /**
     * @param {CalcSet} member
     * @param {TeamView} teamView view of the member's team
     */
    constructor(member, teamView) {
        this.member = member;
        this.teamView = teamView;
        this.featuresCache = null;
        this.directFeaturesCache = null;
    }

    /**
     * @returns {MemberEvaluation} the member's data in its team's evaluation
     */
    evaluation() {
        return this.teamView.evaluation().member(this.member);
    }

    /**
     * Data for compiled programs (see MemberEvaluation.programData). The
     * caller owns it: a new copy every call.
     *
     * @returns {BuildData}
     */
    getBuildData() {
        return this.evaluation().programData();
    }

    /**
     * Stage 0 data of the member (see MemberEvaluation.memberData), a new copy
     * every call.
     *
     * @returns {BuildData}
     */
    getStats() {
        return this.evaluation().memberData();
    }

    getBaseStatsWithSets() {
        let result = this.getStats();
        result.stats.applyPostEffects(result.settings, this.member.getPostEffects(), PRIORITIES.PRE_STATS);
        return result;
    }

    /**
     * @returns {{settings: BuildSettings, stats: Stats}} the team's enemy as resolved, a copy
     */
    getEnemy() {
        return this.teamView.getEnemy();
    }

    /**
     * @returns {BuildSettings} the party's settings with this member as the
     *     receiver, for showing the party's conditions, a copy
     */
    getPartySettings() {
        return this.evaluation().partySettings();
    }

    /**
     * @returns {BuildSettings} settings of the member as the team resolves them, a copy
     */
    getSettings() {
        return this.evaluation().settings();
    }

    /**
     * Active sources of every stack key: they belong to the whole team.
     *
     * @returns {StackLedger}
     */
    stackSources() {
        return this.teamView.stackSources();
    }

    /**
     * The member's features, with the team's rotation compiled once per view
     * of the team.
     *
     * @returns {Array.<Feature2>}
     */
    getFeaturesList() {
        this.featuresCache ||= this.member.getFeaturesList({compiledRotation: this.teamView.compiledRotation()});
        return this.featuresCache;
    }

    getFeaturesHash(data, opts) {
        opts = Object.assign({}, opts);
        let result = {};

        for (let feat of this.getFeaturesList()) {
            if (data && !feat.checkConditions(data)) {
                continue;
            }

            if (opts.checkCallback && !opts.checkCallback(feat)) {
                continue;
            }

            result[feat.getName()] = feat;
        }

        return result;
    }

    getFeatures(data) {
        let result = {};

        for (let feat of this.getFeaturesList()) {
            result = Object.assign(result, feat.getResult(data));
        }

        return result;
    }

    calcFeatures() {
        return this.getFeatures(this.getBuildData());
    }

    getFeaturesNames() {
        let result = {};
        let data = this.getStats();

        for (let feat of this.getFeaturesList()) {
            Object.assign(result, feat.getFeatureNamesHash(data.stats, data.settings));
        }

        return result;
    }

    getFeatureByName(name, buildData) {
        if (!name) { return null; }

        buildData ||= this.getBuildData();

        // A named non-rotation feature does not need the rotation's states.
        let features = /^rotation(_self)?\./.test(name) ? this.getFeaturesList()
            : (this.directFeaturesCache ||= this.member.getFeaturesList({ignoreRotation: true}));
        for (let feat of features) {
            if (!feat.isActive(buildData)) { continue; }

            if (name == feat.getName()) {
                return feat;
            }
        }

        return null;
    }

    /**
     * A feature's result with this member's data, for a feature taken from
     * another build (a search's original, before a candidate's artifacts).
     * Features hold no state and are reused, except a rotation: it holds its
     * team's states as they were when it was compiled (RotationCompiler), so
     * this member's own is used.
     *
     * @param {Feature2} feature
     * @param {string} [name] the result's name, the feature's by default
     * @returns {FeatureResult|undefined}
     */
    getResultOf(feature, name = feature.getName()) {
        let data = this.getBuildData();
        if (feature.isRotation()) {
            feature = this.getFeatureByName(name, data);
            if (!feature) {
                return;
            }
        }

        return feature.getResult(data)[name];
    }

    getFeatureResultByName(name) {
        let data = this.getBuildData();
        let feature = this.getFeatureByName(name, data);
        if (!feature) {
            return;
        }

        return feature.getResult(data)[name];
    }
}
