import React, { Fragment } from 'react';
import "../../../../css/Components/Accordion/SetBonuses.css";

import { ArtifactSetIcon } from '../Icons';
import { Checkbox } from '../Inputs/Input';
import { ControlsBar } from '../ControlsBar';
import { GroupBox } from '../Inputs/GroupBox';
import { Lang } from '../../Lang';
import { TitledButton } from '../Inputs/Buttons';
import { setProfileControls } from '../../../classes/ArtifactSetProfile';

export class AccordionSetBonuses extends React.Component {
    constructor(props) {
        super(props);

        this.lang = new Lang();

        this.strings = {
            enable_all: this.lang.get('artifact_profile.allow_all'),
            disable_all: this.lang.get('artifact_profile.disallow_all'),
            pieces_1: this.lang.get('artifact_profile.allow_1'),
            pieces_2: this.lang.get('artifact_profile.allow_2'),
            pieces_3: this.lang.get('artifact_profile.allow_3'),
            pieces_4: this.lang.get('artifact_profile.allow_4'),
            pieces_5: this.lang.get('artifact_profile.allow_5'),
        };
    }

    getItem(setName) {
        let setData = DB.Artifacts.Sets.get(setName);
        let pieces = [];

        let itemData = this.props.sets[setName];

        for (let p of itemData.pieces) {
            let id = setName +'-'+ p;
            pieces.push(
                <Checkbox
                    key={id}
                    checked={!!this.props.settings[id]}
                    title={this.strings['pieces_'+ p]}
                    onChange={(value) => {this.props.onChange(id, value);}}
                />
            );
        }

        return (
            <GroupBox key={setName}>
                <div className="accordion-set-bonuses">
                    <ArtifactSetIcon size="60" set={setName}/>
                    <div className="data">
                        <div className="title">
                            {this.lang.get(setData.getName())}
                            <div className="pieces">
                                {pieces}
                            </div>
                        </div>
                    </div>
                </div>
                {setProfileControls(setName).length ? (
                    <button type="button" className="set-profile-link" onClick={() => this.props.onOpenProfile(setName)}>
                        {this.lang.get('artifact_profile.edit')}
                    </button>
                ) : null}
            </GroupBox>
        );
    }

    render() {
        let setBonuses = [];

        for (const setName of DB.Artifacts.Sets.getKeysSorted(null, this.props.showBeta)) {
            if (!this.props.sets[setName]) {
                continue;
            }

            setBonuses.push( this.getItem(setName) );
        }

        return (
            <Fragment>
                <p>{this.lang.get('artifact_profile.allow_help')}</p>
                <ControlsBar>
                    <div><TitledButton title={this.strings.enable_all} onClick={this.props.enableAction} icon="button-icon-unlock"/></div>
                    <div><TitledButton title={this.strings.disable_all} onClick={this.props.disableAction} icon="button-icon-lock"/></div>
                </ControlsBar>
                {setBonuses}
            </Fragment>
        );
    }
}
