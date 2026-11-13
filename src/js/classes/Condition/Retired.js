import { Condition } from "../Condition";

/**
 * Placeholder for a removed condition whose serialize ID may still appear in
 * saved data (links, saved builds, presets). Deserialization reads its value
 * the way the removed condition wrote it and discards it; it never applies,
 * is never shown and is never serialized again. Its serialize ID must never
 * be reused in its object.
 *
 * `type` is the serialized type of the removed condition: 'checkbox' (no
 * value), 'stacks', 'number' or 'dropdown' (one value).
 */
export class ConditionRetired extends Condition {
    constructor(params) {
        super(Object.assign({isHidden: true}, params, {
            name: 'retired.' + params.serializeId,
        }));
    }

    getType() {
        return this.params.type;
    }

    isActive(settings) {
        return false;
    }

    isRetired() {
        return true;
    }

    getMaxStacks() {
        return 0;
    }

    getValueById(id) {
        return '';
    }
}
