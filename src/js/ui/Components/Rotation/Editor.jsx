import React from "react";
import { Lang } from "../../Lang";

import { RotationConditionModal } from "./ConditionModal";
import { RotationFeatureModal } from "./FeatureModal";
import { ControlsBar } from "../ControlsBar";
import { TitledButton } from "../Inputs/Buttons";
import { FullHeight, FullHeightScrollable, FullHeightStatic } from "../FullHeight";
import { RotationList } from "./List";
import { Rotation } from "../../../classes/Rotation";
import { RotationStorageModal } from "./StorageModal";
import { RotationBlockModal } from "./BlockModal";
import { RotationArtifactConditionModal } from "./ArtifactConditionModal";
import { RotationSwitchModal } from "./SwitchModal";
import { ROTATION_TEAM } from "../../../classes/RotationCompiler";

const lang = new Lang();

export class RotationEditor extends React.Component {
    constructor(props) {
        super(props);

        this.lastBuildHash = '';

        this.makeButtons();
    }

    // shouldComponentUpdate(nextProps, nextState) {
    //     return this.lastBuildHash != nextProps.build.getHash();
    // }

    componentDidMount() {
        this.lastBuildHash = '';
    }

    refreshModal() {
        this.props.app.refresh({objects: ['storage.rotation']});
        this.handleOpenStorage();
    }

    triggerRotationUpdate() {
        if (this.props.onRotationChange) {
            this.props.onRotationChange(this.rotation);
        }
    }

    handleCreateFeature() {
        this.featureModal.show({}, (data) => {
            if (data) {
                data.type = "feature";
                this.rotation.addItem(data);
                this.triggerRotationUpdate();
            }
        });
    }

    handleCreateCondition() {
        this.conditionModal.show({}, (data) => {
            if (data) {
                this.rotation.addItem(data);
                this.triggerRotationUpdate();
            }
        });
    }

    handleCreateSwitch() {
        this.switchModal.show({}, (data) => {
            this.rotation.addItem(data);
            this.triggerRotationUpdate();
        });
    }

    handleCreateBlock() {
        this.blockModal.show({}, (type) => {
            if (type == 'repeat') {
                this.rotation.addItem({type: 'repeat', count: 1, items: []});
            } else if (type == 'uptime') {
                this.rotation.addItem({type: 'uptime', typeId: 1, percent: 100, conditions: [], features: []});
            } else {
                return;
            }

            this.triggerRotationUpdate();
        });
    }

    handleCreateArtifacts() {
        this.artifactConditionModal.show({}, (items) => {
            if (items && items.length) {
                for (const item of items) {
                    this.rotation.addItem(item);
                }
                this.triggerRotationUpdate();
            }
        });
    }

    handleOpenStorage() {
        this.rotation = this.props.build.team.getRotation();

        this.storageModal.show({
            rotation: this.rotation,
        });
    }

    handleEditItem(index) {
        let item = this.rotation.getItem(index);

        if (item.type == 'feature') {
            this.featureModal.show(item, (data) => {
                if (data && DB.Features.Rotation.getByName(data.feature)) {
                    data.type = "feature";
                    this.rotation.replaceItem(index, data);
                    this.triggerRotationUpdate();
                }
            });
        } else if (item.type == 'condition') {
            this.conditionModal.show(item, (data) => {
                if (data) {
                    this.rotation.replaceItem(index, data);
                    this.triggerRotationUpdate();
                }
            });
        } else if (item.type == 'action' && item.action == 'switch') {
            this.switchModal.show(item, (data) => {
                this.rotation.replaceItem(index, data);
                this.triggerRotationUpdate();
            });
        } else if (item.type == 'repeat') {
            UI.PromptWindow.show('rotation_view.enter_value', item.count, (text) => {
                item.count = Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, parseInt(text)));
                this.triggerRotationUpdate();
            });
        } else if (item.type == 'uptime') {
            UI.PromptWindow.show('rotation_view.enter_value', item.percent, (text) => {
                item.percent = Math.max(0, Math.min(100, parseInt(text)));
                this.triggerRotationUpdate();
            });
        }
    }

    handleEnableItem(index) {
        let item = this.rotation.getItem(index);

        if (item) {
            item.disabled = !item.disabled;
            this.triggerRotationUpdate();
        }
    }

    handleToggleItem(index) {
        let item = this.rotation.getItem(index);

        if (item) {
            item.collapsed = !item.collapsed;
            this.triggerRotationUpdate();
        }
    }

    handleDeleteItem(index) {
        UI.ConfirmWindow.show('modal.confirm', 'rotation_view.confirm_delete', () => {
            this.rotation.deleteItem(index);
            this.triggerRotationUpdate();
        });
    }

    handleClearRotation() {
        UI.ConfirmWindow.show('modal.confirm', 'rotation_view.clear_confirm', () => {
            this.rotation = new Rotation();
            this.triggerRotationUpdate();
        });
    }

    handleRotationUpdate(rotation) {
        if (rotation && rotation.getHash() != this.rotation.getHash()) {
            this.rotation = rotation;
            this.triggerRotationUpdate();
        }

        this.setState({});
    }

    handleSaveRotation(name) {
        let char = this.props.build.getChar().object;
        if (!name) {
            name = lang.get(char.getName());
        }

        this.props.storage.add(this.rotation, {
            title: name,
            icon: char.getId(),
        });
        this.refreshModal();
    }

    handleDeleteRotation(hash) {
        if (hash) {
            UI.ConfirmWindow.show('modal.confirm', 'rotation_view.confirm_delete', () => {
                this.props.storage.deleteByHash(hash);
                this.refreshModal();
            });
        }
    }

    handleOverrideRotation(hash) {
        let items = this.rotation.getItems();
        if (items.length) {
            UI.ConfirmWindow.show('modal.confirm', 'rotation_view.confirm_overwrite', () => {
                this.props.storage.updateByHash(hash, this.rotation);
                this.refreshModal();
            });
        }
    }

    handleLoadRotation(hash) {
        let data = this.props.storage.getByHash(hash);
        if (data) {
            UI.ConfirmWindow.show('modal.confirm', 'rotation_view.confirm_load', () => {
                // A rotation saved before rotations belonged to teams is the
                // viewed member's.
                this.props.app.setRotation(data.item.clone().assignOwner(this.props.build.char.getId()));
                this.refreshModal();
            });
        }
    }

    handleEditRotationName(hash, value) {
        this.props.storage.updateTitleByHash(hash, value);
        this.refreshModal();
    }

    handleEditRotationIcon(hash, charId) {
        this.props.storage.updateIconByHash(hash, charId);
        this.refreshModal();
    }

    dataRotationItems() {
        return this.rotation.clone().getItems();
    }

    makeButtons() {
        this.menuButtons = [
            {
                icon: 'icon-add',
                title: lang.get('rotation_view.add_feature'),
                onClick: () => this.handleCreateFeature(),
            },
            {
                icon: 'icon-add',
                title: lang.get('rotation_view.add_condition'),
                onClick: () => this.handleCreateCondition(),
            },
            {
                icon: 'icon-add',
                title: lang.get('rotation_view.add_switch'),
                onClick: () => this.handleCreateSwitch(),
            },
            {
                icon: 'icon-add',
                title: lang.get('rotation_view.add_block'),
                onClick: () => this.handleCreateBlock(),
            },
            {
                icon: 'icon-add',
                title: lang.get('rotation_view.add_artifacts'),
                onClick: () => this.handleCreateArtifacts(),
            },
            {
                icon: 'icon-delete',
                title: lang.get('rotation_view.clear'),
                onClick: () => this.handleClearRotation(),
            },
            {
                icon: 'icon-ok',
                title: lang.get('rotation_view.save_load'),
                onClick: () => this.handleOpenStorage(),
            },
        ];
    }

    render() {
        this.rotation = this.props.build.team.getRotation().clone();
        // The team's rotation, every member's hits.
        let view = this.props.app.view();
        let feature = view.getFeaturesList().find((item) => item.getName() == ROTATION_TEAM);
        let featureItems = feature ? feature.getResultForEditor() : [];
        let data = view.getBuildData();

        let items = this.dataRotationItems();
        let hasItems = items.length > 0;

        this.lastBuildHash = this.props.build.getHash();

        return (
            <FullHeight>
                <FullHeightStatic>
                    <ControlsBar wrap>
                        {this.menuButtons.map((button, index) => <TitledButton key={index} {...button} />)}
                        <TitledButton
                            icon="icon-ok"
                            title={lang.get('features_view.graph')}
                            tooltip={lang.get('features_view.graph_rotation_open')}
                            disabled={!feature}
                            onClick={() => UI.DamageGraphModal.showRotation()}
                        />
                    </ControlsBar>
                </FullHeightStatic>
                <FullHeightScrollable>
                    <RotationList
                        build={this.props.build}
                        items={items}
                        featureItems={featureItems}
                        settings={data.settings}
                        onSortItems={(rotation) => this.handleRotationUpdate(rotation)}
                        onEdit={(index) => this.handleEditItem(index)}
                        onDelete={(index) => this.handleDeleteItem(index)}
                        onEnable={(index) => this.handleEnableItem(index)}
                        onToggle={(index) => this.handleToggleItem(index)}
                    />
                </FullHeightScrollable>
                <RotationFeatureModal
                    ref={obj => this.featureModal = obj}
                    app={this.props.app}
                    build={this.props.build}
                />
                <RotationConditionModal
                    ref={obj => this.conditionModal = obj}
                    app={this.props.app}
                    build={this.props.build}
                />
                <RotationStorageModal
                    ref={obj => this.storageModal = obj}
                    storage={this.props.storage}
                    onSave={(name) => this.handleSaveRotation(name)}
                    onDelete={(hash) => this.handleDeleteRotation(hash)}
                    onOverride={hasItems ? (hash) => this.handleOverrideRotation(hash) : undefined}
                    onLoad={(hash) => this.handleLoadRotation(hash)}
                    onEditName={(hash, value) => this.handleEditRotationName(hash, value)}
                    onEditIcon={(hash, value) => this.handleEditRotationIcon(hash, value)}
                />
                <RotationBlockModal
                    ref={obj => this.blockModal = obj}
                />
                <RotationArtifactConditionModal
                    ref={obj => this.artifactConditionModal = obj}
                    build={this.props.build}
                />
                <RotationSwitchModal
                    ref={obj => this.switchModal = obj}
                    build={this.props.build}
                />
            </FullHeight>
        );
    }
}
