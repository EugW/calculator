import { isLegacySource, LEGACY_KINDS } from '../../classes/Team/Legacy';
import { Lang } from '../Lang';

let lang = new Lang();

/**
 * The name of a source of effects: a member's character, or an entry of the
 * team's legacy source (Team/Legacy) with what it is: a virtual character, or
 * a weapon or set with no wielder in the team.
 *
 * @param {CalcSet|LegacyEntry|null} source
 * @returns {string}
 */
export function sourceName(source) {
    if (!source) {
        return '';
    }
    if (!isLegacySource(source)) {
        return lang.get(source.char.object.getName());
    }
    let mark = source.kind == LEGACY_KINDS.CHAR ? 'legacy.mark_virtual' : 'legacy.mark_floating';
    return lang.get(source.getName()) + ' (' + lang.get(mark) + ')';
}
