import { Buffs } from "../../db/Buffs";
import { Condition } from "../Condition";
import { ConditionDropdownTeamMember } from "../Condition/Dropdown/TeamMember";

let registry = null;

/**
 * Ownership and value types come from the party's declared controls. Stable
 * team wire IDs live on those controls (teamSerializeId); the on-field
 * member is a field of the team itself. A new control without a wire ID
 * fails here instead of silently becoming a member setting.
 */
export function teamSettingDefinitions() {
    let result = registry;
    if (!result) {
        result = {on_field_char: {id: 1, member: true}};
        const ids = new Set([1]);
        const conditions = Buffs.getList(true).filter((item) => item.isParty()).flatMap((item) => item.getConditions());
        for (const cond of Condition.unwrap(conditions)) {
            if (!cond.getName() || !cond.isSerializable() || cond.isRetired?.()) continue;
            const id = cond.params.teamSerializeId;
            if (!id || ids.has(id)) throw new Error('A party control needs a unique teamSerializeId: ' + cond.getName());
            ids.add(id);
            result[cond.getName()] = {
                id,
                boolean: cond.getType() === 'checkbox',
                member: cond instanceof ConditionDropdownTeamMember,
                max: cond.params.max,
            };
        }
        registry = result;
    }
    return result;
}

export function isTeamSetting(name) {
    return Object.prototype.hasOwnProperty.call(teamSettingDefinitions(), name);
}

export function teamSettingsValues(settings) {
    return Object.fromEntries(Object.entries(teamSettingDefinitions()).map(([name, definition]) => {
        const value = Number(settings[name]) || 0;
        return [name, definition.boolean ? !!value : Math.max(0, Math.min(definition.max ?? Infinity, Math.floor(value)))];
    }));
}
