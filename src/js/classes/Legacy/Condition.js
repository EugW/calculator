import { ConditionDropdown } from "../Condition/Dropdown";

/**
 * Decode an old control with its original name, number format and dropdown
 * values. Unlike retired placeholders, these values feed a migration report.
 * The controls are never included in a build's effects or current serializer.
 */
class LegacyCondition extends ConditionDropdown {
    getType() {
        return this.params.type;
    }
}

export function legacyConditions(data) {
    return (data || []).map(([serializeId, type, name, options]) => {
        let params = Object.assign({}, options, {serializeId, type, name});
        params.multiple = type == 'dropdown_multiple';
        params.values = (params.values || []).map(([serializeId, value]) => ({serializeId, value}));
        return new LegacyCondition(params);
    });
}
