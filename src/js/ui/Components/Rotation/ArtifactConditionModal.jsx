import React from "react";

import { ControlsBar } from "../ControlsBar";
import { DialogContainer } from "../Dialog/Container";
import { Dropdown } from "../Inputs/Dropdown";
import { Lang } from "../../Lang";
import { TitledButton } from "../Inputs/Buttons";
import { ConditionList } from "../ConditionList";
import { Condition } from "../../../classes/Condition";
import { Rotation } from "../../../classes/Rotation";

let lang = new Lang();

export class RotationArtifactConditionModal extends React.PureComponent {
    constructor(props) {
        super(props);

        this.artifactItems = [];

        this.state = {
            isVisible: false,
            selectedSetId: 0,
            receiverId: 0,
            conditions: [],
            values: {},
        };
    }

    show(data, saveCallback) {
        this.saveCallback = saveCallback;

        // Build a flat list of all artifact sets for the dropdown
        this.artifactItems = this.buildArtifactSetList();

        // Pick the first set by default (or restore previous selection)
        let selectedSetId = this.state.selectedSetId;
        if (!selectedSetId && this.artifactItems.length) {
            selectedSetId = this.artifactItems[0].value;
        }

        const conditions = this.getConditionsForSet(selectedSetId);

        this.setState({
            isVisible: true,
            receiverId: 0,
            selectedSetId,
            conditions,
            values: {},
        });
    }

    buildArtifactSetList() {
        let items = [];
        const showBeta = this.props.build.getStats().settings.showBetaContent?.() ?? true;

        for (let set of DB.Artifacts.Sets.getList(1)) {
            if (set.isBeta() && !showBeta) continue;

            // Only include sets that have any conditions
            const conds = set.getConditions(5);
            if (!conds.length) continue;

            items.push({
                value: set.getId(),
                text: lang.get(set.getName()),
                set: set,
            });
        }

        // Sort alphabetically
        items.sort((a, b) => a.text.localeCompare(b.text));

        return items;
    }

    getConditionsForSet(setId) {
        if (!setId) return [];
        const set = DB.Artifacts.Sets.getById(setId);
        if (!set) return [];
        return set.getConditions(5).filter(cond => {
            const type = cond.getType();
            return type && type !== 'static';
        });
    }

    handleSetChange(item) {
        const conditions = this.getConditionsForSet(item.value);

        this.setState({
            selectedSetId: item.value,
            conditions,
            values: {},
        });
    }

    handleSettingChange(name, value) {
        this.setState(prevState => ({
            values: {
                ...prevState.values,
                [name]: value
            }
        }));
    }

    handleSave() {
        const { selectedSetId, conditions, values } = this.state;
        if (!this.saveCallback || !selectedSetId || conditions.length === 0) return;

        let items = [];

        for (const cond of conditions) {
            const val = values[cond.getName()];
            // A step on the viewed member's artifacts.
            const itemSpec = {
                type: 'condition',
                subtype: 'member',
                charId: this.props.build.char.getId(),
                object: 'artifacts',
                itemId: selectedSetId,
                conditionId: cond.getId(),
                value: val !== undefined ? val : '',
            };

            if (this.state.receiverId) itemSpec.receiverId = this.state.receiverId;

            // For dropdown-type conditions resolve the value id
            const condData = Rotation.getConditionData(itemSpec);
            if (condData && condData.cond) {
                const type = condData.cond.getType();
                if (type === 'dropdown' || type === 'dropdown_multiple') {
                    const settings = {};
                    settings[condData.cond.getName()] = itemSpec.value;
                    itemSpec.value = condData.cond.getSelectedId(settings);
                }
            }

            items.push(itemSpec);
        }

        this.saveCallback(items);
        this.setState({ isVisible: false });
    }

    handleClose() {
        this.setState({ isVisible: false });
    }

    render() {
        const { isVisible, selectedSetId, conditions, values } = this.state;

        // Build localSettings so ConditionList can render the current value
        let settings = {};
        if (this.props.build) {
            settings = Object.assign({}, this.props.build.getStats().settings);
        }

        // Apply selected values to settings
        for (const cond of conditions) {
            const name = cond.getName();
            if (values[name] !== undefined) {
                settings[name] = values[name];
            }
        }

        return (
            <DialogContainer
                addClass="rotation-feature-modal"
                width={500}
                isVisible={isVisible}
                title={lang.get('modal_window.rotation_artifacts')}
                closeCallback={() => this.handleClose()}
            >
                {/* Artifact set selector dropdown */}
                <ControlsBar>
                    <Dropdown
                        barClass="resizable"
                        items={this.artifactItems}
                        selected={selectedSetId}
                        onChange={(item) => this.handleSetChange(item)}
                    />
                </ControlsBar>

                <ControlsBar>
                    <div>{lang.get('rotation_view.condition_receiver')}</div>
                    <Dropdown
                        barClass="resizable"
                        items={[{value: 0, text: lang.get('rotation_view.condition_source')}].concat(this.props.build.team.getMembers().map((member) => ({
                            value: member.char.getId(), text: lang.get(member.char.object.getName()),
                        })))}
                        selected={this.state.receiverId}
                        onChange={(item) => this.setState({receiverId: item.value})}
                    />
                </ControlsBar>

                {/* Condition value editor */}
                <ConditionList
                    items={conditions}
                    charId={0}
                    settings={settings}
                    ignoreSubconditions={true}
                    onChange={(name, val) => this.handleSettingChange(name, val)}
                />

                {/* Action buttons */}
                <ControlsBar>
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
