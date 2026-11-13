import { getSkillLevelByName } from "./Build/Settings";
import {Stats} from "./Stats";

export class Condition {
    constructor(params) {
        this.params = params || {};
    }

    getId() {
        return this.params.serializeId || 0;
    }

    getName() {
        return this.params.name;
    }

    getNamesList() {
        return [this.getName()];
    }

    getType() {
        return '';
    }

    getTitle(stats) {
        if (!this.params.title) {
            return '';
        }

        return UI.Lang.getTalent(this.params.title, stats);
    }

    getIcon() {
        if (this.params.icon) {
            return this.params.icon.name;
        }
        return '';
    }

    getDescription(stats) {
        if (!this.params.description) {
            return '';
        }

        return UI.Lang.getTalent(this.params.description, stats);
    }

    getInfo() {
        return this.params.info;
    }

    getLevel(settings) {
        return getSkillLevelByName(this.params.levelSetting, settings);
    }

    isHidden(settings) {
        if (this.params.isHidden) {
            return true;
        }

        let subcond = this.params.hideCondition;
        if (subcond) {
            for (let i = 0; i < subcond.length; ++i) {
                const cond = subcond[i];

                if (cond.isActive(settings)) {
                    return true;
                }
            }
        }

        return false;
    }

    isActive(settings) {
        return this.checkSubconditions(settings);
    }

    isSerializable() {
        let name = this.getName();
        let type = this.getType();

        if (!name && !type || type == 'static') {
            return false;
        }

        return true;
    }

    getMaxStacks(settings) {
        return this.params.maxStacks || 0;
    }

    checkSubconditions(settings) {
        if (this.params.condition) {
            return this.params.condition.isActive(settings);
        } else {
            // deprecated
            let subcond = this.params.subConditions;
            if (subcond) {
                for (let i = 0; i < subcond.length; ++i) {
                    const cond = subcond[i];
                    if (!cond.isActive(settings)) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    getData(settings) {
        let result = {
            settings: {},
        };

        if (this.isActive(settings)) {
            result.settings = this.params.settings || {};
            result.stats = this.getStats(settings);
        } else {
            result.stats = new Stats();
        }

        return result;
    }

    getStats(settings) {
        return new Stats(this.params.stats || {});
    }

    /**
     * Stats shown in the title and description: the condition's own stats
     * plus `displayStats` (same format as `stats`), which are never applied.
     * A saved control whose effect is a hidden delivery keeps quoting the
     * delivered numbers this way.
     *
     * @param {Object} settings
     * @returns {Stats}
     */
    getDisplayStats(settings) {
        let result = this.getStats(settings);
        if (!this.params.displayStats) {
            return result;
        }

        let view = Object.create(this);
        view.params = Object.assign({}, this.params, {stats: this.params.displayStats, displayStats: undefined});
        result = new Stats(result);
        result.concat(view.getStats(settings));
        return result;
    }

    getBuffRotationSection(settings) {
        return this.params.rotation || '';
    }

    static allConditionsOn(conditions, buildSettings) {
        let settings = {};
        let localSettings = buildSettings || {};

        for (let i = 0; i < conditions.length; ++i) {
            const cond = conditions[i];
            // A retired serialize ID only decodes old data; it has no setting.
            if (cond.isRetired && cond.isRetired()) {
                continue;
            }

            let type = cond.getType();
            if (type == 'stacks') {
                settings[cond.getName()] = cond.getMaxStacks();
            } else if (type == 'checkbox') {
                settings[cond.getName()] = true;
            } else if (type == 'dropdown') {
                let value = cond.params.suggesterValue;
                if (value === undefined) {
                    value = cond.params.defaultValue;
                }
                settings[cond.getName()] = value === undefined ? '' : value;
            } else if (type == 'number') {
                let value = cond.getMaxValue(localSettings);
                if (value === undefined) {
                    value = cond.getMinValue(localSettings);
                }
                settings[cond.getName()] = value === undefined ? 0 : value;
            } else if (cond.getAllConditionsOn) {
                Object.assign(settings, cond.getAllConditionsOn(localSettings));
            }
        }

        return settings;
    }

    static allConditionsOff(conditions) {
        let settings = {};

        for (let i = 0; i < conditions.length; ++i) {
            const cond = conditions[i];
            if (cond.isRetired && cond.isRetired()) {
                continue;
            }

            let type = cond.getType();
            if (type == 'stacks') {
                settings[cond.getName()] = 0;
            } else if (type == 'checkbox') {
                settings[cond.getName()] = false;
            } else if (type == 'number') {
                settings[cond.getName()] = 0;
            }
        }

        return settings;
    }

    static setCommonValues(settings, conditions) {
        let result = {};

        for (let i = 0; i < conditions.length; ++i) {
            const name = conditions[i].getName();

            if (/^common\./.test(name)) {
                settings[name] ||= 0;
                result[name] = settings[name];
            }
        }

        return result;
    }

    static unwrap(items, settings) {
        let result = [];

        for (let item of items) {
            if (item.getCondtitionList) {
                for (let subItem of item.getCondtitionList()) {
                    if (!settings || subItem.isActive(settings)) {
                        result.push(subItem);
                    }
                }
            } else {
                result.push(item);
            }
        }

        return result;
    }
}
