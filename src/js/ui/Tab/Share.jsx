import React from 'react';
import "../../../css/Components/Tab/Share.css"

import { Serializer } from '../../classes/Serializer';
import { CharacterList } from '../Components/Character/List';
import { LoadToSlot, loadFullButton } from '../Components/Character/LoadToSlot';
import { ControlsBar, ControlsBarDivider } from '../Components/ControlsBar';
import { FullHeight, FullHeightScrollable, FullHeightStatic } from '../Components/FullHeight';
import { CharIcon } from '../Components/Icons';
import { TitledButton } from '../Components/Inputs/Buttons';
import { TextInputWithButton, TextInputWithCopy } from '../Components/Inputs/Input';
import { ReactTab, TabModes } from '../Components/Tab';

import { Lang } from '../Lang';
import { SearchInput } from '../Modal/Select';
import { Tab } from "../Tab";

let lang = new Lang();

export class ShareTab extends Tab {
    constructor(params) {
        super(params);

        this.id = 'share';
        this.rightRab = false;
        this.title = 'tab_header.share_view';
    }

    refresh() {
        if (!this.component) {
            return;
        }

        this.component.setState({
            needRefreshBuilds: true,
            needRefreshTeams: true,
        });
    }

    createContent() {
        return (
            <ShareView
                ref={element => { this.component = element; }}
                app={this.app}
                title={this.title}
            />
        );
    }
}

/**
 * Saved characters and saved teams, one mode each, with the links of the
 * viewed character and of the team.
 */
export class ShareView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            mode: 'characters',
            needRefreshBuilds: true,
            needRefreshTeams: true,
            filterString: '',
            teamFilterString: '',
            saveString: '',
            teamSaveString: '',
        };
        this.needFiltering = true;
        this.storage = this.props.app.storage.char;
        this.teamStorage = this.props.app.storage.team;
        this.teams = [];
    }

    reloadItems() {
        if (!this.state.needRefreshBuilds) {
            return;
        }

        this.state.needRefreshBuilds = false;
        this.needFiltering = true;
        this.items = [];

        let prefix = Math.random();
        let showBeta = this.props.app.showBetaContent();

        for (let item of this.storage.listDecoded(showBeta)) {
            let title = item.title || lang.get(item.data.getChar().object.getName());

            this.items.push({
                key: item.index +' '+ prefix,
                callbackData: {index: item.index},
                title: title,
                sortTitle: title.toLocaleUpperCase(),
                set: item.data,
            });
        }

        this.items = this.items.sort((a, b) => {
            return a.sortTitle.localeCompare(b.sortTitle);
        });
    }

    reloadTeams() {
        if (!this.state.needRefreshTeams) {
            return;
        }

        this.state.needRefreshTeams = false;
        this.teams = this.teamStorage.listDecoded(this.props.app.showBetaContent()).map((item) => {
            let members = item.data.getMembers();
            let title = item.title || members.map((member) => lang.get(member.char.object.getName())).join(' / ');
            return {
                index: item.index,
                team: item.data,
                title: title,
                sortTitle: title.toLocaleUpperCase(),
            };
        });
    }

    filterItems() {
        if (!this.needFiltering) {
            return;
        }

        let filterString = this.state.filterString.toUpperCase();

        for (let item of this.items) {
            item.hidden = filterString && !item.sortTitle.includes(filterString);
        }
    }

    /**
     * @param {boolean} [team] the whole team instead of the viewed character
     * @returns {string}
     */
    dataBuildLink(team) {
        let hash = team
            ? Serializer.pack(this.props.app.getTeam())
            : Serializer.pack(this.props.app.currentSet().characterBuild());
        let url = window.location.toString();
        url = url.replace(/#.*$/, '');
        url += '#'+ hash;

        return url;
    }

    handleFilterString(value) {
        this.needFiltering = true;
        this.setState({filterString: value});
    }

    handleSaveNameChange(value) {
        this.setState({saveString: value});
    }

    handleSaveBuild() {
        this.storage.add(this.props.app.buildToSave(), {
            title: this.state.saveString,
        });

        this.props.app.refresh({objects: ['storage.characters']});
    }

    handleRenameBuild(build, data) {
        let index = data.index;
        let item = this.storage.get(index);

        UI.PromptWindow.show('modal.edit_char_name', item.title, (text) => {
            this.storage.setTitle(index, text);
            this.props.app.refresh({objects: ['storage.characters']});
        });
    }

    handleOverwriteBuild(build, data) {
        UI.ConfirmWindow.show('modal.confirm', 'share_view.confirm_overwrite', () => {
            this.storage.replace(data.index, this.props.app.buildToSave());
            this.props.app.refresh({objects: ['storage.characters']});
        });
    }

    handleDeleteBuild(build, data) {
        UI.ConfirmWindow.show('modal.confirm', 'share_view.confirm_delete', () => {
            this.storage.remove(data.index);
            this.props.app.refresh({objects: ['storage.characters']});
        });
    }

    handleShowEnka() {
        UI.EnkaImport.show();
    }

    handleSaveTeam() {
        this.teamStorage.add(this.props.app.getTeam(), {
            title: this.state.teamSaveString.trim(),
        });
        this.props.app.refresh({objects: ['storage.teams']});
        this.setState({teamSaveString: ''});
    }

    handleLoadTeam(index) {
        UI.ConfirmWindow.show('modal.confirm', 'team.confirm_load', () => {
            const team = this.teamStorage.getItem(index);
            if (team) this.props.app.setTeam(team);
        });
    }

    handleRenameTeam(index) {
        const item = this.teamStorage.get(index);
        UI.PromptWindow.show('team.edit_name', item.title || '', (title) => {
            this.teamStorage.setTitle(index, title.trim());
            this.props.app.refresh({objects: ['storage.teams']});
        });
    }

    handleOverwriteTeam(index) {
        UI.ConfirmWindow.show('modal.confirm', 'team.confirm_overwrite', () => {
            this.teamStorage.replace(index, this.props.app.getTeam());
            this.props.app.refresh({objects: ['storage.teams']});
        });
    }

    handleDeleteTeam(index) {
        UI.ConfirmWindow.show('modal.confirm', 'team.confirm_delete', () => {
            this.teamStorage.remove(index);
            this.props.app.refresh({objects: ['storage.teams']});
        });
    }

    render() {
        let modes = (
            <TabModes
                items={[
                    {value: 'characters', title: lang.get('share_view.mode_characters')},
                    {value: 'teams', title: lang.get('share_view.mode_teams')},
                ]}
                selected={this.state.mode}
                onChange={(mode) => this.setState({mode})}
            />
        );

        return (
            <ReactTab title={lang.get('tab_header.share_view')}>
                {this.state.mode == 'teams' ? this.renderTeams(modes) : this.renderCharacters(modes)}
            </ReactTab>
        );
    }

    renderCharacters(modes) {
        this.reloadItems();
        this.filterItems();

        return (
            <FullHeight>
                <FullHeightStatic>
                    {modes}
                    <ControlsBar>
                        <TextInputWithCopy
                            barClass="resizable"
                            value={this.dataBuildLink()}
                        />
                    </ControlsBar>
                    <ControlsBar>
                        <TextInputWithButton
                            barClass="resizable"
                            value={this.state.saveString}
                            placeholder={lang.get('share_view.save_placeholder')}
                            text={lang.get('share_view.save_local')}
                            onChange={(value) => this.handleSaveNameChange(value)}
                            onClick={() => this.handleSaveBuild()}
                        />
                    </ControlsBar>
                    <ControlsBar>
                        <div>{lang.get('share_view.stored_title')}</div>
                        <ControlsBarDivider />
                        <TitledButton
                            icon="icon-ok"
                            title={lang.get('share_view.showcase_import')}
                            onClick={() => this.handleShowEnka()}
                        />
                    </ControlsBar>
                    <ControlsBar>
                        <SearchInput
                            barClass="resizable"
                            value={this.state.filterString}
                            onChange={(value) => this.handleFilterString(value)}
                        />
                    </ControlsBar>
                </FullHeightStatic>
                <FullHeightScrollable noPadding={true}>
                    <CharacterList
                        items={this.items}
                        statDetails={true}
                        artifactDetails={true}
                        buttons={[loadFullButton(this.props.app)]}
                        sideControls={(set) => <LoadToSlot app={this.props.app} build={set} />}
                        moreButtons={[
                            {
                                icon: 'icon-ok',
                                title: UI.Lang.get('share_view.build_rename'),
                                callback: (set, data) => this.handleRenameBuild(set, data),
                            },
                            {
                                icon: 'icon-replace',
                                title: UI.Lang.get('share_view.build_overwrite'),
                                callback: (set, data) => this.handleOverwriteBuild(set, data),
                            },
                            {
                                icon: 'icon-delete',
                                title: UI.Lang.get('share_view.build_delete'),
                                callback: (set, data) => this.handleDeleteBuild(set, data),
                            },
                        ]}
                    />
                </FullHeightScrollable>
            </FullHeight>
        );
    }

    renderTeams(modes) {
        this.reloadTeams();
        let filterString = this.state.teamFilterString.toLocaleUpperCase();
        let teams = this.teams.filter((item) => !filterString || item.sortTitle.includes(filterString));

        return (
            <FullHeight>
                <FullHeightStatic>
                    {modes}
                    <ControlsBar>
                        <TextInputWithCopy
                            barClass="resizable"
                            value={this.dataBuildLink(true)}
                        />
                    </ControlsBar>
                    <ControlsBar>
                        <TextInputWithButton
                            barClass="resizable"
                            value={this.state.teamSaveString}
                            placeholder={lang.get('team.save_placeholder')}
                            text={lang.get('share_view.save_local')}
                            onChange={(value) => this.setState({teamSaveString: value})}
                            onClick={() => this.handleSaveTeam()}
                        />
                    </ControlsBar>
                    <ControlsBar>
                        <div>{lang.get('team.saved_teams')}</div>
                    </ControlsBar>
                    <ControlsBar>
                        <SearchInput
                            barClass="resizable"
                            value={this.state.teamFilterString}
                            onChange={(value) => this.setState({teamFilterString: value})}
                        />
                    </ControlsBar>
                </FullHeightStatic>
                <FullHeightScrollable noPadding={true}>
                    <div className="saved-teams">
                        {!this.teams.length ? <div className="saved-teams-empty">{lang.get('team.saved_empty')}</div> : null}
                        {teams.map((item) => (
                            <SavedTeam
                                key={item.index}
                                item={item}
                                onLoad={() => this.handleLoadTeam(item.index)}
                                onRename={() => this.handleRenameTeam(item.index)}
                                onOverwrite={() => this.handleOverwriteTeam(item.index)}
                                onDelete={() => this.handleDeleteTeam(item.index)}
                            />
                        ))}
                    </div>
                </FullHeightScrollable>
            </FullHeight>
        );
    }
}

function SavedTeam(props) {
    let item = props.item;

    return (
        <div className="saved-team">
            <div className="saved-team-name">{item.title}</div>
            <div className="saved-team-line">
                {item.team.getSlots().map((member, slot) => member
                    ? <CharIcon key={slot} char={member.char.object} size={60} />
                    : <div key={slot} className="saved-team-empty-slot" />)}
                <div className="flex-spacer" />
                <div
                    className="saved-team-load gi-share-load"
                    data-tooltip={lang.get('team.link_load')}
                    onClick={props.onLoad}
                />
            </div>
            <ControlsBar>
                <TitledButton icon="icon-ok" title={lang.get('share_view.build_rename')} onClick={props.onRename} />
                <TitledButton icon="icon-replace" title={lang.get('share_view.build_overwrite')} onClick={props.onOverwrite} />
                <TitledButton icon="icon-delete" title={lang.get('share_view.build_delete')} onClick={props.onDelete} />
            </ControlsBar>
        </div>
    );
}
