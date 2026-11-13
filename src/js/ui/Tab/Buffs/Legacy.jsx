import React from 'react';
import { ReactSortable } from "react-sortablejs";
import "../../../../css/Components/Tab/Buffs/Legacy.css";

import { Condition } from '../../../classes/Condition';
import { deliveredControlNames } from '../../../classes/Team/ConditionValues';
import { FloatingSet, FloatingWeapon, LEGACY_KINDS, VirtualCharacter } from '../../../classes/Team/Legacy';
import { OVERRIDE_STATS } from '../../../classes/Team/Overrides';
import { ConditionList } from '../../Components/ConditionList';
import { ArtifactSetIcon, CharIcon, WeaponIcon } from '../../Components/Icons';
import { TitledButton } from '../../Components/Inputs/Buttons';
import { Dropdown } from '../../Components/Inputs/Dropdown';
import { NumberInput } from '../../Components/Inputs/Input';
import { Lang } from '../../Lang';

const lang = new Lang();
const t = (key) => lang.get('legacy.' + key);

const ELEMENTS = ['pyro', 'hydro', 'electro', 'cryo', 'anemo', 'geo', 'dendro'];
const TALENTS = ['attack', 'elemental', 'burst'];

/**
 * @param {Team} team
 * @returns {number} the entries of the team's legacy source
 */
export function legacyCount(team) {
    return team.legacy.getEntries().length;
}

/**
 * The team's legacy source (Team/Legacy): virtual characters, floating
 * weapons and floating sets, as a list.
 *
 * An entry is collapsed by default: its icon, its name and, for a virtual
 * character, whether it is in the party. Clicking it expands it: what it is
 * made of (its constellation and talent levels, its refinement), the stats
 * its effects read, and its own controls, which can differ per receiving
 * member. Entries are dragged by their header to change their order, which
 * decides the virtual characters that fill the party and the entry that
 * supplies a non-stacking effect by default.
 *
 * @param {{app: App}} props
 */
export class LegacySection extends React.Component {
    constructor(props) {
        super(props);
        /** uids of the expanded entries */
        this.state = {expanded: []};
    }

    /**
     * @param {LegacyEntry} entry a new entry: added expanded, to be set up
     */
    add(entry) {
        this.props.app.changeLegacy((team) => team.addLegacy(entry));
        this.setState((state) => ({expanded: state.expanded.concat(entry.uid)}));
    }

    addCharacter() {
        let team = this.props.app.getTeam();
        let taken = team.getMembers().map((member) => member.char.getId())
            .concat(team.legacy.getEntries().filter((entry) => entry.kind == LEGACY_KINDS.CHAR).map((entry) => entry.getSourceId()));

        UI.CharSelectReact.show({
            excludeIds: taken,
            callback: (char) => {
                if (char) this.add(new VirtualCharacter(char));
            },
        });
    }

    addWeapon() {
        UI.WeaponSelectReact.show({
            changeWeaponType: true,
            selectedId: 0,
            callback: (weapon) => {
                if (weapon) this.add(new FloatingWeapon(weapon));
            },
        });
    }

    addSet() {
        UI.ArtifactSetSelectReact.show({
            callback: (data) => {
                if (data) this.add(new FloatingSet(data.key));
            },
        });
    }

    /**
     * @param {number} uid
     */
    toggle(uid) {
        this.setState((state) => ({
            expanded: state.expanded.includes(uid) ? state.expanded.filter((item) => item != uid) : state.expanded.concat(uid),
        }));
    }

    /**
     * The list as the drag left it. The sortable also reports a mere press
     * and release: only a new order changes the team.
     *
     * @param {Array.<{id: number}>} items
     */
    handleSort(items) {
        let order = items.map((item) => item.id);
        let current = this.props.app.getTeam().legacy.getEntries().map((entry) => entry.uid);
        if (order.length == current.length && order.some((uid, index) => uid != current[index])) {
            this.props.app.changeLegacy((team) => team.legacy.reorder(order));
        }
    }

    render() {
        let app = this.props.app;
        let entries = app.getTeam().legacy.getEntries();
        let evaluation = app.teamView().evaluation();

        return (
            <div className="buff-legacy">
                <div className="buff-legacy-descr">{t('descr')}</div>
                <div className="buff-legacy-add">
                    <TitledButton icon="icon-add" title={t('add_char')} onClick={() => this.addCharacter()} />
                    <TitledButton icon="icon-add" title={t('add_weapon')} onClick={() => this.addWeapon()} />
                    <TitledButton icon="icon-add" title={t('add_set')} onClick={() => this.addSet()} />
                </div>
                {entries.length ? (
                    <ReactSortable
                        list={entries.map((entry) => ({id: entry.uid}))}
                        setList={(items) => this.handleSort(items)}
                        className="buff-legacy-list"
                        handle=".buff-legacy-header"
                        swapThreshold={0.5}
                    >
                        <LegacyEntries
                            app={app}
                            entries={entries}
                            evaluation={evaluation}
                            expanded={this.state.expanded}
                            onToggle={(uid) => this.toggle(uid)}
                        />
                    </ReactSortable>
                ) : <div className="buff-legacy-none">{t('empty')}</div>}
            </div>
        );
    }
}

function LegacyEntries({app, entries, evaluation, expanded, onToggle}) {
    return (
        <>
            {entries.map((entry) => (
                <LegacyEntryView
                    key={entry.uid}
                    app={app}
                    entry={entry}
                    evaluation={evaluation}
                    expanded={expanded.includes(entry.uid)}
                    onToggle={() => onToggle(entry.uid)}
                />
            ))}
        </>
    );
}

/**
 * @param {LegacyEntry} entry
 * @param {TeamEvaluation} evaluation
 * @returns {string} what the entry is in the team as it is now
 */
function entryState(entry, evaluation) {
    if (!evaluation.legacy.includes(entry)) return t('state_inactive');
    if (entry.kind != LEGACY_KINDS.CHAR) return '';
    return evaluation.fillers.includes(entry) ? t('state_party') : t('state_outside');
}

function EntryIcon({entry}) {
    if (entry.kind == LEGACY_KINDS.CHAR) return <CharIcon size={40} char={entry.char.object} />;
    if (entry.kind == LEGACY_KINDS.WEAPON) return <WeaponIcon size={40} weapon={entry.weapon.object} />;
    return <ArtifactSetIcon size={40} set={entry.getSet()} />;
}

/** An entry: its header, which expands it and is its drag handle, and its body while expanded. */
function LegacyEntryView({app, entry, evaluation, expanded, onToggle}) {
    let active = evaluation.legacy.includes(entry);
    let state = entryState(entry, evaluation);

    return (
        <div
            className={'buff-legacy-entry' + (active ? '' : ' inactive') + (expanded ? ' expanded' : '')}
            data-kind={entry.kind}
            data-uid={entry.uid}
        >
            <div className="buff-legacy-header" role="button" aria-expanded={expanded} onClick={onToggle}>
                <EntryIcon entry={entry} />
                <div className="buff-legacy-title">
                    <div className="buff-legacy-name">{lang.get(entry.getName())}</div>
                    {state ? <div className="buff-legacy-state">{state}</div> : null}
                </div>
            </div>
            {expanded ? <EntryBody app={app} entry={entry} evaluation={evaluation} active={active} /> : null}
        </div>
    );
}

function EntryBody({app, entry, evaluation, active}) {
    let change = (callback) => app.changeLegacy(() => callback(entry));

    // Only the controls its delivered effects use: its own effects reach nobody.
    let names = deliveredControlNames(entry);
    let controls = Condition.unwrap(entry.getConditions({objects: ['char', 'weapon', 'artifacts']}))
        .filter((cond) => names.has(cond.getName()));
    let settings = active ? evaluation.resolveFull(entry).settings : entry.getSettings();
    let stated = [...entry.statsRead(active ? settings : null)];

    return (
        <div className="buff-legacy-body">
            <EntryFields entry={entry} change={change} />
            {stated.length ? (
                <>
                    <div className="buff-legacy-stated-title" data-tooltip={t('stated_descr')}>{t('stated')}</div>
                    <div className="buff-legacy-fields">
                        {stated.map((kind) => <StatedStat key={kind} entry={entry} kind={kind} change={change} />)}
                    </div>
                </>
            ) : null}
            {controls.length ? (
                <ConditionList
                    items={controls}
                    settings={settings}
                    app={active ? app : null}
                    source={entry}
                    showBeta={true}
                    onChange={(name, value) => change((item) => item.modifySettings({[name]: value}))}
                />
            ) : null}
            {!controls.length && !stated.length ? <div className="buff-legacy-none">{t('no_effects')}</div> : null}
            <div className="buff-legacy-actions">
                <TitledButton icon="icon-delete" title={t('remove')} onClick={() => app.changeLegacy((team) => team.legacy.remove(entry))} />
            </div>
        </div>
    );
}

/** What the entry is made of: constellation and talent levels, refinement, the wielder's element. */
function EntryFields({entry, change}) {
    let fields = [];

    if (entry.kind == LEGACY_KINDS.CHAR) {
        let skills = entry.getSkills();
        fields.push(
            <div className="buff-legacy-field" key="constellation">
                <Dropdown
                    addClass="level-select"
                    items={[0, 1, 2, 3, 4, 5, 6].map((value) => ({value, text: 'C' + value}))}
                    selected={entry.getConstellation()}
                    onChange={(item) => change((current) => current.setConstellation(item.value))}
                />
            </div>
        );
        for (const talent of TALENTS) {
            fields.push(
                <div className="buff-legacy-field" key={talent} data-talent={talent}>
                    <span>{t('talent_' + talent)}</span>
                    <NumberInput
                        nonEmpty={true}
                        minValue={1}
                        maxValue={10}
                        addClass="talent-input"
                        value={skills[talent]}
                        onChange={(value) => change((current) => current.setSkills({[talent]: Math.max(1, Math.min(10, parseInt(value) || 1))}))}
                    />
                </div>
            );
        }
    }

    if (entry.kind == LEGACY_KINDS.WEAPON) {
        let max = entry.weapon.object.getMaxRefinement();
        fields.push(
            <div className="buff-legacy-field" key="refine">
                <span>{t('refine')}</span>
                <Dropdown
                    addClass="level-select"
                    items={Array.from({length: max}, (item, i) => ({value: i + 1, text: 'R' + (i + 1)}))}
                    selected={entry.getRefine()}
                    onChange={(item) => change((current) => current.setRefine(item.value))}
                />
            </div>
        );
    }

    if (entry.readsWielderElement()) {
        fields.push(
            <div className="buff-legacy-field" key="element">
                <span>{t('element')}</span>
                <Dropdown
                    items={[{value: '', text: t('element_any')}].concat(ELEMENTS.map((element) => ({value: element, text: lang.get('elements.' + element)})))}
                    selected={entry.element}
                    onChange={(item) => change((current) => current.setElement(item.value))}
                />
            </div>
        );
    }

    return fields.length ? <div className="buff-legacy-fields">{fields}</div> : null;
}

function StatedStat({entry, kind, change}) {
    let percent = !!OVERRIDE_STATS[kind].percent;
    return (
        <div className="buff-legacy-field" data-stat={kind}>
            <span>{lang.get('stat.' + kind)}</span>
            <NumberInput
                maxValue={percent ? 9999 : 999999}
                addClass="stat-input"
                value={entry.stated[kind] ?? ''}
                isDecimal={percent}
                decimalDigits={1}
                onChange={(value) => change((current) => current.setStated(kind, value === '' || value === null ? null : value))}
            />
            {percent ? '%' : ''}
        </div>
    );
}
