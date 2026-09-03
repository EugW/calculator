/** Display-only count abbreviation. Keep small counts exact, otherwise use three
 * significant digits and promote rounded boundaries (999,500 -> 1M).
 */
export function formatCompactCount(value) {
    const count = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    if (count < 1000) return String(count);
    const rounded = Number(count.toPrecision(3));
    if (rounded >= 1e15) return rounded.toExponential().replace('e+', 'E');
    for (const [scale, suffix] of [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']]) {
        if (rounded >= scale) return Number((rounded / scale).toPrecision(3)) + suffix;
    }
}

export function formatNumber(value, opts) {
    opts ||= {};

    let result = value;
    let digits = opts.digits || 1;

    if (opts.percent) {
        result = result.toFixed(digits);

        if (opts.no_decimal_zero) {
            result = result.replace(/(\.\d*?)0+$/, "$1");
            result = result.replace(/\.$/, "");
        }
        result += '%';
    } else if (opts.digits) {
        result = result.toFixed(digits);
    } else {
        if (result > 10000000) {
            result = (result / 1000000).toFixed(2) +'m';
        } else if (result > 1000000) {
            result = (result / 1000000).toFixed(3) +'m';
        } else {
            result = Math.round(result);
        }
    }

    if (value == 0) {
        return '';
    }

    result = result.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    if (opts.signed && value >= 0) {
        result = '+'+ result;
    }

    return result;
}

export function makeShareUrl(hash) {
    let shareUrl = window.location.toString();
    shareUrl = shareUrl.replace(/#.*$/, '');
    shareUrl += '#'+ hash;
    return shareUrl;
}

export function waitForCondition(condition, callback, timer) {
    let inteval = setInterval(() => {
        if (condition()) {
            clearInterval(inteval);
            callback();
        }
    }, timer || 100);
}
