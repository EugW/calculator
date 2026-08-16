import React from "react";
import "../../../../css/Components/Tab/WeaponSuggest/ListModal.css"

import { ConditionList } from "../../Components/ConditionList";
import { ControlsBar, ControlsBarDivider } from "../../Components/ControlsBar";
import { DialogContainer } from "../../Components/Dialog/Container";
import { FullHeight, FullHeightScrollable, FullHeightStatic } from "../../Components/FullHeight";
import { WeaponIcon } from "../../Components/Icons";
import { MiniButton, RoundButton, TitledButton, ToggleRoundButton } from "../../Components/Inputs/Buttons";
import { Checkbox, TextInput } from "../../Components/Inputs/Input";
import { Lang } from "../../Lang";
import { cloneWeaponSuggestData, createCustomWeaponScenario, getWeaponEditableConditions, getWeaponScenarioContextSettings, getWeaponSuggestItems, isWeaponScenarioCustomized } from "./utils";

let lang = new Lang();

export class WeaponSuggestListModal extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isVisible: false,
            weaponType: '',
            settings: {},
            contextSettings: {},
        };
    }

    show(data, saveCallback) {
        this.saveCallback = saveCallback;

        this.setState({
            weaponType: data.weaponType,
            showBeta: data.showBeta,
            settings: cloneWeaponSuggestData(data.settings),
            contextSettings: cloneWeaponSuggestData(data.contextSettings),
            isVisible: true,
        });
    }

    handleSave() {
        if (this.saveCallback) {
            this.saveCallback(cloneWeaponSuggestData(this.state.settings));
        }

        this.setState({
            isVisible: false,
        });
    }

    handleReset() {
        if (this.saveCallback) {
            this.saveCallback(null);
        }

        this.setState({
            isVisible: false,
        });
    }

    handleClose() {
        this.setState({isVisible: false});
    }

    handleItemSettingsChange(weaponName, id, itemSettings) {
        let settings = this.state.settings;
        settings[weaponName][id].settings = cloneWeaponSuggestData(itemSettings);
        this.setState({settings: settings});
    }

    handleItemNameChange(weaponName, id, value) {
        let settings = this.state.settings;
        settings[weaponName][id].customName = value;
        this.setState({settings: settings});
    }

    handleShowChange(weaponName, id, checked) {
        let settings = this.state.settings;
        settings[weaponName][id].show = checked;
        this.setState({settings: settings});
    }

    handleAddCustomLine(weaponName) {
        let settings = this.state.settings;
        let weapon = DB.Weapons.get(this.state.weaponType).get(weaponName);

        if (!weapon) {
            return;
        }

        let rowId = makeCustomRowId(settings[weaponName] || {});
        settings[weaponName][rowId] = createCustomWeaponScenario(
            weapon,
            this.state.contextSettings,
            weapon.getRarity(),
            ''
        );

        this.setState({settings: settings});
    }

    handleRemoveCustomLine(weaponName, id) {
        let settings = this.state.settings;

        if (!settings[weaponName] || !settings[weaponName][id] || !settings[weaponName][id].isCustom) {
            return;
        }

        delete settings[weaponName][id];
        this.setState({settings: settings});
    }

    handleRefineChange(weaponName, id, refine, checked) {
        let settings = this.state.settings;
        settings[weaponName][id].refine[refine] = checked;

        let haveChecked = false;
        for (let r = 1; r <= 5; ++r) {
            if (settings[weaponName][id].refine[r]) {
                haveChecked = true;
                break;
            }
        }

        if (haveChecked) {
            if (!settings[weaponName][id].show) {
                settings[weaponName][id].show = true;
            }
        } else {
            settings[weaponName][id].show = false;
        }

        this.setState({settings: settings});
    }

    handleSettingsOpen(weaponName, id) {
        let weapons = DB.Weapons.get(this.state.weaponType);
        let weapon = weapons && weapons.get(weaponName);
        let itemSettings = this.state.settings[weaponName] && this.state.settings[weaponName][id];

        if (!weapon || !itemSettings) {
            return;
        }

        let conditions = getWeaponEditableConditions(weapon, itemSettings.settings).filter((item) => {
            return item.isSerializable && item.isSerializable();
        });

        if (conditions.length == 0) {
            return;
        }

        this.settingsModal.show(
            {
                title: lang.get('artifacts_ui.settings'),
                conditions: conditions,
                settings: itemSettings.settings,
                contextSettings: getWeaponScenarioContextSettings(weapon, itemSettings, this.state.contextSettings),
            },
            (settings) => this.handleItemSettingsChange(weaponName, id, settings)
        );
    }

    render() {
        let maxHeight = UI.Layout.windowHeight() - (UI.Layout.isMobile() ? 130 : 170);

        return (
            <>
                <DialogContainer
                    addClass="weapon-suggester-list-modal"
                    width={500}
                    height={UI.Layout.windowHeight() - 50}
                    isVisible={this.state.isVisible}
                    title={lang.get('weapon_suggest.weapon_list')}
                    closeCallback={() => this.handleClose()}
                >
                    <FullHeight>
                        <FullHeightScrollable maxHeight={maxHeight}>
                            {this.weaponList()}
                        </FullHeightScrollable>
                        <FullHeightStatic>
                            <ControlsBar>
                                <TitledButton
                                    icon="icon-delete"
                                    title={lang.get('modal_buttons.reset')}
                                    onClick={() => this.handleReset()}
                                />
                                <ControlsBarDivider />
                                <TitledButton
                                    icon="icon-ok"
                                    title={lang.get('art_gen.apply')}
                                    onClick={() => this.handleSave()}
                                />
                                <TitledButton
                                    icon="icon-cancel"
                                    title={lang.get('modal_buttons.cancel')}
                                    onClick={() => this.handleClose()}
                                />
                            </ControlsBar>
                        </FullHeightStatic>
                    </FullHeight>
                </DialogContainer>
                <WeaponSuggestConditionModal
                    ref={obj => this.settingsModal = obj}
                />
            </>
        );
    }

    weaponList() {
        let items = [];

        let weapons = DB.Weapons.get(this.state.weaponType);
        if (!weapons) {
            return items;
        }

        let weaponsSorted = [];
        for (let weaponName of weapons.getKeys(this.state.showBeta)) {
            let weapon = weapons.get(weaponName);

            weaponsSorted.push({
                name: weaponName,
                weapon: weapon,
                title: lang.get(weapon.getName()),
                rarity: weapon.getRarity(),
            });
        }

        weaponsSorted = weaponsSorted.sort((a, b) => {return b.rarity - a.rarity || a.title.localeCompare(b.title);});

        for (let item of weaponsSorted) {
            let key = item.name;
            items.push(
                <WeaponListItem
                    key={key}
                    settings={this.state.settings[item.name]}
                    onShowChange={(id, checked) => this.handleShowChange(item.name, id, checked)}
                    onRefineChange={(id, refine, checked) => this.handleRefineChange(item.name, id, refine, checked)}
                    onSettingsOpen={(id) => this.handleSettingsOpen(item.name, id)}
                    onAddLine={() => this.handleAddCustomLine(item.name)}
                    onRemoveLine={(id) => this.handleRemoveCustomLine(item.name, id)}
                    onNameChange={(id, value) => this.handleItemNameChange(item.name, id, value)}
                    {...item}
                />
            );
        }

        return items;
    }
}

function WeaponListItem(props) {
    return (
        <div className="weapon-suggester-list-item">
            <div className="icon">
                <WeaponIcon weapon={props.weapon} size={40} />
            </div>
            <div className="items">
                <div className="title-line">
                    <div className="title">{props.title}</div>
                    <RoundButton
                        icon="icon-add"
                        tooltip={lang.get('weapon_suggest.custom')}
                        onClick={() => props.onAddLine()}
                    />
                </div>
                <WeaponListItemSettings {...props} />
            </div>
        </div>
    );
}

function WeaponListItemSettings(props) {
    let localSettings = props.settings || {};
    let weaponSettings = getWeaponSuggestItems(props.weapon);
    let editableConditions = getWeaponEditableConditions(props.weapon);
    let items = [];
    let canConfigure = editableConditions.some((item) => {
        return item.isSerializable && item.isSerializable();
    });
    let settingIds = weaponSettings.map((i) => {return i.name;});

    for (const id of Object.keys(localSettings)) {
        if (!settingIds.includes(id)) {
            settingIds.push(id);
        }
    }

    for (let id of settingIds) {
        let idSettings = localSettings[id] || {refine: {}, settings: {}, customName: '', isCustom: false};
        let suggestItem = weaponSettings.find((item) => {return item.name == id;}) || {name: id, settings: {}};
        let isCustomized = !idSettings.isCustom && isWeaponScenarioCustomized(props.weapon, suggestItem, idSettings.settings);
        let refine = [];

        for (let r = 1; r <= 5; ++r) {
            refine.push(
                <div key={'refine' + r} className="refine">
                    <ToggleRoundButton
                        text={r}
                        addClass="small-number"
                        checked={idSettings.refine[r]}
                        onChange={(checked) => props.onRefineChange(id, r, checked)}
                    />
                </div>
            );
        }

        items.push(
            <div key={props.name + id} className="setting">
                <div className="name">
                    {idSettings.isCustom ?
                        <TextInput
                            value={idSettings.customName || ''}
                            addClass="custom-name"
                            placeholder={lang.get('weapon_suggest.title')}
                            onChange={(value) => props.onNameChange(id, value)}
                        />
                        :
                        (id ? lang.get('weapon_settings.'+ id) + (isCustomized ? '*' : '') : '')
                    }
                </div>
                <div className="show">
                    <Checkbox
                        checked={idSettings.show}
                        onChange={(checked) => props.onShowChange(id, checked)}
                    />
                </div>
                {canConfigure || idSettings.isCustom ?
                    <div className="actions">
                        <RoundButton
                            icon="icon-settings"
                            tooltip={lang.get('artifacts_ui.settings')}
                            onClick={() => props.onSettingsOpen(id)}
                        />
                        {idSettings.isCustom ?
                            <MiniButton
                                icon="delete"
                                tooltip={lang.get('modal_buttons.reset')}
                                onClick={() => props.onRemoveLine(id)}
                            />
                        : ''}
                    </div>
                : ''}
                {refine}
            </div>
        );
    }

    return items;
}

class WeaponSuggestConditionModal extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isVisible: false,
            conditions: [],
            settings: {},
            contextSettings: {},
            title: '',
        };
    }

    show(data, saveCallback) {
        this.saveCallback = saveCallback;

        this.setState({
            isVisible: true,
            conditions: data.conditions || [],
            settings: cloneWeaponSuggestData(data.settings),
            contextSettings: cloneWeaponSuggestData(data.contextSettings),
            title: data.title || lang.get('artifacts_ui.settings'),
        });
    }

    handleSettingChange(name, value) {
        let settings = this.state.settings;
        settings[name] = value;
        this.setState({settings: settings});
    }

    handleSave() {
        if (this.saveCallback) {
            this.saveCallback(cloneWeaponSuggestData(this.state.settings));
        }

        this.handleClose();
    }

    handleClose() {
        this.setState({isVisible: false});
    }

    render() {
        let settings = Object.assign({}, this.state.contextSettings, this.state.settings);

        return (
            <DialogContainer
                addClass="artifact-settings-modal weapon-suggest-condition-modal"
                width={500}
                isVisible={this.state.isVisible}
                title={this.state.title}
                closeCallback={() => this.handleClose()}
            >
                <ConditionList
                    items={this.state.conditions}
                    settings={settings}
                    onChange={(name, value) => this.handleSettingChange(name, value)}
                    ignoreSubconditions={true}
                />
                <ControlsBar>
                    <ControlsBarDivider />
                    <TitledButton
                        icon="icon-ok"
                        title={lang.get('art_gen.apply')}
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

function makeCustomRowId(settings) {
    let index = 1;
    let id = 'custom_' + index;

    while (settings[id] !== undefined) {
        ++index;
        id = 'custom_' + index;
    }

    return id;
}
