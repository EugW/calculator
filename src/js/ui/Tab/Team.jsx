import React from 'react';

import "../../../css/Components/Tab/Team.css"

import { CalcSet } from '../../classes/CalcSet';
import { Serializer } from '../../classes/Serializer';
import { isTeamFormat, TEAM_SIZE, Team } from '../../classes/Team';
import { Accordion, AccordionItem } from '../Components/Accordion';
import { FullHeight, FullHeightScrollable, FullHeightStatic } from '../Components/FullHeight';
import { ArtifactSetIcon, CharIcon, WeaponIcon } from '../Components/Icons';
import { TitledButton } from '../Components/Inputs/Buttons';
import { Dropdown } from '../Components/Inputs/Dropdown';
import { Radio, TextInputWithButton } from '../Components/Inputs/Input';
import { sourceName } from '../Components/SourceName';
import { ReactTab } from '../Components/Tab';
import { Lang } from '../Lang';
import { Tab } from "../Tab";
import { TeamEnemy, TeamEnemyTitle } from './Team/Enemy';
import { TeamParty, TeamPartyTitle } from './Team/Party';
import { stackKeyTitle } from './Team/StackTitle';

export class TeamTab extends Tab {
    constructor(params) {
        super(params);

        this.id = 'team';
        this.rightRab = true;
        // Left of the two panels when the window is wide enough.
        this.sideTab = true;
        this.title = 'tab_header.team';
    }

    refresh() {
        if (!this.component) {
            return;
        }

        this.component.setState({version: (this.component.state.version || 0) + 1});
    }

    createContent() {
        return (
            <TeamView
                ref={element => { this.component = element; }}
                app={this.app}
                title={this.title}
            />
        );
    }
}

/**
 * The team: four slots, the viewed member, the on-field member, the enemy,
 * the party setup and the source of each effect that does not stack. Selecting a slot views it (an
 * empty one asks for a character first, see handleSlot). Above the slots:
 * the saved builds and Enka, each a list whose builds are loaded into any
 * slot (LoadToSlot); a link, loaded into the slot chosen beside it; the
 * removal of the selected member; a new team (App.resetTeam).
 */
export class TeamView extends React.Component {
    constructor(props) {
        super(props);
        this.lang = new Lang();
        this.state = {version: 0, linkText: '', linkError: false, linkSlot: null};
    }

    /** The selected slot: the viewed member's. */
    selectedSlot() {
        return this.props.app.getViewedSlot();
    }

    /**
     * Select a slot: view its member. An empty slot asks for a character
     * and gets a new build of it, which is viewed.
     *
     * @param {number} slot
     */
    handleSlot(slot) {
        let app = this.props.app;
        let team = app.getTeam();
        if (team.getMember(slot)) {
            app.viewMember(slot);
            return;
        }

        UI.CharSelectReact.show({
            // A character is in one team slot only.
            excludeIds: team.getMembers().map((member) => member.char.getId()),
            callback: (char) => {
                if (char) app.newMember(slot, char);
            },
        });
    }

    /**
     * The slot a character link is loaded into: the one chosen for it, or
     * the first empty slot, or the viewed member's when the team is full.
     *
     * @returns {number}
     */
    linkSlot() {
        if (this.state.linkSlot !== null) {
            return this.state.linkSlot;
        }

        let empty = this.props.app.getTeam().getSlots().findIndex((member) => !member);
        return empty >= 0 ? empty : this.selectedSlot();
    }

    handleSavedBuild() {
        UI.SavedBuild.show();
    }

    handleEnka() {
        UI.EnkaImport.show();
    }

    handleRemove() {
        this.props.app.removeMember(this.selectedSlot());
    }

    handleReset() {
        UI.ConfirmWindow.show('modal.confirm', 'team.reset_confirm', () => {
            this.props.app.resetTeam();
            this.setState({linkText: '', linkError: false, linkSlot: null});
        });
    }

    /**
     * A character link fills the slot chosen for it (linkSlot); a team link
     * replaces the team. The choice of a slot is for one link: the next one
     * goes to the next empty slot.
     *
     * @param {string} text a link or a hash
     */
    handleLink(text) {
        let hash = (text || '').trim();
        if (hash.includes('#')) {
            hash = hash.substring(hash.indexOf('#') + 1);
        }

        let input = hash ? Serializer.unpack(hash) : null;
        let loaded = false;
        if (input && input.length) {
            if (isTeamFormat(input[0])) {
                let team = Team.deserialize(input);
                if (team && team.getMembers().length) {
                    this.props.app.setTeam(team);
                    loaded = true;
                }
            } else {
                let build = CalcSet.deserialize(input);
                if (build) {
                    this.props.app.fillSlot(this.linkSlot(), build);
                    loaded = true;
                }
            }
        }

        this.setState(loaded ? {linkText: '', linkError: false, linkSlot: null} : {linkText: text, linkError: true});
    }

    render() {
        return (
            <ReactTab title={this.lang.get(this.props.title)}>
                <FullHeight>
                    <FullHeightStatic>
                        {this.renderButtons()}
                    </FullHeightStatic>
                    <FullHeightScrollable>
                        {this.renderSlots()}
                        {this.renderEnemy()}
                        {this.renderParty()}
                        {this.renderStacks()}
                    </FullHeightScrollable>
                </FullHeight>
            </ReactTab>
        );
    }

    renderButtons() {
        let lang = this.lang;
        let team = this.props.app.getTeam();
        let canRemove = team.getMembers().length > 1;
        let linkSlot = this.linkSlot();
        let slotItems = team.getSlots().map((member, slot) => ({
            value: slot,
            text: (slot + 1) + ': ' + lang.get(member ? member.char.object.getName() : 'team.slot_empty'),
        }));

        return (
            <div className="team-buttons">
                <div className="team-buttons-row">
                    <TitledButton icon="icon-replace" title={lang.get('team.saved_build')} onClick={() => this.handleSavedBuild()} />
                    <TitledButton icon="team-icon-enka" title={lang.get('team.enka')} onClick={() => this.handleEnka()} />
                    <div className="flex-spacer" />
                    <TitledButton icon="icon-delete" tooltip={lang.get('team.remove')} disabled={!canRemove} onClick={() => this.handleRemove()} />
                    <TitledButton icon="icon-cancel" tooltip={lang.get('team.reset')} onClick={() => this.handleReset()} />
                </div>
                <div className="team-link">
                    <div className="team-link-row">
                        <Dropdown
                            addClass="team-link-slot"
                            items={slotItems}
                            selected={linkSlot}
                            selectedText={lang.get('team.slot') + ' ' + (linkSlot + 1)}
                            onChange={(item) => this.setState({linkSlot: item.value})}
                        />
                        <TextInputWithButton
                            value={this.state.linkText}
                            placeholder={lang.get('team.link_placeholder')}
                            text={lang.get('team.link_load')}
                            onChange={(text) => this.setState({linkText: text, linkError: false})}
                            onClick={() => this.handleLink(this.state.linkText)}
                        />
                    </div>
                    {this.state.linkError ? <div className="team-link-error">{lang.get('team.link_invalid')}</div> : null}
                </div>
            </div>
        );
    }

    renderSlots() {
        let app = this.props.app;
        let team = app.getTeam();
        let onField = team.getOnFieldMember();
        let items = [];

        for (let slot = 0; slot < TEAM_SIZE; ++slot) {
            let member = team.getMember(slot);
            items.push(
                <TeamSlot
                    key={'slot' + slot}
                    lang={this.lang}
                    member={member}
                    viewed={slot == app.getViewedSlot()}
                    onField={!!member && member === onField}
                    onSelect={() => this.handleSlot(slot)}
                    onSetOnField={() => app.setOnFieldMember(slot)}
                />
            );
        }

        return <div className="team-slots">{items}</div>;
    }

    /** The team's enemy, collapsed by default; see TeamEnemy. */
    renderEnemy() {
        return (
            <div className="team-section team-enemy">
                <Accordion defaultOpenedId="">
                    <AccordionItem id="enemy" lazy={true} title={<TeamEnemyTitle team={this.props.app.getTeam()} lang={this.lang} />}>
                        <TeamEnemy app={this.props.app} lang={this.lang} />
                    </AccordionItem>
                </Accordion>
            </div>
        );
    }

    /** Resonances and team toggles, collapsed by default; see TeamParty. */
    renderParty() {
        return (
            <div className="team-section team-party">
                <Accordion defaultOpenedId="">
                    <AccordionItem id="party" lazy={true} title={<TeamPartyTitle app={this.props.app} lang={this.lang} />}>
                        <TeamParty app={this.props.app} />
                    </AccordionItem>
                </Accordion>
            </div>
        );
    }

    renderStacks() {
        let team = this.props.app.getTeam();
        let rows = this.props.app.teamView().stackGroups();
        if (!rows.length) {
            return null;
        }

        let lang = this.lang;
        return (
            <div className="team-stacks">
                <div className="team-stacks-title">{lang.get('team.stack_title')}</div>
                <div className="team-stacks-descr">{lang.get('team.stack_descr')}</div>
                {rows.map((row) => {
                    // A source is a member or an entry of the legacy source.
                    let items = [{value: 0, text: lang.get('team.stack_none')}].concat(row.sources.map((source) => {
                        return {value: source.getSourceId(), text: sourceName(source)};
                    }));
                    let receiver = row.receiverId ? team.getMembers().find((member) => member.char.getId() == row.receiverId) : null;
                    let title = stackKeyTitle(team, row.key);
                    if (receiver) {
                        title += ' → ' + lang.get(receiver.char.object.getName());
                    }

                    return (
                        <div className="team-stacks-row" key={row.claim}>
                            <div className="team-stacks-name">{title}</div>
                            <Dropdown
                                items={items}
                                selected={row.source ? row.source.getSourceId() : 0}
                                onChange={(item) => {
                                    this.props.app.setStackSource(row.key, item.value, receiver ? team.slotOf(receiver) : null);
                                }}
                            />
                        </div>
                    );
                })}
            </div>
        );
    }
}

function TeamSlot(props) {
    let lang = props.lang;
    let member = props.member;

    if (!member) {
        return (
            <div className="team-slot empty" onClick={props.onSelect}>
                <div className="team-slot-main">
                    <CharIcon size={60} resetIcon={true} />
                    <div className="team-slot-info">
                        <div className="team-slot-name">{lang.get('team.empty')}</div>
                    </div>
                </div>
            </div>
        );
    }

    let char = member.char.object;
    let settings = member.getSettings();
    let weapon = member.weapon && member.weapon.object;

    return (
        <div className={'team-slot' + (props.viewed ? ' viewed' : '')} onClick={props.onSelect}>
            <div className="team-slot-main">
                <CharIcon size={60} char={char} addClass="item" />
                <div className="team-slot-info">
                    <div className="team-slot-name">{lang.get(char.getName())}</div>
                    <div className="team-slot-levels">
                        {lang.get('team.level') + ' ' + settings.char_level + ' · C' + settings.char_constellation}
                    </div>
                    <TeamSlotGear
                        lang={lang}
                        weapon={weapon}
                        refine={settings.weapon_refine}
                        sets={member.artifacts.bonusSets()}
                    />
                </div>
                {/* Choosing the on-field member does not select the slot. */}
                <div className="team-slot-state" onClick={(event) => event.stopPropagation()}>
                    <Radio
                        value={true}
                        title={lang.get('team.on_field')}
                        selected={props.onField}
                        onChange={props.onSetOnField}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * The weapon, with its refinement, and the artifact sets in effect: one icon
 * for a four-piece set, two for 2+2.
 */
function TeamSlotGear(props) {
    let lang = props.lang;
    let weapon = props.weapon;

    return (
        <div className="team-slot-gear">
            {weapon ? (
                <div className="team-slot-gear-item" data-tooltip={lang.get(weapon.getName()) + ' · R' + props.refine}>
                    <WeaponIcon size={40} weapon={weapon} />
                    <span className="team-slot-refine">{'R' + props.refine}</span>
                </div>
            ) : null}
            {props.sets.map(({set}) => (
                <div className="team-slot-gear-item" key={set} data-tooltip={lang.get(DB.Artifacts.Sets.get(set).getName())}>
                    <ArtifactSetIcon size={40} set={set} />
                </div>
            ))}
        </div>
    );
}


