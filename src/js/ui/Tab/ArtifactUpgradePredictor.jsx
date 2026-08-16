import React from 'react';
import parse from 'html-react-parser';

import "../../../css/Components/Tab/Artifacts.css";
import "../../../css/Components/Tab/ArtifactUpgradePredictor.css";

import { Feature2 } from '../../classes/Feature2';
import { WorkerFactoryArtifactUpgradePredictor } from '../../classes/WorkerFactory/ArtifactUpgradePredictor';
import { Stats } from '../../classes/Stats';
import { getArtifactSettingsForBuild, isArtifactUnderleveled } from '../../classes/ArtifactUpgradePredictor';
import { ControlsBar, ControlsBarDivider } from '../Components/ControlsBar';
import { Dropdown } from '../Components/Inputs/Dropdown';
import { FullHeight, FullHeightScrollable, FullHeightStatic } from '../Components/FullHeight';
import { GroupBox } from '../Components/Inputs/GroupBox';
import { TitledButton } from '../Components/Inputs/Buttons';
import { ArtifactIcon } from '../Components/Icons';
import { Lang } from '../Lang';
import { ReactTab } from '../Components/Tab';
import { Tab } from "../Tab";

const DEFAULT_WORKERS = Math.max(1, Math.min(8, navigator.hardwareConcurrency || 4));

let lang = new Lang();

export class ArtifactUpgradePredictorTab extends Tab {
    constructor(params) {
        super(params);

        this.id = 'artifact-upgrade';
        this.rightRab = true;
        this.title = 'tab_header.artifact_upgrade';
    }

    refresh() {
        if (!this.component) {
            return;
        }

        this.component.handleExternalRefresh(this.app.getFeature());
    }

    createContent() {
        return (
            <ArtifactUpgradePredictorView
                ref={element => { this.component = element; }}
                app={this.app}
                title={this.title}
            />
        );
    }
}

class ArtifactUpgradePredictorView extends React.Component {
    constructor(props) {
        super(props);

        this.storage = props.app.storage.artifacts;
        this.factory = new WorkerFactoryArtifactUpgradePredictor({
            callback: (items) => this.predictCompleteCallback(items),
            progressCallback: (progress) => this.setState({ progress: progress }),
            errorCallback: () => this.setState({ isLoading: false }),
        });

        this.state = {
            feature: props.app.getFeature(),
            featureType: 'average',
            isLoading: false,
            isDirty: true,
            hasRun: false,
            items: [],
            progress: {},
            candidates: 0,
        };

        this.strings = {
            title: lang.get(this.props.title),
            start: lang.get('artifact_upgrade.start'),
            recompute: lang.get('artifact_upgrade.recompute'),
            candidates: lang.get('artifact_upgrade.candidates'),
            instructions: lang.get('artifact_upgrade.instructions_button'),
            improve_chance: lang.get('artifact_upgrade.improve_chance'),
            expected_gain: lang.get('artifact_upgrade.expected_gain'),
            variants: lang.get('artifact_upgrade.variants'),
            outdated: lang.get('artifact_upgrade.outdated'),
            no_build: lang.getTalent('suggester.no_equipped_artifacts'),
            no_items: lang.get('artifact_upgrade.no_items'),
            ready: lang.get('artifact_upgrade.ready'),
            equipped: lang.get('artifact_upgrade.equipped'),
        };

        this.featureTypeValues = [
            { value: 'normal', text: lang.get('pool_view.type_normal') },
            { value: 'crit', text: lang.get('pool_view.type_crit') },
            { value: 'average', text: lang.get('pool_view.type_average') },
        ];
    }

    componentWillUnmount() {
        this.factory.terminate(true);
    }

    handleExternalRefresh(feature) {
        this.setState({
            feature: feature,
            isDirty: true,
        });
    }

    dataFeaturesItems() {
        return Feature2.buildDropdown(this.props.app.currentSet());
    }

    getCandidateArtifacts() {
        let result = [];
        let used = {};
        let showBeta = this.props.app.showBetaContent();
        let storageHashes = this.storage.storageHashes();

        let addArtifact = (artifact) => {
            if (!artifact || !isArtifactUnderleveled(artifact)) {
                return;
            }

            let setData = DB.Artifacts.Sets.get(artifact.getSet());
            if (!setData) {
                return;
            }

            if (!showBeta && setData.isBeta()) {
                return;
            }

            let hash = artifact.getHash();
            if (used[hash]) {
                used[hash].equipped ||= this.isEquipped(hash);
                used[hash].inStorage ||= !!storageHashes[hash];
                return;
            }

            let item = {
                artifact: artifact,
                hash: hash,
                equipped: this.isEquipped(hash),
                inStorage: !!storageHashes[hash],
            };

            used[hash] = item;
            result.push(item);
        };

        for (let artifact of this.storage.listArtifacts()) {
            addArtifact(artifact);
        }

        for (let artifact of Object.values(this.props.app.getArtifacts())) {
            addArtifact(artifact);
        }

        return result;
    }

    handleInstructions() {
        UI.WindowMessage.show(
            'artifact_upgrade.instructions_title',
            'artifact_upgrade.instructions_text',
            undefined,
            'modal_buttons.gotit',
            700,
        );
    }

    startPredict(feature, featureType) {
        feature ||= this.state.feature;
        featureType ||= this.state.featureType;

        if (!this.props.app.currentSet().artifacts.hasEquipped()) {
            this.setState({
                items: [],
                hasRun: false,
                isDirty: false,
                isLoading: false,
                candidates: 0,
                progress: {},
            });
            return;
        }

        let candidates = this.getCandidateArtifacts();
        this.setState({
            feature: feature,
            featureType: featureType,
            isLoading: true,
            isDirty: false,
            hasRun: true,
            items: [],
            candidates: candidates.length,
            progress: {},
        });

        if (!candidates.length) {
            this.setState({
                isLoading: false,
                items: [],
            });
            return;
        }

        this.factory.run({
            build: this.props.app.currentSet(),
            artifacts: candidates.map((item) => item.artifact),
            feature: feature,
            featureType: featureType,
            baseValue: this.props.app.currentSet().getFeatureResultByName(feature)?.[featureType] || 0,
            maxThreads: DEFAULT_WORKERS,
        });
    }

    predictCompleteCallback(items) {
        let storageHashes = this.storage.storageHashes();
        let equipped = this.equippedHashes();
        let equippedMap = {};

        for (let hash of equipped) {
            equippedMap[hash] = 1;
        }

        items = items.map((item) => {
            let hash = item.artifact.getHash();

            return {
                ...item,
                hash: hash,
                inStorage: !!storageHashes[hash],
                equipped: !!equippedMap[hash],
            };
        });

        this.setState({
            items: items,
            isLoading: false,
            progress: {},
        });
    }

    handleFeature(item) {
        let feature = item.value;

        this.setState({
            feature: feature,
            isDirty: true,
        });
        this.props.app.setFeature(feature);

        if (this.state.hasRun) {
            this.startPredict(feature);
        }
    }

    handleFeatureType(item) {
        let featureType = item.value;

        this.setState({
            featureType: featureType,
            isDirty: true,
        });

        if (this.state.hasRun) {
            this.startPredict(this.state.feature, featureType);
        }
    }

    handleArtifactClick(artifact) {
        let settings = getArtifactSettingsForBuild(this.props.app.currentSet(), artifact);

        this.props.app.currentSet().setArtifact(artifact);
        this.props.app.setArtifactsSettings(settings);

        if (this.state.hasRun) {
            setTimeout(() => this.startPredict(), 1);
        }
    }

    handleArtifactEdit(artifact) {
        let hash = artifact.getHash();
        let storageItem = this.storage.getByHash(hash);

        if (storageItem) {
            UI.ArtifactWindow.show((result) => {
                result.setLocked(storageItem.isLocked());
                result.setGroups(storageItem.getGroups());
                this.storage.updateByHash(hash, result);

                let equipped = this.props.app.getArtifacts()[result.getSlot()];
                if (equipped && equipped.getHash() == hash) {
                    this.props.app.setArtifact(result, true);
                    this.props.app.refresh({ objects: ['storage.artifacts', 'build'] });
                } else {
                    this.props.app.refresh({ objects: ['storage.artifacts'] });
                }

                if (this.state.hasRun) {
                    setTimeout(() => this.startPredict(), 1);
                }
            }, storageItem, undefined, { groups: this.storage.listGroups() });
            return;
        }

        UI.ArtifactWindow.show((result) => {
            this.props.app.setArtifact(result);

            if (this.state.hasRun) {
                setTimeout(() => this.startPredict(), 1);
            }
        }, artifact, artifact.getSlot(), { groups: this.storage.listGroups() });
    }

    handleArtifactDelete(artifact) {
        let hash = artifact.getHash();
        let storageItem = this.storage.getByHash(hash);

        if (!storageItem) {
            return;
        }

        UI.ConfirmWindow.show('modal.confirm', 'artifact_pool.confirm_delete_artifact', () => {
            this.storage.deleteByHash(hash);
            this.props.app.refresh({ objects: ['storage.artifacts'] });

            if (this.state.hasRun) {
                setTimeout(() => this.startPredict(), 1);
            }
        });
    }

    handleArtifactStorage(artifact) {
        if (this.storage.getByHash(artifact.getHash())) {
            return;
        }

        UI.ConfirmWindow.show('modal.confirm', 'artifact_pool.confirm_add_storage', () => {
            this.props.app.storage.artifacts.addArtifacts([artifact]);
            this.props.app.refresh({ objects: ['storage.artifacts'] });

            if (this.state.hasRun) {
                setTimeout(() => this.startPredict(), 1);
            }
        });
    }

    handleArtifactOver(artifact) {
        if (UI.Layout.isMobile()) {
            return;
        }

        let settings = getArtifactSettingsForBuild(this.props.app.currentSet(), artifact);
        UI.TooltipArtifact.show(artifact, this.state.feature, settings);
    }

    equippedHashes() {
        let result = [];

        for (let artifact of Object.values(this.props.app.getArtifacts())) {
            if (artifact) {
                result.push(artifact.getHash());
            }
        }

        return result;
    }

    isEquipped(hash) {
        return this.equippedHashes().includes(hash);
    }

    render() {
        let hasBuild = this.props.app.currentSet().artifacts.hasEquipped();
        let candidateCount = this.state.hasRun ? this.state.candidates : this.getCandidateArtifacts().length;

        return (
            <ReactTab title={this.strings.title}>
                <FullHeight>
                    <FullHeightStatic>
                        <ControlsBar>
                            <Dropdown
                                barClass="resizable"
                                items={this.dataFeaturesItems()}
                                selected={this.state.feature}
                                onChange={(item) => this.handleFeature(item)}
                            />
                            <Dropdown
                                barClass="feature-type"
                                items={this.featureTypeValues}
                                selected={this.state.featureType}
                                onChange={(item) => this.handleFeatureType(item)}
                            />
                        </ControlsBar>
                        <GroupBox addClass="artifact-upgrade-summary">
                            <ControlsBar>
                                <div className="artifact-upgrade-candidates-inline">
                                    <span className="value">{candidateCount}</span>
                                    <span className="title">{this.strings.candidates}</span>
                                </div>
                                <ControlsBarDivider />
                                <TitledButton
                                    icon="icon-settings"
                                    title={this.strings.instructions}
                                    onClick={() => this.handleInstructions()}
                                />
                                <TitledButton
                                    icon="icon-ok"
                                    title={this.state.hasRun ? this.strings.recompute : this.strings.start}
                                    onClick={() => this.startPredict()}
                                    disabled={!hasBuild}
                                />
                            </ControlsBar>
                            {this.state.isDirty && this.state.hasRun ? (
                                <div className="artifact-upgrade-outdated">{this.strings.outdated}</div>
                            ) : null}
                        </GroupBox>
                    </FullHeightStatic>
                    <FullHeightScrollable
                        isLoading={this.state.isLoading}
                        loadingOverlay={lang.get('artifact_upgrade.loading')}
                        loadingProgress={this.state.progress}
                    >
                        {!hasBuild ? (
                            <div className="tab-message">{parse(this.strings.no_build)}</div>
                        ) : this.state.hasRun ? (
                            this.state.items.length ? (
                                <ArtifactUpgradeList
                                    items={this.state.items}
                                    onArtifactClick={(artifact) => this.handleArtifactClick(artifact)}
                                    onArtifactEdit={(artifact) => this.handleArtifactEdit(artifact)}
                                    onArtifactDelete={(artifact) => this.handleArtifactDelete(artifact)}
                                    onArtifactStorage={(artifact) => this.handleArtifactStorage(artifact)}
                                    onArtifactOver={(artifact) => this.handleArtifactOver(artifact)}
                                    strings={this.strings}
                                />
                            ) : (
                                <div className="tab-message">{this.strings.no_items}</div>
                            )
                        ) : (
                            <div className="tab-message">{this.strings.ready}</div>
                        )}
                    </FullHeightScrollable>
                </FullHeight>
            </ReactTab>
        );
    }
}

function ArtifactUpgradeList(props) {
    return (
        <>
            {props.items.map((item) => {
                return (
                    <ArtifactUpgradeBlock
                        key={item.hash}
                        item={item}
                        onClick={() => props.onArtifactClick(item.artifact)}
                        onEdit={() => props.onArtifactEdit(item.artifact)}
                        onDelete={item.inStorage ? () => props.onArtifactDelete(item.artifact) : null}
                        onStorage={!item.inStorage ? () => props.onArtifactStorage(item.artifact) : null}
                        onOver={() => props.onArtifactOver(item.artifact)}
                        strings={props.strings}
                    />
                );
            })}
        </>
    );
}

function ArtifactUpgradeBlock(props) {
    let art = props.item.artifact;
    let setData = DB.Artifacts.Sets.get(art.getSet());
    let scoreClass = props.item.score > 0.0001 ? ' positive' : (props.item.score < -0.0001 ? ' negative' : '');
    let scoreValue = formatPercent(props.item.score);
    let chanceValue = formatPercent(props.item.improveChance, false);

    return (
        <div
            className={'artifact-big-block artifact-upgrade-block' + (props.item.equipped ? ' equipped' : '')}
            onClick={props.onClick}
            onMouseOver={(e) => UI.TooltipArtifact.updatePosition(e)}
            onMouseEnter={props.onOver}
            onMouseLeave={() => UI.TooltipArtifact.hide()}
        >
            <div className="line icon-line">
                <ArtifactIcon size="60" artifact={art} />
                {!art.isValid() ? <div className="invalid"></div> : null}
                <div className="names">
                    <div className="line">
                        <div className="buttons" onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}>
                            <ArtifactButton
                                icon="edit"
                                onClick={props.onEdit}
                                tooltip={lang.get('tooltip.artifact_edit')}
                            />
                            {props.onDelete ? (
                                <ArtifactButton
                                    icon="delete"
                                    onClick={props.onDelete}
                                    tooltip={lang.get('tooltip.artifact_delete')}
                                />
                            ) : null}
                            {props.onStorage ? (
                                <ArtifactButton
                                    icon="storage"
                                    onClick={props.onStorage}
                                    tooltip={lang.get('tooltip.artifact_storage')}
                                />
                            ) : null}
                        </div>
                        <div className="name">{lang.get(setData.getName())}</div>
                    </div>
                    <div className="line main-stat">
                        <div className="level">+{art.getLevel()}</div>
                        <div className="value">
                            <span className="stat-name">({lang.get('stat.' + art.getMainStat())} </span>
                            +{Stats.format(art.getMainStat(), art.getMainStatValue())}
                            <span className="stat-name">)</span>
                        </div>
                    </div>
                </div>
                <div className={'artifact-upgrade-score' + scoreClass}>
                    <div className="artifact-upgrade-score-title">{props.strings.expected_gain}</div>
                    <div className="artifact-upgrade-score-value">{scoreValue}</div>
                    <div className="artifact-upgrade-score-rem">{props.strings.improve_chance}: {chanceValue}</div>
                    <div className="artifact-upgrade-score-rem">{props.strings.variants}: {Stats.format('', props.item.variants)}</div>
                    {props.item.equipped ? <div className="artifact-upgrade-score-rem">{props.strings.equipped}</div> : null}
                </div>
            </div>
            <div className="line sub-stat">
                {art.getDisplaySubStats().map((subStat, index) => {
                    return (
                        <div key={subStat.stat + '-' + index} className={'value' + (subStat.inactive ? ' inactive' : '')}>
                            <span className="stat-name">{lang.get('stat.' + subStat.stat)} </span>
                            {Stats.format(subStat.stat, subStat.value, { signed: true })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ArtifactButton(props) {
    return (
        <div
            className={'button ' + props.icon}
            onClick={props.onClick}
            data-tooltip={props.tooltip}
        />
    );
}

function formatPercent(value, signed) {
    return Stats.format('text_percent', value * 100, {
        signed: signed !== false,
        decimal_digits: 1,
        no_decimal_zero: true,
    }) || '0%';
}
