/**
 * Positions of a damage graph: lanes stack in slot order (then the team and
 * the enemy), a lane's nodes stand in columns by depth (sources first), the
 * formula's factors stand in one column near the mean height of their
 * inputs, and the result after them.
 */
export const LANE_HEAD = 150;
export const COLUMN = 236;
export const FACTOR = 236;
export const RESULT = 260;
const GAP_X = 64;
/** After the first column: the edges of every source cross here. */
const GAP_SOURCES = 128;
const GAP_Y = 12;
const LANE_PAD = 14;
const LANE_GAP = 12;
const LANE_MIN = 118;
const TOP = 40;
const FACTOR_GAP = 18;

/**
 * @param {{nodes: Array.<Object>, edges: Array.<Object>}} view DamageGraph.view()
 * @param {Array.<Object>} lanes DamageGraph.lanes
 * @param {Map.<string, {width: number, height: number}>} sizes measured nodes
 * @returns {{positions: Map.<string, {x: number, y: number}>, bands: Array.<Object>, formula: Object, columns: Object}}
 */
export function layoutGraph(view, lanes, sizes) {
    let height = (id) => sizes.get(id)?.height || 60;
    let laneNodes = view.nodes.filter((node) => node.lane != 'formula' && node.lane != 'result');
    let maxDepth = Math.max(0, ...laneNodes.map((node) => node.depth || 0));
    let columnX = (depth) => LANE_HEAD + depth * (COLUMN + GAP_X) + (depth > 0 ? GAP_SOURCES - GAP_X : 0);
    let bandWidth = columnX(maxDepth) + COLUMN + LANE_PAD;

    let positions = new Map();
    let bands = [];
    let y = TOP;
    for (let lane of lanes) {
        let nodes = laneNodes.filter((node) => node.lane == lane.id);
        // Every member is shown; the team and the enemy only when they add something.
        if (lane.kind != 'member' && !nodes.length) continue;

        let columnY = new Array(maxDepth + 1).fill(y + LANE_PAD);
        for (let node of nodes) {
            let depth = node.depth || 0;
            positions.set(node.id, {x: columnX(depth), y: columnY[depth]});
            columnY[depth] += height(node.id) + GAP_Y;
        }
        let bottom = Math.max(...columnY) - GAP_Y + LANE_PAD;
        let bandHeight = Math.max(LANE_MIN, bottom - y);
        bands.push({lane, x: 0, y, width: bandWidth, height: bandHeight});
        y += bandHeight + LANE_GAP;
    }

    let center = (id) => positions.get(id).y + height(id) / 2;
    let inputs = new Map();
    for (let edge of view.edges) {
        if (!inputs.has(edge.to)) inputs.set(edge.to, []);
        inputs.get(edge.to).push(edge.from);
    }

    let formulaX = bandWidth + 80;
    let factors = view.nodes.filter((node) => node.lane == 'formula').map((node) => {
        let from = (inputs.get(node.id) || []).filter((id) => positions.has(id));
        let middle = from.length ? from.reduce((sum, id) => sum + center(id), 0) / from.length : TOP + 60;
        return {id: node.id, y: middle - height(node.id) / 2};
    }).sort((a, b) => a.y - b.y);
    let floor = TOP;
    for (let factor of factors) {
        let top = Math.max(factor.y, floor);
        positions.set(factor.id, {x: formulaX, y: top});
        floor = top + height(factor.id) + FACTOR_GAP;
    }

    let resultX = formulaX + FACTOR + 80;
    let formulaTop = TOP, formulaBottom = TOP;
    if (factors.length) {
        formulaTop = Math.min(...factors.map((factor) => positions.get(factor.id).y)) - LANE_PAD;
        formulaBottom = Math.max(...factors.map((factor) => positions.get(factor.id).y + height(factor.id))) + LANE_PAD;
        let middle = factors.reduce((sum, factor) => sum + center(factor.id), 0) / factors.length;
        positions.set('result', {x: resultX, y: Math.max(TOP, middle - height('result') / 2)});
    } else {
        positions.set('result', {x: resultX, y: TOP});
    }

    return {
        positions,
        bands,
        formula: {x: formulaX - 12, y: formulaTop, width: FACTOR + 24, height: formulaBottom - formulaTop},
        columns: {lanes: 12, formula: formulaX, result: resultX},
    };
}
