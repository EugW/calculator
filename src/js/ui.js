import 'simplebar/dist/simplebar.min.css';

import "./ui/Slider";
import "./ui/Dropdown";

import "../css/app.css"
import "../css/generated/icons_chars.css"
import "../css/generated/icons_enemies_abyss.css";
import "../css/generated/icons_enemies_automatons.css";
import "../css/generated/icons_enemies_boss.css";
import "../css/generated/icons_enemies_elemental.css";
import "../css/generated/icons_enemies_fatui.css";
import "../css/generated/icons_enemies_hilichurls.css";
import "../css/generated/icons_enemies_human.css";
import "../css/generated/icons_enemies_legend.css";
import "../css/generated/icons_enemies_magical.css";
import "../css/generated/icons_weapons_bow.css"
import "../css/generated/icons_weapons_catalyst.css"
import "../css/generated/icons_weapons_claymore.css"
import "../css/generated/icons_weapons_polearm.css"
import "../css/generated/icons_weapons_sword.css"
import "../css/generated/icons_artifacts_flower.css"
import "../css/generated/icons_artifacts_plume.css"
import "../css/generated/icons_artifacts_sands.css"
import "../css/generated/icons_artifacts_goblet.css"
import "../css/generated/icons_artifacts_circlet.css"
import "../css/icons/common.css"
import "../css/icons/elements.css"
import "../css/icons/food.css"
import "../css/icons/weapons.css"
import "../css/inputs.css"
import "../css/ui/legacy.css"

import { ArtifactScanner } from "./ui/Window/ArtifactScanner";
import { ArtifactSetSettingsModal } from './ui/Modal/ArtifactSetSettings.jsx';
import { ArtifactSetTab } from './ui/Tab/ArtifactSetTab';
import { ArtifactsGeneratorTab } from './ui/Tab/ArtifactsGenerator';
import { ArtifactsStorageTab } from './ui/Tab/ArtifactStorage';
import { GoodImportTab } from './ui/Tab/GoodImport';
import { ArtifactSubstatTab } from './ui/Tab/ArtifactSubstatTab';
import { ArtifactTooltip } from './ui/Components/ArtifactTooltip.jsx';
import { ArtifactWindow } from './ui/Window/ArtifactWindow'
import { BestArtifactTab } from "./ui/Tab/BestArtifacts.jsx";
import { BuffsTab } from './ui/Tab/Buffs';
import { BuildTab } from './ui/Tab/Build';
import { TeamTab } from './ui/Tab/Team';
import { CharTalentModal } from './ui/Modal/CharTalent.jsx';
import { CompareTab } from './ui/Tab/Compare';
import { ConfirmModal } from './ui/Modal/Confirm.jsx';
import { ContactsModal } from './ui/Modal/Contacts.jsx';
import { EnkaImportModal } from './ui/Modal/EnkaImport';
import { FeaturesTab } from './ui/Tab/Features';
import { HelpModal } from './ui/Modal/Help.jsx';
import { DamageGraphModal } from './ui/Modal/DamageGraph.jsx';
import { Lang } from './ui/Lang';
import { Layout } from './ui/Layout';
import { MessageModal } from './ui/Modal/Message.jsx';
import { ModalLockArtifacts } from './ui/Modal/Select/LockArtifacts';
import { ModalSavedBuild } from './ui/Modal/Select/SavedBuild';
import { ModalSelectArtifactSet } from './ui/Modal/Select/ArtifactSet';
import { ModalSelectChar } from './ui/Modal/Select/Char';
import { ModalSelectEnemy } from './ui/Modal/Select/Enemy';
import { ModalSelectWeapon } from './ui/Modal/Select/Weapon';
import { PromptModal } from './ui/Modal/Prompt.jsx';
import { RotationTab } from './ui/Tab/Rotation';
import { SelectFeatureListModal } from './ui/Modal/Select/FeatureList.jsx';
import { SelectGroupListModal } from './ui/Modal/Select/GroupList.jsx';
import { SettingsTab } from './ui/Tab/Settings';
import { ShareTab } from './ui/Tab/Share';
import { StatsTab } from './ui/Tab/Stats';
import { Sync } from './ui/Components/Sync.jsx';
import { WeaponSuggestTab } from './ui/Tab/WeaponSuggest';
import { PresetTab } from './ui/Tab/Preset.jsx';
window.UI = {
    Layout: new Layout(),
    Lang: new Lang(),

    // main views
    PresetTab: new PresetTab(),
    ShareTab: new ShareTab(),
    WeaponSuggestTab: new WeaponSuggestTab(),
    ArtifactSetTab: new ArtifactSetTab(),
    ArtifactsGeneratorTab: new ArtifactsGeneratorTab(),
    SettingsTab: new SettingsTab(),
    ArtifactSubstatTab: new ArtifactSubstatTab(),
    BestArtifactTab: new BestArtifactTab({position: 'right'}),
    BuffsTab: new BuffsTab({position: 'right'}),
    TeamTab: new TeamTab({position: 'right'}),
    BuildTab: new BuildTab({position: 'right'}),
    ArtifactsStorageTab: new ArtifactsStorageTab({position: 'right'}),
    GoodImportTab: new GoodImportTab({position: 'right'}),
    RotationTab: new RotationTab({position: 'right'}),
    CompareTab: new CompareTab({position: 'right'}),

    // popups
    ArtifactWindow: new ArtifactWindow(), // jq
    ArtifactScanner: new ArtifactScanner(), // jq
    ConfirmWindow: new ConfirmModal(),
    PromptWindow: new PromptModal(),
    WindowMessage: new MessageModal(),
    WindowContacts: new ContactsModal(),
    WindowHelp: new HelpModal(),
    DamageGraphModal: new DamageGraphModal(),
    WindowSelectFeatureList: new SelectFeatureListModal(),
    WindowSelectGroupList: new SelectGroupListModal(),

    StatsTabReact: new StatsTab(),
    FeaturesTabReact: new FeaturesTab(),
    WeaponSelectReact: new ModalSelectWeapon(),
    CharSelectReact: new ModalSelectChar(),
    ArtifactSetSelectReact: new ModalSelectArtifactSet(),
    EnemySelectReact: new ModalSelectEnemy(),
    LockArtifacts: new ModalLockArtifacts(),
    EnkaImport: new EnkaImportModal(),

    SavedBuild: new ModalSavedBuild(),

    // tooltips
    TooltipArtifact: new ArtifactTooltip(),
    WindowCharTalent: new CharTalentModal(),
    ArtifactSetSettingsModal: new ArtifactSetSettingsModal(),
    Sync: new Sync(),

    debug: (text) => {if (isDevel()) { console.log(text); }}
};

function isDevel() {
    return typeof __DEVEL__ !== 'undefined' && __DEVEL__;
}
