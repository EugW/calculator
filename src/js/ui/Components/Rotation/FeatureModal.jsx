import React from "react";
import "../../../../css/Components/Tab/Rotation/FeatureModal.css"

import { ControlsBar, ControlsBarDivider } from "../../Components/ControlsBar";
import { DialogContainer } from "../../Components/Dialog/Container";
import { Dropdown } from "../../Components/Inputs/Dropdown";
import { Lang } from "../../Lang";
import { NumberInput, RadioList } from "../../Components/Inputs/Input";
import { TitledButton } from "../../Components/Inputs/Buttons";
import { Feature2 } from "../../../classes/Feature2";

let lang = new Lang();

/**
 * The first hit of a member's dropdown items.
 */
function firstFeature(items) {
    let item = items.find((item) => !item.isCaption);
    return item ? item.value : '';
}

const reactionRadios = [
    {value: 0, title: lang.get('feature_reaction.none')},
    {value: 1, title: lang.get('feature_reaction.melt')},
    {value: 2, title: lang.get('feature_reaction.vaporize')},
    {value: 3, title: lang.get('feature_reaction.quicken')},
];

export class RotationFeatureModal extends React.PureComponent {
    constructor(props) {
        super(props);

        this.members = [];

        this.state = {
            isVisible: false,
            charId: 0,
            feature: '',
            reaction: 0,
            count: 1,
        };
    }

    show(data, saveCallback) {
        this.members = this.buildMembers(data);
        this.saveCallback = saveCallback;

        // The edited hit's member, otherwise the viewed member.
        let member = this.memberOf(data.feature ? data.charId : this.props.build.char.getId()) || this.members[0];
        let feature = '';
        if (member) {
            feature = data.feature && member.value == data.charId ? data.feature : firstFeature(member.items);
        }

        this.setState({
            isVisible: true,
            data: data,
            charId: member ? member.value : 0,
            feature: feature,
            reaction: data.reaction || 0,
            count: data.count || 1,
        });
    }

    /**
     * @param {number} charId
     * @returns {Object|undefined} the member's dropdown item, with its hits
     */
    memberOf(charId) {
        return this.members.find((item) => item.value == charId);
    }

    /**
     * The members of the team that have hits, the viewed member first, each
     * with its hits: the dropdown of hits lists the selected member's.
     *
     * @param {Object} edited the edited hit: its feature is listed even when
     *     new hits are not offered it (Feature2.isRotationChoice)
     */
    buildMembers(edited) {
        let build = this.props.build;
        let members = [build].concat(build.team.getMembers().filter((member) => member !== build));
        let result = [];

        for (let member of members) {
            let view = this.props.app.teamView().member(member);
            let data = view.getBuildData();
            let features = {};
            for (let feat of member.getFeaturesList({ignoreRotation: true})) {
                if (!feat.checkConditions(data) || !feat.usedInRotation()) continue;
                if (!DB.Features.Rotation.getByName(feat.getName())) continue;
                let isEdited = edited.feature == feat.getName() && edited.charId == member.char.getId();
                if (!feat.isRotationChoice() && !isEdited) continue;
                features[feat.getName()] = feat;
            }

            let items = Feature2.buildDropdown(view, {features});
            if (!firstFeature(items)) continue;

            let char = member.char.get();
            result.push({
                value: char.getId(),
                text: lang.get(char.getName()),
                textIcons: [' sprite sprite-24 ' + char.getIcon()],
                items: items,
            });
        }

        return result;
    }

    handleSave() {
        let member = this.memberOf(this.state.charId);
        let selected = member && member.items.find((item) => !item.isCaption && item.value == this.state.feature);
        if (this.saveCallback && selected) {
            this.saveCallback({
                charId: member.value,
                feature: selected.value,
                reaction: this.state.reaction,
                count: this.state.count,
            });
        }

        this.setState({isVisible: false});
    }

    handleClose() {
        this.setState({isVisible: false});
    }

    handleMember(member) {
        this.setState({charId: member.value, feature: firstFeature(member.items)});
    }

    handleFeature(value) {
        this.setState({feature: value});
    }

    handleHitsChange(value) {
        this.setState({count: value});
    }

    handleReactionChange(value) {
        this.setState({reaction: value});
    }

    render() {
        let member = this.memberOf(this.state.charId);

        return (
            <DialogContainer
                addClass="rotation-feature-modal"
                width={500}
                isVisible={this.state.isVisible}
                title={lang.get('modal_window.rotation_feature')}
                closeCallback={() => this.handleClose()}
            >
                {member ? <ControlsBar>
                    <Dropdown
                        barClass="rotation-member"
                        items={this.members}
                        selected={member.value}
                        onChange={(item) => this.handleMember(item)}
                    />
                    <Dropdown
                        barClass="resizable"
                        items={member.items}
                        selected={this.state.feature}
                        onChange={(item) => this.handleFeature(item.value)}
                    />
                </ControlsBar> : null}
                <div className="line">
                    <RadioList
                        items={reactionRadios}
                        selected={this.state.reaction}
                        onChange={(value) => this.handleReactionChange(value)}
                    />
                </div>
                <div className="line">
                    <div>{lang.get('rotation_view.feature_count')}</div>
                    <NumberInput
                        value={this.state.count}
                        nonEmpty={true}
                        minValue={1}
                        maxValue={10000}
                        size={5}
                        onChange={(value) => this.handleHitsChange(value)}
                    />
                </div>
                <ControlsBar>
                    <ControlsBarDivider />
                    <TitledButton
                        icon="icon-ok"
                        title={lang.get('modal_buttons.confirm')}
                        onClick={() => this.handleSave()}
                    />
                    <TitledButton
                        icon="icon-cancel"
                        title={lang.get('modal_buttons.cancel')}
                        onClick={() => this.handleClose()}
                    />
                </ControlsBar>
            </DialogContainer>
        );
    }
}
