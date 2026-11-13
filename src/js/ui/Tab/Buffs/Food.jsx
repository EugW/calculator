import React from 'react';
import "../../../../css/Components/Tab/Buffs/Food.css"

import { ControlsBar } from '../../Components/ControlsBar';
import { Dropdown } from '../../Components/Inputs/Dropdown';
import { Feature2 } from '../../../classes/Feature2';
import { FeatureTableHeader } from '../../Components/FeatureTable';
import { FoodList } from './Food/List';
import { FoodTypes } from './Food/Types';
import { Lang } from '../../Lang';

let lang = new Lang();

const DISPLAY_MODES = [
    {value: 'percent', text: lang.get('suggester.display_percent')},
    {value: 'absolute', text: lang.get('suggester.display_absolute')},
];

/**
 * The viewed member's food: one dish per type, and every dish with what it
 * changes in the chosen feature. The feature and the display mode are the
 * ones the comparisons share; the Buffs tab keeps them.
 *
 * @param {{app: App, feature: string, displayMode: string, onFeatureChange: function(string), onDisplayModeChange: function(string)}} props
 */
export class FoodSection extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            foodCategory: 'Attack',
            levels: {
                1: false,
                2: false,
                3: true,
                4: true,
            },
        };
    }

    handleTypeChange(type) {
        this.setState({foodCategory: type});
    }

    handleLevelSelect(level) {
        let levels = this.state.levels;
        levels[level] = !levels[level];
        this.setState({levels: levels});
    }

    handleFoodSelect(food, level) {
        let curFood  = this.props.app.getFood(this.state.foodCategory);
        let curLevel = this.props.app.getFoodLevel(this.state.foodCategory);

        if (curFood == food && curLevel == level) {
            this.props.app.setFood(this.state.foodCategory, null, 0);
        } else {
            this.props.app.setFood(this.state.foodCategory, food, level);
        }
    }

    dataFeaturesItems() {
        return Feature2.buildDropdown(this.props.app.view());
    }

    buildFoodList() {
        this.foodList = [];

        let data = DB.Food.get(this.state.foodCategory);
        if (!data) {
            return;
        }

        let build = this.props.app.currentSet().clone();
        let view = build.view();
        let buildData = view.getBuildData();
        let feature = view.getFeatureByName(this.props.feature, buildData);
        if (!feature) {
            return;
        }

        this.baseResult = feature.getResult(buildData)[this.props.feature];

        let items = data.getList();
        let curFood  = this.props.app.getFood(this.state.foodCategory);
        let curLevel = this.props.app.getFoodLevel(this.state.foodCategory);

        for (let food of items) {
            for (let level = 1; level <= 4; ++level) {
                if (food == curFood && level == curLevel) {
                    // Always show selected
                } else if (this.state.foodCategory == 'Potion') {
                    if (level > 1) {
                        continue;
                    }
                } else {
                    if (!this.state.levels[level]) {
                        continue;
                    }

                    if (level < 4 && !food.hasCommon()) {
                        continue;
                    }

                    if (level == 4 && !food.hasSpecial()) {
                        continue;
                    }
                }

                build.setFood(this.state.foodCategory, food, level);
                buildData = build.getBuildData();
                let result = feature.getResult(buildData)[this.props.feature];

                this.foodList.push({
                    type: this.state.foodCategory,
                    food: food,
                    level: level,
                    result: result,
                });
            }
        }

        if (this.baseResult) {
            this.foodList = this.foodList.sort(function(a, b) {return b.result.average - a.result.average;});
        }
    }

    render() {
        this.buildFoodList();

        return (
            <div className="food-section">
                <ControlsBar>
                    <Dropdown
                        barClass="resizable"
                        items={this.dataFeaturesItems()}
                        selected={this.props.feature}
                        onChange={(item) => this.props.onFeatureChange(item.value)}
                    />
                    <Dropdown
                        barClass="feature-type"
                        items={DISPLAY_MODES}
                        selected={this.props.displayMode}
                        onChange={(item) => this.props.onDisplayModeChange(item.value)}
                    />
                </ControlsBar>
                <FoodTypes
                    app={this.props.app}
                    selectedType={this.state.foodCategory}
                    onTypeChange={(type) => this.handleTypeChange(type)}
                />
                <FoodLevels
                    selected={this.state.levels}
                    onClick={(level) => this.handleLevelSelect(level)}
                />
                <FeatureTableHeader />
                <FoodList
                    foodCategory={this.state.foodCategory}
                    items={this.foodList}
                    base={this.baseResult}
                    levels={this.state.levels}
                    displayMode={this.props.displayMode}
                    selectedFoodLevel={this.props.app.getFoodLevel(this.state.foodCategory)}
                    selectedFood={this.props.app.getFood(this.state.foodCategory)}
                    onClick={(name, level) => this.handleFoodSelect(name, level)}
                />
            </div>
        );
    }
}

/**
 * @param {App} app
 * @returns {number} food types with a dish chosen
 */
export function chosenFoodCount(app) {
    return DB.Food.getKeys().filter((type) => !!app.getFood(type)).length;
}

function FoodLevels(props) {
    let items = [];

    for (let i = 1; i <= 4; ++i) {
        items.push(
            <div
                key={i}
                className={'item'+ (props.selected[i] ? ' active' : '')}
                onClick={() => props.onClick(i)}
            >
                {lang.get('food_view.quality_n_'+ i)}
            </div>
        );
    }

    return (
        <div className="food-tab-quality">
            {items}
        </div>
    );
}
