import React from 'react';
import "../../../css/Components/Tab/Buffs.css"

import { Accordion, AccordionItem } from '../Components/Accordion';
import { FullHeight, FullHeightScrollable } from '../Components/FullHeight';
import { ReactTab } from '../Components/Tab';
import { Lang } from '../Lang';
import { Tab } from "../Tab";
import { teammateContributions } from '../../classes/Team/Contributions';
import { CustomStats } from './Buffs/CustomStats';
import { chosenFoodCount, FoodSection } from './Buffs/Food';
import { legacyCount, LegacySection } from './Buffs/Legacy';
import { Received } from './Buffs/Received';

export class BuffsTab extends Tab {
    constructor(params) {
        super(params);

        this.id = 'buffs';
        this.rightRab = true;
        this.title = 'tab_header.buff_view';
    }

    refresh() {
        if (!this.component) {
            return;
        }

        this.component.setState({
            feature: this.app.getFeature(),
            displayMode: this.app.getDisplayMode(),
        });
    }

    createContent() {
        return (
            <Buffs
                ref={element => { this.component = element; }}
                app={this.app}
                title={this.title}
                feature={this.app.getFeature()}
                displayMode={this.app.getDisplayMode()}
            />
        );
    }
}

/**
 * What the viewed member gets besides its own gear: from its teammates,
 * from the team's additional buffs (the legacy source, Team/Legacy: virtual
 * characters, weapons and sets with no wielder), from food and as custom
 * bonuses.
 */
export class Buffs extends React.Component {
    constructor(props) {
        super(props);

        this.lang = new Lang();
        this.state = {
            feature: props.feature,
            displayMode: props.displayMode,
        };

        this.strings = {
            title: this.lang.get('tab_header.buff_view'),
            received: this.lang.get('team.received'),
            food: this.lang.get('tab_header.food'),
            custom: this.lang.get('buff_group.custom'),
            legacy: this.lang.get('legacy.title'),
        };
    }

    handleFeature(feature) {
        this.setState({feature: feature});
        this.props.app.setFeature(feature);
    }

    handleDisplayMode(mode) {
        this.setState({displayMode: mode});
        this.props.app.setDisplayMode(mode);
    }

    handleSettingChange(name, value) {
        let data = {};
        data[name] = value;
        this.props.app.modifyBuffsSettings(data);
    }

    render() {
        return (
            <ReactTab
                title={this.strings.title}
            >
                {this.tabContent()}
            </ReactTab>
        );
    }

    tabContent() {
        let settings = this.props.app.getStats().settings;

        let buffCount = countCustomStats(settings);
        let foodCount = chosenFoodCount(this.props.app);
        let entryCount = legacyCount(this.props.app.getTeam());
        let contributions = teammateContributions(this.props.app.currentSet());

        return (
            <FullHeight>
                <FullHeightScrollable>
                    <Accordion>
                        {contributions.length ? (
                            <AccordionItem id="received" title={this.strings.received}>
                                <Received items={contributions} />
                            </AccordionItem>
                        ) : null}
                        {/* The team's, whichever member is viewed. Every entry's controls: lazy. */}
                        <AccordionItem id="legacy" lazy={true} title={this.strings.legacy + (entryCount ? ` (${entryCount})` : '')}>
                            <LegacySection app={this.props.app} />
                        </AccordionItem>
                        {/* Each dish is a separate evaluation of the team: lazy. */}
                        <AccordionItem id="food" lazy={true} title={this.strings.food + (foodCount ? ` (${foodCount})` : '')}>
                            <FoodSection
                                app={this.props.app}
                                feature={this.state.feature}
                                displayMode={this.state.displayMode}
                                onFeatureChange={(feature) => this.handleFeature(feature)}
                                onDisplayModeChange={(mode) => this.handleDisplayMode(mode)}
                            />
                        </AccordionItem>
                        <AccordionItem id="custom" title={this.strings.custom + (buffCount ? ` (${buffCount})` : '')}>
                            <CustomStats
                                settings={settings}
                                onChange={(name, value) => this.handleSettingChange(name, value)}
                            />
                        </AccordionItem>
                    </Accordion>
                </FullHeightScrollable>
            </FullHeight>
        );
    }
}

function countCustomStats(settings) {
    let count = 0;

    for (let key of Object.keys(settings)) {
        let m = key.match(/custom_buffs.(.*)+/);
        if (m && settings[key]) {
            ++count;
        }
    }

    return count;
}
