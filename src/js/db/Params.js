/**
 * Generated passive, constellation, weapon and set params are raw game values:
 * a fraction (0.15) where the calculator's percent stats take 15. Multiplying
 * in place is not exact (0.022 * 100 is 2.1999999999999997), so the scaling
 * goes through this.
 *
 * @param {number|Array.<number>} value a param, or a weapon's params by refinement
 * @returns {number|Array.<number>}
 */
export function percent(value) {
    if (Array.isArray(value)) {
        return value.map(percent);
    }
    return Math.round(value * 1e10) / 1e8;
}

/**
 * A number the game computes from several params: a share of a bonus (the
 * ratio times the team's part), a cap (a ratio times a stack count), a bonus
 * "increased by 100%" (twice the list). Plain arithmetic leaves float noise
 * (0.56 * 0.75 * 100 is 42.00000000000001), which this rounds away.
 *
 * An argument is a number or a list (a weapon's params by refinement, a row
 * of stack counts). Lists are combined element by element and must have the
 * same length; a number applies to every element.
 *
 * @param {...(number|Array.<number>)} values
 * @returns {number|Array.<number>} the product
 */
export function times(...values) {
    return combine(values, (left, right) => left * right);
}

/**
 * The sum of params, see times(): a base value and what a constellation adds
 * to it, or 1 plus a bonus where the calculator takes the whole multiplier.
 *
 * @param {...(number|Array.<number>)} values
 * @returns {number|Array.<number>} the sum
 */
export function plus(...values) {
    return combine(values, (left, right) => left + right);
}

function combine(values, operation) {
    return values.reduce((left, right) => {
        if (!Array.isArray(left) && !Array.isArray(right)) {
            return exact(operation(left, right));
        }
        if (Array.isArray(left) && Array.isArray(right) && left.length != right.length) {
            throw new Error(`Lists of ${left.length} and ${right.length} values cannot be combined`);
        }
        let length = Array.isArray(left) ? left.length : right.length;
        let result = [];
        for (let i = 0; i < length; ++i) {
            result.push(exact(operation(
                Array.isArray(left) ? left[i] : left,
                Array.isArray(right) ? right[i] : right,
            )));
        }
        return result;
    });
}

// Twelve significant digits: far below any game value's precision, far above
// the noise of a double.
function exact(value) {
    return Number(value.toPrecision(12));
}
