import React from 'react';
import parse from 'html-react-parser';
import "../../../css/Components/Tab/Settings.css"

import { FullHeight, FullHeightScrollable } from '../Components/FullHeight';
import { ReactTab } from '../Components/Tab';
import { Lang } from '../Lang';
import { Tab } from "../Tab";
import { Accordion, AccordionItem } from '../Components/Accordion';
import { GroupBox } from '../Components/Inputs/GroupBox';
import { TitledButton } from '../Components/Inputs/Buttons';
import { Dropdown } from '../Components/Inputs/Dropdown';
import { Checkbox, CheckboxList, FileInput, NumberInput } from '../Components/Inputs/Input';
import { normalizePrepWorkers } from '../../classes/ArtifactActionPredictor';
import { Backup } from '../../classes/Backup';
import {
    GPU_TOP_K_MAX_BATCH_COMBINATIONS,
    normalizeGPUOptimizerBatchSize,
} from '../../classes/GPUOptimizerContract';
import { ImporterGood } from '../../classes/Importer/Good';

let FileSaver = require('file-saver');
let lang = new Lang();

const GPU_BATCH_SIZE_SETTING = 'artifact_suggest_gpu_batch_size';
const GPU_BATCH_SIZE_OPTIONS = [
    { value: 'auto', text: 'Auto' },
    { value: '262144', text: '256K' },
    { value: '524288', text: '512K' },
    { value: '1048576', text: '1M' },
    { value: '2097152', text: '2M' },
    { value: '4194304', text: '4M' },
    { value: '8388608', text: '8M' },
    { value: String(GPU_TOP_K_MAX_BATCH_COMBINATIONS), text: '16M' },
];

export class SettingsTab extends Tab {
    constructor(params) {
        super(params);

        this.id = 'settings';
        this.rightRab = true;
    }

    refresh() {
        if (!this.component) {
            return;
        }

        this.component.setState({
            needRefreshBuilds: true,
        });
    }

    createContent() {
        return (
            <SettingsView
                ref={element => { this.component = element; }}
                app={this.app}
                title={this.title}
            />
        );
    }
}

export class SettingsView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            create_backup: {
                saveChars: true,
                saveArts: true,
                saveRotations: true,
            },
            load_backup: {
                addChars: false,
                addArts: false,
                addRotations: false,
            },
        };

        this.file = null;
    }

    refresh() {
        this.setState(this.state);
    }

    handleCreateBackupFlag(name, value) {
        let vals = this.state.create_backup;
        vals[name] = value;
        this.setState({create_backup: vals});
    }

    handleLoadBackupFlag(name, value) {
        let vals = this.state.load_backup;
        vals[name] = value;
        this.setState({load_backup: vals});
    }

    handleCreateBackup() {
        let data = this.props.app.storage.createBackup(this.state.create_backup);
        FileSaver.saveAs(data.toBlob(), 'backup.json');
    }

    handleSelectFile(e) {
        this.file = e.target.files[0];
    }

    handleLoadBackup() {
        if (!this.file) {
            return;
        }

        let reader = new FileReader();
        reader.readAsText(this.file);

        reader.onload = () => {
            let backup = Backup.fromString(reader.result);
            let opts = this.state.load_backup;

            if (this.props.app.storage.loadBackup(backup, opts)) {
                UI.WindowMessage.show('settings_view.success', 'settings_view.success_text');
                this.props.app.refresh();
            } else {
                this.backupError();
            }
        };

        reader.onerror = () => {this.backupError();};
    }

    backupError() {
        UI.WindowMessage.show('settings_view.error', 'settings_view.error_text');
    }

    handleSyncEnable() {
        this.props.app.enableSync();
        this.refresh();
    }

    handleSyncDisable(del_files) {
        if (del_files) {
            UI.ConfirmWindow.show('modal.confirm', 'sync.delete_confirm', () => {
                this.props.app.disableSync(true);
                this.refresh();
            });
        } else {
            this.props.app.disableSync();
            this.refresh();
        }
    }

    handleGoodImport() {
        UI.WindowGood.show();
    }

    handleGoodExport() {
        let data = ImporterGood.export(this.props.app.storage.artifacts.listArtifacts());
        let blob = new Blob([JSON.stringify(data)], {type: "application/json;charset=utf-8"});
        FileSaver.saveAs(blob, 'artifacts_GOOD.json');
    }

    handleToggleBetaContent(value) {
        this.props.app.setSetting('show_beta_content', value ? 1 : 0);
        this.refresh();
    }

    handleToggleWorkerValueOutput(value) {
        this.props.app.setSetting('artifact_suggest_worker_value_output', value ? 1 : 0);
        this.refresh();
    }

    handleGpuBatchSize(value) {
        this.props.app.setSetting(GPU_BATCH_SIZE_SETTING, value);
        this.refresh();
    }

    handleArtifactActionWorkers(value) {
        this.props.app.setSetting('artifact_action_workers', normalizePrepWorkers(value));
        this.refresh();
    }

    getGpuBatchSize() {
        const value = normalizeGPUOptimizerBatchSize(
            this.props.app.getSetting(GPU_BATCH_SIZE_SETTING)
        );
        return GPU_BATCH_SIZE_OPTIONS.some((item) => item.value === value) ? value : 'auto';
    }

    render() {
        this.beta_content = this.props.app.showBetaContent();
        this.worker_value_output = !!parseInt(this.props.app.getSetting('artifact_suggest_worker_value_output') || 0);
        this.gpu_batch_size = this.getGpuBatchSize();

        return (
            <ReactTab title={lang.get('tab_header.settings_view')}>
                <FullHeight>
                    <FullHeightScrollable>
                        <Accordion>
                            <AccordionItem id="backup" title={lang.get('settings_view.backup')}>
                                <GroupBox title={lang.get('settings_view.create_backup')}>
                                    <CheckboxList
                                        onChange={(name, value) => this.handleCreateBackupFlag(name, value)}
                                        items={[
                                            {
                                                name: 'saveChars',
                                                title: lang.get('settings_view.create_backup_chars'),
                                                checked: this.state.create_backup.saveChars,
                                            },
                                            {
                                                name: 'saveArts',
                                                title: lang.get('settings_view.create_backup_artifacts'),
                                                checked: this.state.create_backup.saveArts,
                                            },
                                            {
                                                name: 'saveRotations',
                                                title: lang.get('settings_view.create_backup_rotations'),
                                                checked: this.state.create_backup.saveRotations,
                                            },
                                        ]}
                                    />
                                    <TitledButton
                                        icon='icon-ok'
                                        title={lang.get('settings_view.create_backup_button')}
                                        onClick={() => this.handleCreateBackup()}
                                    />
                                </GroupBox>

                                <GroupBox addClass="description" title={lang.get('settings_view.load_backup')}>
                                    <div>{lang.get('settings_view.restore_title')}</div>
                                    <CheckboxList
                                        onChange={(name, value) => this.handleLoadBackupFlag(name, value)}
                                        items={[
                                            {
                                                name: 'addChars',
                                                title: lang.get('settings_view.restore_chars'),
                                                checked: this.state.load_backup.addChars,
                                            },
                                            {
                                                name: 'addArts',
                                                title: lang.get('settings_view.restore_artifacts'),
                                                checked: this.state.load_backup.addArts,
                                            },
                                            {
                                                name: 'addRotations',
                                                title: lang.get('settings_view.restore_rotations'),
                                                checked: this.state.load_backup.addRotations,
                                            },
                                        ]}
                                    />
                                    <FileInput
                                        onChange={(e) => this.handleSelectFile(e)}
                                    />
                                    <TitledButton
                                        icon='icon-ok'
                                        title={lang.get('settings_view.load_backup_button')}
                                        onClick={() => this.handleLoadBackup()}
                                    />
                                </GroupBox>

                                <GroupBox addClass="description" title={lang.get('sync.settings_title')}>
                                    {parse(lang.get('sync.settings_text'))}
                                    <GoogleButtons
                                        app={this.props.app}
                                        handleSyncDisable={(val) => this.handleSyncDisable(val)}
                                        handleSyncEnable={() => this.handleSyncEnable()}
                                    />
                                </GroupBox>
                            </AccordionItem>
                            <AccordionItem id="good" title={lang.get('good_import.title')}>
                                {parse(lang.get('good_import.disclaimer'))}
                                <TitledButton
                                    icon='icon-ok'
                                    title={lang.get('good_import.open_window')}
                                    onClick={() => this.handleGoodImport()}
                                />
                                <TitledButton
                                    icon='icon-ok'
                                    title={lang.get('good_import.export')}
                                    onClick={() => this.handleGoodExport(true)}
                                />
                            </AccordionItem>
                            <AccordionItem id="artifact_suggest" title={lang.get('settings_view.artifact_suggest')}>
                                <Checkbox
                                    title={lang.get('settings_view.enable_worker_value_output')}
                                    checked={this.worker_value_output}
                                    onChange={(value) => this.handleToggleWorkerValueOutput(value)}
                                />
                                <div className="settings-gpu-row">
                                    <div className="settings-gpu-row-title">{lang.get('settings_view.gpu_batch_size')}</div>
                                    <Dropdown
                                        addClass="settings-gpu-batch-size"
                                        items={GPU_BATCH_SIZE_OPTIONS}
                                        selected={this.gpu_batch_size}
                                        onChange={(item) => this.handleGpuBatchSize(item.value)}
                                    />
                                </div>
                                <div className="settings-gpu-note">{lang.get('settings_view.gpu_batch_size_note')}</div>
                                <label className="settings-gpu-row">
                                    <span className="settings-gpu-row-title">{lang.get('settings_view.artifact_action_workers')}</span>
                                    <NumberInput addClass="settings-action-workers" nonEmpty clampValue
                                        minValue={1} maxValue={globalThis.navigator?.hardwareConcurrency || 1}
                                        value={normalizePrepWorkers(this.props.app.getSetting('artifact_action_workers'))}
                                        onChange={value => this.handleArtifactActionWorkers(value)} />
                                </label>
                                <div className="settings-gpu-note">{lang.get('settings_view.artifact_action_workers_note')}</div>
                            </AccordionItem>
                            <AccordionItem id="beta" title={lang.get('settings_view.beta')}>
                                <Checkbox
                                    title={lang.get('settings_view.show_beta')}
                                    checked={this.beta_content}
                                    onChange={(value) => this.handleToggleBetaContent(value)}
                                />
                            </AccordionItem>
                        </Accordion>
                    </FullHeightScrollable>
                </FullHeight>
            </ReactTab>
        );
    }
}

function GoogleButtons(props) {
    if (!props.app.storage.sync.isScriptsLoaded()) {
        return (
            <div className="beta-warning">
                {parse(lang.get('sync.api_fail'))}
            </div>
        );
    }

    if (props.app.getSetting('storage_sync_enabled')) {
        return (<>
            <TitledButton
                icon='icon-cancel'
                title={lang.get('sync.settings_disable')}
                onClick={() => props.handleSyncDisable()}
            />
            <TitledButton
                icon='icon-delete'
                title={lang.get('sync.settings_disable_delete')}
                onClick={() => props.handleSyncDisable(true)}
            />
        </>);
    } else {
        return (
            <TitledButton
                icon='icon-ok'
                title={lang.get('sync.settings_enable')}
                onClick={() => props.handleSyncEnable()}
            />
        );
    }
}
