import React from 'react';
import "../../../css/Components/Tab/Build.css"

import { ReactTab, TabModes } from '../Components/Tab';
import { Lang } from '../Lang';
import { Tab } from "../Tab";
import { ArtifactsView } from './Artifacts';
import { CharView } from './Char';
import { WeaponView } from './Weapon';

let lang = new Lang();

export class BuildTab extends Tab {
    constructor(params) {
        super(params);

        this.id = 'build';
        this.rightRab = true;
        this.title = 'tab_header.build';
    }

    refresh() {
        if (!this.component) {
            return;
        }

        this.component.setState({
            feature: this.app.getFeature(),
        });
        this.component.artifactsView?.invalidateModals();
    }

    createContent() {
        return (
            <BuildView
                ref={element => { this.component = element; }}
                app={this.app}
                title={this.title}
            />
        );
    }
}

/**
 * The viewed member's own gear: character, weapon and artifacts, one mode
 * each, with the tab modes under the header like in the Share tab.
 */
export class BuildView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            mode: 'char',
        };
        this.strings = {
            title: lang.get(this.props.title),
        };
        this.artifactsView = null;
    }

    render() {
        let modes = (
            <TabModes
                items={[
                    {value: 'char', title: lang.get('tab_header.char')},
                    {value: 'weapon', title: lang.get('tab_header.weapon')},
                    {value: 'artifacts', title: lang.get('tab_header.artifacts')},
                ]}
                selected={this.state.mode}
                onChange={(mode) => this.setState({mode})}
            />
        );

        return (
            <ReactTab title={this.strings.title}>
                {modes}
                {this.state.mode == 'weapon' ? this.renderWeapon() : null}
                {this.state.mode == 'artifacts' ? this.renderArtifacts() : null}
                {this.state.mode == 'char' ? this.renderChar() : null}
            </ReactTab>
        );
    }

    renderChar() {
        return (
            <CharView
                embedded={true}
                app={this.props.app}
                title="tab_header.char"
            />
        );
    }

    renderWeapon() {
        return (
            <WeaponView
                embedded={true}
                app={this.props.app}
                title="tab_header.weapon"
            />
        );
    }

    renderArtifacts() {
        return (
            <ArtifactsView
                ref={element => { this.artifactsView = element; }}
                embedded={true}
                app={this.props.app}
                title="tab_header.artifacts"
            />
        );
    }
}
