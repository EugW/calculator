import React from 'react';
import '../../../css/modal/ArtifactSetProfile.css';
import { patchProfile, resolveArtifactSetSettings, setProfileControls } from '../../classes/ArtifactSetProfile';
import { Artifact } from '../../classes/Artifact';
import { ConditionList } from '../Components/ConditionList';
import { ControlsBar, ControlsBarDivider } from '../Components/ControlsBar';
import { DialogContainer } from '../Components/Dialog/Container';
import { FullHeight, FullHeightScrollable, FullHeightStatic } from '../Components/FullHeight';
import { ArtifactSetIcon } from '../Components/Icons';
import { TitledButton } from '../Components/Inputs/Buttons';
import { Lang } from '../Lang';
import { SearchInput } from './Select';

const lang = new Lang();
const t = key => lang.get('artifact_profile.' + key);

/** The draft belongs to the member captured by show(), not the currently viewed member. */
export class ArtifactSetProfileModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {isVisible: false, profile: {}, selectedSet: '', filter: '', error: ''};
    }

    show(member, setId = '') {
        this.member = member;
        this.team = member.team;
        this.charId = member.char.getId();
        this.originalProfile = JSON.stringify(member.artifacts.getProfileSettings());
        this.previewSettings = member.getBuildData().settings;
        this.selectedElement = null;
        this.setState({isVisible: true, profile: member.artifacts.getProfileSettings(), selectedSet: setId, filter: '', error: ''},
            () => this.selectedElement?.scrollIntoView({block: 'nearest'}));
    }

    /** Sets with a profile control whose name contains the search string. */
    visibleSets() {
        const filter = this.state.filter.trim().toLowerCase();
        return DB.Artifacts.Sets.getKeysSorted(null, this.props.app.showBetaContent())
            .filter(setId => setProfileControls(setId).length)
            .filter(setId => !filter || lang.get(DB.Artifacts.Sets.get(setId).getName()).toLowerCase().includes(filter));
    }

    change(name, value) {
        this.setState(state => ({profile: patchProfile(state.profile, {[name]: value})}));
    }

    close() {
        this.setState({isVisible: false, profile: {}, error: ''});
    }

    save() {
        if (!this.state.isVisible) return;
        if (this.member.char.getId() !== this.charId || this.member.team !== this.team
            || !this.team?.getMembers().includes(this.member)
            || JSON.stringify(this.member.artifacts.getProfileSettings()) !== this.originalProfile) {
            this.setState({error: t('changed')});
            return;
        }
        this.member.artifacts.replaceProfile(this.state.profile);
        this.close();
        this.props.app.refresh();
    }

    renderSet(setId) {
        const set = DB.Artifacts.Sets.get(setId);
        const controls = setProfileControls(setId).map(entry => entry.cond);
        const settings = {...this.previewSettings, [Artifact.settingName(setId)]: 5,
            ...resolveArtifactSetSettings(this.state.profile, {[setId]: 5})};
        const selected = this.state.selectedSet === setId;
        return <div key={setId} data-set={setId}
            className={'artifact-profile-set border-rarity-' + set.maxRarity + (selected ? ' selected' : '')}
            ref={element => { if (selected) this.selectedElement = element; }}>
            <div className="line">
                <ArtifactSetIcon set={setId} size={40}/>
                <div className="name">{lang.get(set.getName())}</div>
            </div>
            <ConditionList items={controls} settings={settings} controlSettings={settings} noWrap
                ignoreSubconditions showHidden showBeta={this.props.app.showBetaContent()}
                onChange={(name, value) => this.change(name, value)}/>
        </div>;
    }

    render() {
        return <DialogContainer addClass="artifact-profile-modal" width={900} maxHeight
            title={t('title') + (this.member ? ' · ' + lang.get(this.member.char.object.getName()) : '')}
            isVisible={this.state.isVisible} closeCallback={() => this.close()}>
            {this.state.isVisible && <FullHeight>
                <FullHeightStatic>
                    <p className="artifact-profile-description">{t('description')}</p>
                    <ControlsBar>
                        <SearchInput barClass="resizable" value={this.state.filter}
                            onChange={filter => this.setState({filter})}/>
                    </ControlsBar>
                </FullHeightStatic>
                <FullHeightScrollable>
                    <div className="artifact-profile-sets">
                        {this.visibleSets().map(setId => this.renderSet(setId))}
                    </div>
                </FullHeightScrollable>
                <FullHeightStatic>
                    {this.state.error && <p role="alert">{this.state.error}</p>}
                    <ControlsBar>
                        <ControlsBarDivider/>
                        <TitledButton type="button" icon="icon-ok" title={lang.get('modal_buttons.save')} onClick={() => this.save()}/>
                        <TitledButton type="button" icon="icon-cancel" title={lang.get('modal_buttons.cancel')} onClick={() => this.close()}/>
                    </ControlsBar>
                </FullHeightStatic>
            </FullHeight>}
        </DialogContainer>;
    }
}
