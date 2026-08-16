import { Condition } from "../Condition";
import { Stats } from "../Stats";
import { StatTableConditions } from "../StatTable/Condition";
import { ConditionDropdown } from "./Dropdown";
import { ConditionLevelSelect } from "./LevelSelect";
import { ConditionNumber } from "./Number";

export class ConditionPartyWeapon extends Condition {
    constructor(params) {
        super(params);

        this.cachedItems;
    }

    getType() {
        return 'party_weapon';
    }

    getNamesList() {
        let items = [];
        for (let i = 1; i <= this.getMaxNum(); ++i) {
            items.push(this.getParamName(i));
            let statName = this.getStatParamName(i);
            if (statName) {
                items.push(statName);
            }
            let modeName = this.getModeParamName(i);
            if (modeName) {
                items.push(modeName);
            }
        }
        return items;
    }

    getMaxNum() {
        return this.params.serializeIds.length;
    }

    getMaxDisplay() {
        return this.params.maxDisplay || this.getMaxNum();
    }

    getParamName(number) {
        let name = this.params.name;
        if (number > 1) {
            name += '_' + number;
        }
        return name;
    }

    getStatParamName(number) {
        if (!this.params.statName) {
            return;
        }

        let name = this.params.statName;
        if (number > 1) {
            name += '_' + number;
        }
        return name;
    }

    getModeParamName(number) {
        if (!this.params.modeName) {
            return;
        }

        let name = this.params.modeName;
        if (number > 1) {
            name += '_' + number;
        }
        return name;
    }

    isActive(settings) {
        let result = this.checkSubconditions(settings);
        if (!result) {
            return false;
        }

        for (let i = 1; i <= this.getMaxNum(); ++i) {
            if (settings[this.getParamName(i)] > 0) {
                return true;
            }
        }
        return false;
    }

    getLevel(settings, number) {
        return settings[this.getParamName(number)] || 0;
    }

    getMaxStacks(settings) {
        return 5;
    }

    getStats(settings) {
        let stats = new Stats();
        let max   = this.getMaxStacks(settings);

        for (let i = 1; i <= this.getMaxNum(); ++i) {
            let level = this.getLevel(settings, i);
            if (level > max) {
                level = max;
                settings[this.params.name] = max;
            }

            for (const stat of this.params.stats) {
                if (stat instanceof StatTableConditions) {
                    if (!stat.isActive(settings)) {
                        continue;
                    }
                }

                let statName = stat.getName();
                if (/^text_/.test(statName) && i > 1) continue;

                stats.add(statName, stat.getValue(level));
            }

            let statCond = this.createStatCond(i);
            if (statCond) {
                stats.concat(statCond.getStats(settings));
            }

            let modeCond = this.createModeCond(i);
            if (modeCond) {
                stats.concat(modeCond.getStats(settings));
            }
        }

        return stats;
    }

    getCondtitionList() {
        if (this.cachedItems) {
            return this.cachedItems;
        }

        let result = [];
        for (let i = 1; i <= this.getMaxNum(); ++i) {
            result.push(this.createLevelCond(i));
            if (this.params.statName) {
                result.push(this.createStatCond(i));
            }
            if (this.params.modeName) {
                result.push(this.createModeCond(i));
            }
        }

        this.cachedItems = result;
        return result;
    }

    createLevelCond(number) {
        return new ConditionLevelSelect({
            isHidden: number > this.params.maxDisplay,
            name: this.getParamName(number),
            serializeId: this.params.serializeIds[number-1],
            title: this.params.title,
            rotation: 'buffs',
            rotationNumber: number > 1 ? number : '',
            description: this.params.description,
            class: this.params.class,
            maxStacks: 5,
            icon: this.params.icon,
            stats: this.params.stats,
            beta: this.params.beta,
        });
    }

    createModeCond(number) {
        if (!this.params.modeName) {
            return;
        }

        return new ConditionDropdown({
            isHidden: number > this.params.maxDisplay,
            name: this.getModeParamName(number),
            serializeId: this.params.modeSerializeIds[number-1],
            title: this.params.modeTitle || this.params.title,
            rotation: 'buffs',
            rotationNumber: number > 1 ? number : '',
            dropdownClass: this.params.modeClass,
            hideEmpty: this.params.modeHideEmpty,
            defaultValue: this.params.modeDefaultValue,
            values: this.params.modeValues,
            beta: this.params.beta,
        });
    }

    createStatCond(number) {
        if (!this.params.statName) {
            return;
        }

        return new ConditionNumber({
            isHidden: number > this.params.maxDisplay,
            name: this.getStatParamName(number),
            serializeId: this.params.statSerializeIds[number-1],
            title: this.params.statTitle,
            class: this.params.statClass,
            rotation: 'buffs',
            rotationNumber: number > 1 ? number : '',
            max: this.params.statMax,
            icon: this.params.icon,
            beta: this.params.beta,
        });
    }
}
