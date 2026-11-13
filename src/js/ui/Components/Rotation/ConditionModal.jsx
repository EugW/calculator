import React from "react";

import { ControlsBar, ControlsBarDivider } from "../ControlsBar";
import { DialogContainer } from "../Dialog/Container";
import { Dropdown } from "../Inputs/Dropdown";
import { Lang } from "../../Lang";
import { TitledButton } from "../Inputs/Buttons";
import { Rotation } from "../../../classes/Rotation";
import { ConditionList } from "../ConditionList";
import { deliveredControlNames } from "../../../classes/Team/ConditionValues";
import { Condition } from "../../../classes/Condition";
import { sourceName } from "../SourceName";

let lang = new Lang();

// Objects of a member whose conditions a step can change.
const memberSections = ['char', 'weapon', 'artifacts'];

/**
 * Dropdown key of a step: a member's step also names the member and the
 * object, since its item ID alone (such as a weapon ID) is not unique.
 */
function stepKey(data) {
    if (data.subtype == 'member') {
        return ['member', data.charId, data.object, data.itemId, data.conditionId].join(':');
    }
    return [data.subtype, data.itemId, data.conditionId].join(':');
}

/**
 * ID of the object a member's condition belongs to, as a step stores it.
 */
function objectId(member, section, cond) {
    if (section == 'artifacts') {
        return Rotation.getArtSetByCondition(cond.getId()) || 0;
    }

    let part = section == 'char' ? member.getChar() : member.getWeapon();
    return part && part.object ? part.object.getId() : 0;
}

/**
 * Conditions a step can change.
 */
function steppable(conditions, settings) {
    return Condition.unwrap(conditions).filter((cond) => {
        let type = cond.getType();
        if (!type || type == 'static' || cond.isHidden(settings)) {
            return false;
        }

        return !cond.params.hideInactive || cond.checkSubconditions(settings);
    });
}

function stepText(cond) {
    let rotationNumber = cond.params.rotationNumber;
    return cond.getTitle() + (rotationNumber ? ' ('+ rotationNumber +')' : '');
}

/**
 * State fields of a step's data.
 */
function stepFields(data) {
    return {
        subtype: data.subtype,
        itemId: data.itemId,
        conditionId: data.conditionId,
        charId: data.charId || 0,
        object: data.object || '',
    };
}

/**
 * A step of the team's rotation: on a member's character, weapon or
 * artifacts, on the team's enemy or on the team's toggles. Its owner is
 * picked first (every member, the viewed member first, then the enemy and
 * the team), then one of the owner's steps.
 */
export class RotationConditionModal extends React.PureComponent {
    constructor(props) {
        super(props);

        this.groups = [];

        this.state = {
            isVisible: false,
            showDropdown: true,
            group: '',
            selected: '',
            conditions: [],
            value: '',
            subtype: '',
            itemId: 0,
            conditionId: 0,
            charId: 0,
            receiverId: 0,
            object: '',
        };
    }

    show(data, saveCallback) {
        data = Object.assign({}, data);

        this.groups = this.buildGroups();
        this.saveCallback = saveCallback;

        // The edited step, otherwise the viewed member's first step.
        let group, item;
        if (data.conditionId) {
            let key = stepKey(data);
            group = this.groups.find((group) => group.items.some((item) => item.value == key));
            item = group && group.items.find((item) => item.value == key);
        } else {
            group = this.groupOf('member:' + this.props.build.char.getId()) || this.groups[0];
            item = group && firstStep(group.items);
        }

        let conditions = item ? [item.cond] : [];
        let showDropdown = true;
        if (!item && data.conditionId) {
            let condData = Rotation.getConditionData(data);
            if (condData && condData.cond) {
                showDropdown = false;
                conditions = [condData.cond];
            }
        }

        let value = data.value || '';
        if (conditions.length) {
            let cond = conditions[0];
            let type = cond.getType();

            if (type == 'dropdown' || type == 'dropdown_multiple') {
                value = cond.getValueById(data.value);
            } else {
                value ||= 0;
            }
        }

        let newState = {
            isVisible: true,
            showDropdown: showDropdown,
            group: group ? group.value : '',
            selected: item ? item.value : '',
            conditions: conditions,
            receiverId: data.receiverId || 0,
            value: value,
        };

        if (data.conditionId || item) {
            Object.assign(newState, stepFields(data.conditionId ? data : item.data));
        }

        this.setState(newState);
    }

    /**
     * @param {string} value
     * @returns {Object|undefined} the owner's dropdown item, with its steps
     */
    groupOf(value) {
        return this.groups.find((group) => group.value == value);
    }

    handleSave() {
        if (this.saveCallback) {
            let item = {
                type: 'condition',
                subtype: this.state.subtype,
                itemId: this.state.itemId,
                conditionId: this.state.conditionId,
                value: this.state.value,
            };
            if (item.subtype == 'member') {
                item.charId = this.state.charId;
                item.object = this.state.object;
                if (this.state.receiverId) item.receiverId = this.state.receiverId;
            }

            let itemData = Rotation.getConditionData(item);
            let type = itemData.cond.getType();
            if (type == 'dropdown' || type == 'dropdown_multiple') {
                let settings = {};
                settings[itemData.cond.getName()] = item.value;
                item.value = itemData.cond.getSelectedId(settings);
            }

            this.saveCallback(item);
        }

        this.setState({isVisible: false});
    }

    handleClose() {
        this.setState({isVisible: false});
    }

    handleGroup(group) {
        this.setState({group: group.value});
        this.handleCondition(firstStep(group.items));
    }

    handleCondition(item) {
        this.setState(Object.assign({
            selected: item.value,
            receiverId: 0,
            conditions: [item.cond],
        }, stepFields(item.data)));
    }

    handleSettingChange(name, value) {
        let cond = this.state.conditions[0];
        if (cond && name != cond.getName()) {
            return;
        }

        this.setState({value: value});
    }

    render() {
        // A member's step shows the condition with that member's settings.
        let member = this.state.subtype == 'member';
        let localSettings = Object.assign({}, member && this.memberSettings[this.state.charId] || this.settings);
        const team = this.props.build.team;
        // The step's owner: a member, or an entry of the team's legacy source.
        const source = team.getSources().find((item) => item.getSourceId() === this.state.charId);
        const receiver = team.getMembers().find((item) => item.char.getId() === this.state.receiverId);
        if (source && receiver) {
            const evaluation = team.evaluate();
            localSettings = evaluation.sourceView(source, evaluation.member(receiver).settings());
        }
        const name = this.state.conditions[0]?.getName();
        const hasReceiver = member && (this.state.receiverId || (source && deliveredControlNames(source).has(name)));
        const recipients = [{value: 0, text: lang.get('rotation_view.condition_source')}].concat(team.getMembers().map((item) => ({
            value: item.char.getId(), text: lang.get(item.char.object.getName()),
        })));
        if (this.state.receiverId && !receiver) {
            const char = DB.Chars.getById(this.state.receiverId);
            if (char) recipients.push({value: char.getId(), text: lang.get(char.getName())});
        }
        for (let cond of this.state.conditions) {
            localSettings[cond.getName()] = this.state.value;
        }

        let charId = member ? this.state.charId : 0;
        let group = this.groupOf(this.state.group);

        return (
            <DialogContainer
                addClass="rotation-feature-modal"
                width={500}
                isVisible={this.state.isVisible}
                title={lang.get('modal_window.rotation_condition')}
                closeCallback={() => this.handleClose()}
            >
                {this.state.showDropdown && group ? <ControlsBar>
                    <Dropdown
                        barClass="rotation-member"
                        items={this.groups}
                        selected={group.value}
                        onChange={(item) => this.handleGroup(item)}
                    />
                    <Dropdown
                        barClass="resizable"
                        items={group.items}
                        selected={this.state.selected}
                        onChange={(item) => this.handleCondition(item)}
                    />
                </ControlsBar> : ''}
                {hasReceiver ? <ControlsBar>
                    <div>{lang.get('rotation_view.condition_receiver')}</div>
                    <Dropdown
                        barClass="resizable"
                        items={recipients}
                        selected={this.state.receiverId}
                        onChange={(item) => this.setState({receiverId: item.value})}
                    />
                </ControlsBar> : null}
                <ConditionList
                    items={this.state.conditions}
                    charId={charId}
                    settings={localSettings}
                    ignoreSubconditions={true}
                    onChange={(name, value) => this.handleSettingChange(name, value)}
                />
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

    /**
     * Owners of steps, each with its steps: every member of the team (the
     * viewed member first), the team's enemy and the team's toggles. Every
     * owner's settings come from one evaluation of the team.
     */
    buildGroups() {
        let build = this.props.build;
        let team = build.team;
        let view = team.view();
        let result = [];

        this.settings = view.member(build).getStats().settings;
        this.memberSettings = {};

        let members = [build].concat(team.getMembers().filter((other) => other !== build));
        for (const member of members) {
            let settings = member === build ? this.settings : view.member(member).getStats().settings;
            result = result.concat(this.memberGroup(member, settings));
        }

        // The entries of the team's legacy source that take effect.
        let entries = team.getSources().filter((source) => source.isLegacy);
        let evaluation = entries.length ? view.evaluation() : null;
        for (const entry of entries) {
            result = result.concat(this.legacyGroup(entry, evaluation.resolveFull(entry).settings));
        }

        // The team's enemy.
        let enemyItems = [];
        for (const cond of steppable(team.enemy.getConditions(), this.settings)) {
            let data = {
                subtype: 'enemy',
                itemId: team.enemy.object ? team.enemy.object.getId() : 0,
                conditionId: cond.getId(),
            };
            enemyItems.push(listItem(data, cond, []));
        }
        result = result.concat(ownerGroup('enemy', lang.get('rotation_view.section_enemy'), [], enemyItems));

        // The team's toggles: the party's conditions that are steps.
        let partyConditions = DB.Buffs.getList().filter((item) => item.isParty()).flatMap((item) => item.getConditions());
        let partyItems = [];
        for (const cond of steppable(partyConditions, this.settings)) {
            if (!cond.getBuffRotationSection()) continue;

            let icon = cond.getIcon();
            let data = {
                subtype: 'buffs',
                itemId: 0,
                conditionId: cond.getId(),
            };
            partyItems.push(listItem(data, cond, icon ? [' sprite sprite-24 '+ icon] : []));
        }
        result = result.concat(ownerGroup('party', lang.get('rotation_view.section_team'), [], partyItems));

        return result;
    }

    /**
     * Conditions of a member's character, weapon and artifacts, each object
     * under its caption.
     *
     * @param {CalcSet} member
     * @param {BuildSettings} settings the member's settings as its team resolves them
     */
    memberGroup(member, settings) {
        let char = member.char.get();
        if (!char) {
            return [];
        }

        let charId = char.getId();
        this.memberSettings[charId] = settings;

        let items = [];
        for (const object of memberSections) {
            let objectItems = [];
            for (const cond of steppable(member.getConditions({objects: [object]}), settings)) {
                let data = {
                    subtype: 'member',
                    charId: charId,
                    object: object,
                    itemId: objectId(member, object, cond),
                    conditionId: cond.getId(),
                };
                objectItems.push(Object.assign(listItem(data, cond, []), {isSubitem: 1}));
            }
            if (objectItems.length) {
                items.push({isCaption: true, value: object, text: lang.get('rotation_view.section_'+ object)});
                items = items.concat(objectItems);
            }
        }

        return ownerGroup('member:'+ charId, lang.get(char.getName()), [' sprite sprite-24 '+ char.getIcon()], items);
    }

    /**
     * The controls of an entry of the legacy source (a virtual character, a
     * floating weapon or set) that its effects for the team use. A step
     * names the entry as it names a member: by its source ID.
     *
     * @param {LegacyEntry} entry
     * @param {Object} settings its resolved settings
     */
    legacyGroup(entry, settings) {
        let sourceId = entry.getSourceId();
        this.memberSettings[sourceId] = settings;

        let names = deliveredControlNames(entry);
        let items = [];
        for (const object of memberSections) {
            if (!entry[object]) continue;

            for (const cond of steppable(entry.getConditions({objects: [object]}), settings)) {
                if (!names.has(cond.getName())) continue;

                let data = {
                    subtype: 'member',
                    charId: sourceId,
                    object: object,
                    itemId: object == 'artifacts' ? Rotation.getArtSetByCondition(cond.getId()) || 0 : entry[object].getId(),
                    conditionId: cond.getId(),
                };
                items.push(listItem(data, cond, []));
            }
        }

        let icons = entry.char ? [' sprite sprite-24 '+ entry.char.get().getIcon()] : [];
        return ownerGroup('member:'+ sourceId, sourceName(entry), icons, items);
    }
}

function listItem(data, cond, textIcons) {
    return {
        value: stepKey(data),
        text: stepText(cond),
        textIcons: textIcons,
        cond: cond,
        data: data,
    };
}

/**
 * An owner's dropdown item, with its steps, when it has any.
 */
function ownerGroup(value, text, textIcons, items) {
    if (!firstStep(items)) {
        return [];
    }

    return [{value: value, text: text, textIcons: textIcons, items: items}];
}

/**
 * @param {Array} items an owner's dropdown items
 * @returns {Object|undefined} its first step
 */
function firstStep(items) {
    return items.find((item) => !item.isCaption);
}
