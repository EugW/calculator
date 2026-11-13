import React from 'react';
import { saveAs } from 'file-saver';
import '../../../css/Components/Tab/GoodImport.css';

import { Artifact } from '../../classes/Artifact';
import { ImporterGood, planArtifactImport, prepareGoodImportAdded } from '../../classes/Importer/Good';
import { ControlsBar } from '../Components/ControlsBar';
import { FullHeight, FullHeightScrollable, FullHeightStatic } from '../Components/FullHeight';
import { RoundButton, TitledButton } from '../Components/Inputs/Buttons';
import { Dropdown } from '../Components/Inputs/Dropdown';
import { GroupBox } from '../Components/Inputs/GroupBox';
import { Checkbox } from '../Components/Inputs/Input';
import { ReactTab } from '../Components/Tab';
import { Lang } from '../Lang';
import { Tab } from '../Tab';

const lang = new Lang();

export class GoodImportTab extends Tab {
    constructor(params) {
        super(params);
        this.id = 'good-import';
        this.rightRab = true;
        this.title = 'tab_header.good_import';
    }

    refresh() {
        this.component?.setState({});
    }

    createContent() {
        return <GoodImportView ref={element => { this.component = element; }} app={this.app} title={this.title} />;
    }
}

export class GoodImportView extends React.Component {
    constructor(props) {
        super(props);
        this.storage = props.app.storage.artifacts;
        this.state = {
            goodText: '',
            fileName: '',
            incoming: null,
            errors: 0,
            errorCode: null,
            reading: false,
            imported: false,
            actionAdd: true,
            actionUpdate: true,
            actionMissing: false,
            applyLocks: false,
            groupNames: [''],
        };
    }

    componentWillUnmount() {
        this.cancelFileRead();
    }

    cancelFileRead() {
        if (this.reader?.readyState === FileReader.LOADING) this.reader.abort();
        this.reader = null;
    }

    handleSelectFile(event) {
        const input = event.target;
        const file = input.files[0];
        if (!file) return;
        input.value = '';
        this.cancelFileRead();
        this.setState({goodText: '', fileName: file.name, incoming: null, errors: 0, errorCode: null, reading: true, imported: false});
        const reader = new FileReader();
        this.reader = reader;
        reader.onload = () => {
            if (this.reader !== reader) return;
            this.reader = null;
            this.processText(reader.result, file.name);
        };
        reader.onerror = () => {
            if (this.reader !== reader) return;
            this.reader = null;
            this.setState({reading: false, errorCode: 1});
        };
        reader.readAsText(file);
    }

    handleChangeText(text) {
        this.cancelFileRead();
        this.processText(text);
    }

    processText(text, fileName = '') {
        const result = text.trim() ? new ImporterGood().process(text) : null;
        this.setState({
            goodText: text,
            fileName,
            incoming: result?.code === 0 ? result.items : null,
            errors: result?.counts?.errors || 0,
            errorCode: result?.code || null,
            reading: false,
            imported: false,
        });
    }

    getImportPlan() {
        return planArtifactImport(this.storage.listArtifacts(), this.state.incoming || []);
    }

    handleImport() {
        if (!this.state.incoming || this.state.reading) return;
        const changes = this.getImportPlan();
        if (this.state.actionUpdate) this.storage.updateMetadata(changes.updated);
        if (this.state.actionAdd) {
            // Keep the loaded source intact so its lock flags survive subsequent previews/imports.
            const added = changes.added.map(artifact => artifact.clone());
            prepareGoodImportAdded(added, {applyLocks: this.state.applyLocks, groupNames: this.state.groupNames});
            this.storage.addArtifacts(added);
        }
        if (this.state.actionMissing) {
            for (const artifact of changes.missing) this.storage.deleteByHash(artifact.getHash());
        }
        this.setState({imported: true});
        this.props.app.refresh({objects: ['storage.artifacts']});
    }

    handleExport() {
        const data = ImporterGood.export(this.storage.listArtifacts());
        const blob = new Blob([JSON.stringify(data)], {type: 'application/json;charset=utf-8'});
        saveAs(blob, 'artifacts_GOOD.json');
    }

    handleCreateGroup() {
        UI.PromptWindow.show('rotation_view.enter_value', '', text => {
            const name = Artifact.trimGroupName(text);
            if (name) this.setState({groupNames: [...new Set([...this.state.groupNames, name])]});
        });
    }

    getArtifactGroups() {
        const groups = new Map(this.storage.listGroups().map(item => [item.value, {value: item.value, text: item.title}]));
        for (const name of this.state.groupNames) {
            if (!groups.has(name)) groups.set(name, {value: name, text: name || lang.get('artifact_group.empty_group')});
        }
        return [...groups.values()];
    }

    renderStorage() {
        const artifacts = this.storage.listArtifacts();
        const counts = [0, 0, 0, 0];
        for (const artifact of artifacts) {
            const metadata = artifact.getMetadata();
            const rolls = metadata.totalRolls !== undefined;
            const initials = Object.keys(metadata.initialValues || {}).length > 0;
            ++counts[(rolls ? 2 : 0) + (initials ? 1 : 0)];
        }
        return (
            <GroupBox addClass="good-section good-storage" title={lang.get('good_import.current_storage')}>
                <div className="good-storage-total">
                    <span>{lang.get('good_import.import_count')}</span>
                    <strong>{artifacts.length}</strong>
                </div>
                <table className="good-storage-table">
                    <thead><tr>
                        <th scope="col">totalRolls</th>
                        <th scope="col">{lang.get('good_import.initial_values')}</th>
                        <th scope="col">{lang.get('good_import.import_count')}</th>
                    </tr></thead>
                    <tbody>{[3, 2, 1, 0].map(type => (
                        <tr key={type}>
                            <td className={type & 2 ? 'present' : 'absent'}>{lang.get(type & 2 ? 'good_import.present' : 'good_import.absent')}</td>
                            <td className={type & 1 ? 'present' : 'absent'}>{lang.get(type & 1 ? 'good_import.present' : 'good_import.absent')}</td>
                            <td>{counts[type]}</td>
                        </tr>
                    ))}</tbody>
                </table>
                <div className="good-note">{lang.get('good_import.initial_values_note')}</div>
            </GroupBox>
        );
    }

    renderChange(title, count, action) {
        return (
            <div className="good-change-row">
                <span>{lang.get('good_import.' + title)}</span>
                <strong>{count}</strong>
                {action ? <Checkbox
                    title={lang.get('good_import.' + action.title)}
                    checked={this.state[action.state]}
                    onChange={checked => this.setState({[action.state]: checked})}
                /> : <span>{lang.get('good_import.action_unchanged')}</span>}
            </div>
        );
    }

    render() {
        const loaded = this.state.incoming !== null;
        const changes = loaded ? this.getImportPlan() : null;
        return (
            <ReactTab title={lang.get(this.props.title)}>
                <FullHeight addClass="good-import-view">
                    <FullHeightStatic>
                        <ControlsBar>
                            <TitledButton type="button" icon="icon-ok" title={lang.get('good_import.open_window')}
                                disabled={!loaded || this.state.reading} onClick={() => this.handleImport()} />
                            <TitledButton type="button" icon="icon-copy" title={lang.get('good_import.export')}
                                onClick={() => this.handleExport()} />
                        </ControlsBar>
                    </FullHeightStatic>
                    <FullHeightScrollable>
                        {this.renderStorage()}
                        <GroupBox addClass="good-section good-source" title={lang.get('good_import.load_source')}>
                            <input type="file" accept=".json,application/json" hidden
                                ref={element => { this.fileInput = element; }}
                                onChange={event => this.handleSelectFile(event)} />
                            <div className="good-file-picker">
                                <TitledButton type="button" icon="icon-copy" title={lang.get('good_import.choose_file')}
                                    onClick={() => this.fileInput.click()} />
                                <div className="good-file-name" title={this.state.fileName}>
                                    {this.state.fileName || lang.get('good_import.no_file_loaded')}
                                </div>
                            </div>
                            <textarea className="inputs-text good-json" value={this.state.goodText}
                                aria-label={lang.get('good_import.paste_text')} placeholder={lang.get('good_import.paste_text')}
                                onChange={event => this.handleChangeText(event.target.value)} spellCheck={false} />
                            <div className="good-status" role="status">
                                {this.state.reading ? lang.get('good_import.reading') :
                                    this.state.errorCode ? lang.get('good_import.status_error_' + this.state.errorCode) :
                                    loaded ? <>
                                        {lang.get(this.state.imported ? 'good_import.import_applied' : 'good_import.status_error_0')}
                                        {' · '}{lang.get('good_import.import_count')}: {this.state.incoming.length}
                                        {this.state.errors ? <> · {lang.get('good_import.skipped')}: {this.state.errors}</> : null}
                                    </> : lang.get('good_import.source_empty')}
                            </div>
                        </GroupBox>
                        <GroupBox addClass="good-section good-changes" title={lang.get('good_import.changes')}>
                            {loaded ? <>
                                {this.renderChange('import_added', changes.added.length, {title: 'action_added', state: 'actionAdd'})}
                                <div className="good-groups">
                                    <div className="good-note">{lang.get('good_import.new_artifact_groups')}</div>
                                    <ControlsBar>
                                        <Dropdown barClass="resizable" isMultiple={true} items={this.getArtifactGroups()}
                                            selected={this.state.groupNames} onChange={items => this.setState({groupNames: items.length ? items.map(item => item.value) : ['']})} />
                                        <RoundButton icon="small-number dots" text="+" tooltip={lang.get('good_import.create_group')}
                                            onClick={() => this.handleCreateGroup()} />
                                    </ControlsBar>
                                </div>
                                {this.renderChange('import_locks', changes.added.filter(artifact => artifact.isLocked()).length, {title: 'action_locks', state: 'applyLocks'})}
                                {this.renderChange('import_updated', changes.updated.length, {title: 'action_updated', state: 'actionUpdate'})}
                                {this.renderChange('import_matched', changes.matched.length)}
                                {this.renderChange('import_missing', changes.missing.length, {title: 'action_missing', state: 'actionMissing'})}
                            </> : <div className="good-note">{lang.get('good_import.changes_empty')}</div>}
                        </GroupBox>
                    </FullHeightScrollable>
                </FullHeight>
            </ReactTab>
        );
    }
}
