import { Condition } from "../../../classes/Condition";

function isObject(data) {
    return data && typeof data == 'object' && !Array.isArray(data);
}

export function cloneWeaponSuggestData(data) {
    return JSON.parse(JSON.stringify(data || {}));
}

export function getWeaponSuggestItems(weapon) {
    let items = weapon ? weapon.getSuggesterSettings() : [];

    if (!Array.isArray(items) || items.length == 0) {
        items = [{name: '', settings: {}}];
    }

    return items;
}

export function getWeaponEditableConditions(weapon, rowSettings) {
    let result = [];
    let usedNames = {};
    let additionalNames = {};

    if (!weapon) {
        return result;
    }

    for (const item of getWeaponSuggestItems(weapon)) {
        if (!isObject(item.settings)) {
            continue;
        }

        for (const key of Object.keys(item.settings)) {
            additionalNames[key] = 1;
        }
    }

    if (isObject(rowSettings)) {
        for (const key of Object.keys(rowSettings)) {
            additionalNames[key] = 1;
        }
    }

    appendConditions(result, usedNames, weapon.getConditions());

    for (const group of [DB.Conditions.Character, DB.Conditions.Enemy, DB.Conditions.Weapon]) {
        appendConditions(result, usedNames, group, additionalNames);
    }

    return result;
}

export function getWeaponScenarioDefaultSettings(weapon, suggestItem, buildSettings) {
    let settings = Condition.allConditionsOn(
        getWeaponEditableConditions(weapon, suggestItem && suggestItem.settings),
        buildSettings
    );

    if (suggestItem && isObject(suggestItem.settings)) {
        Object.assign(settings, cloneWeaponSuggestData(suggestItem.settings));
    }

    return settings;
}

export function normalizeWeaponScenarioList(weapon, savedItems, buildSettings, rarity) {
    let result = {};
    let suggestItems = getWeaponSuggestItems(weapon);
    let localSavedItems = isObject(savedItems) ? savedItems : {};

    for (const suggestItem of suggestItems) {
        result[suggestItem.name] = normalizeWeaponScenarioData({
            weapon: weapon,
            suggestItem: suggestItem,
            savedItem: localSavedItems[suggestItem.name],
            buildSettings: buildSettings,
            rarity: rarity,
        });
    }

    for (const rowId of Object.keys(localSavedItems)) {
        if (result[rowId] !== undefined) {
            continue;
        }

        result[rowId] = normalizeWeaponScenarioData({
            weapon: weapon,
            savedItem: localSavedItems[rowId],
            buildSettings: buildSettings,
            rarity: rarity,
        });
    }

    return result;
}

export function normalizeWeaponScenarioData(params) {
    let savedItem = isObject(params.savedItem) ? params.savedItem : {};
    let savedSettings = isObject(savedItem.settings) ? savedItem.settings : {};
    let rarity = params.rarity || 1;
    let maxRefinement = params.weapon ? params.weapon.getMaxRefinement() : 5;
    let defaultRefine = {
        1: rarity == 5 || maxRefinement == 1,
        2: false,
        3: false,
        4: false,
        5: rarity < 5 && maxRefinement > 1,
    };
    let settings = getWeaponScenarioDefaultSettings(params.weapon, params.suggestItem, params.buildSettings);
    let refine = {};

    for (const key of Object.keys(savedSettings)) {
        if (settings[key] !== undefined) {
            settings[key] = savedSettings[key];
        }
    }

    let savedRefine = isObject(savedItem.refine) ? savedItem.refine : {};
    for (let r = 1; r <= 5; ++r) {
        refine[r] = r <= maxRefinement
            && (savedRefine[r] === undefined ? defaultRefine[r] : !!savedRefine[r]);
    }

    return {
        show: savedItem.show === undefined ? rarity >= 4 : !!savedItem.show,
        refine: refine,
        settings: cloneWeaponSuggestData(settings),
        isCustom: params.suggestItem ? !!savedItem.isCustom : true,
        customName: savedItem.customName || '',
        sourceName: params.suggestItem ? params.suggestItem.name : (savedItem.sourceName || ''),
    };
}

export function getWeaponScenarioContextSettings(weapon, itemSettings, buildSettings) {
    let settings = cloneWeaponSuggestData(buildSettings);
    let refine = settings.weapon_refine || 1;

    if (itemSettings && isObject(itemSettings.refine)) {
        for (let r = 1; r <= (weapon ? weapon.getMaxRefinement() : 5); ++r) {
            if (itemSettings.refine[r]) {
                refine = r;
                break;
            }
        }
    }

    if (weapon) {
        settings.weapon_id = weapon.getId();
        settings.weapon_type = weapon.getType();
    }

    settings.weapon_refine = refine;

    return settings;
}

export function isWeaponScenarioCustomized(weapon, suggestItem, settings, buildSettings) {
    let defaults = getWeaponScenarioDefaultSettings(weapon, suggestItem, buildSettings);
    let current = isObject(settings) ? settings : {};

    for (const key of Object.keys(defaults)) {
        if (defaults[key] !== current[key]) {
            return true;
        }
    }

    for (const key of Object.keys(current)) {
        if (defaults[key] === undefined) {
            return true;
        }
    }

    return false;
}

export function createCustomWeaponScenario(weapon, buildSettings, rarity, customName) {
    return Object.assign(
        normalizeWeaponScenarioData({
            weapon: weapon,
            savedItem: {
                isCustom: true,
                customName: customName || '',
            },
            buildSettings: buildSettings,
            rarity: rarity,
        }),
        {
            show: true,
            isCustom: true,
            customName: customName || '',
            sourceName: '',
        }
    );
}

function appendConditions(result, usedNames, items, filterNames) {
    if (!items) {
        return;
    }

    for (const cond of Condition.unwrap(items)) {
        if (!cond || !cond.getType) {
            continue;
        }

        let name = cond.getName();

        if (filterNames && (!name || !filterNames[name])) {
            continue;
        }

        if (name && usedNames[name]) {
            continue;
        }

        if (name) {
            usedNames[name] = 1;
        }

        result.push(cond);
    }
}
