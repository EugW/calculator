import { Artifact } from "./Artifact";
import { CalcObjectArtifacts } from "./CalcObject/Artifacts";
import { Stats } from "./Stats";

const MAX_PROGRAMS = 32;

/**
 * Programs for an artifact search. Artifact stats are inputs; everything else
 * (set counts, controls, teammates, stack choices and rotation) selects a
 * program. The cache belongs to one search and never changes a live build.
 */
export class ArtifactCandidateEvaluator {
    constructor(featureName) {
        this.featureName = featureName;
        this.programs = new Map();
    }

    /**
     * @param {CalcSet} member a candidate with its final equipment and controls
     * @returns {Object} data, feature and compiler for the candidate's set counts
     */
    getProgram(member) {
        let team = member.team;
        let slot = team.slotOf(member);

        // Keep set counts while taking numerical artifact stats out of the
        // program. Teammate equipment stays in the key: equipping one of their
        // pieces can remove a set bonus and changes the whole team's program.
        // Slot, level and rarity do not affect the graph, only the stats
        // added below. Canonical slots let permutations share a program.
        let artifacts = new CalcObjectArtifacts();
        artifacts.replace(setPieces(member));
        artifacts.copySettingsFrom(member.artifacts);

        // The key is read from the team as it is, every candidate: only a
        // new program takes a copy of the team.
        let state = team.serialize({artifacts: new Map([[member, artifacts]])});
        if (!state) {
            throw new Error('A candidate is evaluated in a team that can be saved');
        }
        let key = JSON.stringify([
            slot, state, team.getMembers().map((item) => (item === member ? artifacts : item.artifacts).getSettings()),
        ]);
        let program = this.programs.get(key);
        if (!program) {
            let candidate = team.cloneWithArtifactSettings().getMember(slot);
            candidate.clearArtifacts();
            candidate.replaceArtifacts(setPieces(member));
            candidate.artifacts.copySettingsFrom(member.artifacts);

            let view = candidate.view();
            let data = view.getBuildData();
            let feature = view.getFeatureByName(this.featureName, data);
            let compiler = feature && feature.getCompiled(data);
            program = {data, feature, compiler};
        }
        // Searches over many distinct set combinations must not retain every
        // team's states and trees. Recent topologies cover stat-only searches.
        this.programs.delete(key);
        this.programs.set(key, program);
        if (this.programs.size > MAX_PROGRAMS) {
            this.programs.delete(this.programs.keys().next().value);
        }
        return program;
    }

    getUsedStats(member) {
        return this.getProgram(member).compiler?.usedStats || [];
    }

    /** The same result as a fresh view, with this candidate's artifact stats. */
    getResult(member) {
        let program = this.getProgram(member);
        if (!program.feature) return;

        let data = program.data.clone();
        let stats = new Stats();
        for (let art of Object.values(member.getArtifacts())) {
            if (art) stats.concat(art.calcStats());
        }
        stats.processPercent();
        data.stats.concat(stats);
        data.stats.ensure(program.compiler.usedStats);
        data.stats.ensure(program.compiler.assignedStats);
        return program.feature.getResult(data, program.compiler)[this.featureName];
    }
}

/**
 * @param {CalcSet} member
 * @returns {Array.<Artifact>} its pieces as their sets alone: empty pieces
 *     in the slots' order, whichever slots the sets are worn in
 */
function setPieces(member) {
    let slots = DB.Artifacts.Slots.getKeys();
    return Object.values(member.getArtifacts()).filter(Boolean).map((art) => art.set).sort()
        .map((set, index) => new Artifact(5, 0, slots[index], set, '', []));
}
