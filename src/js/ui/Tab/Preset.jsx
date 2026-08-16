import React from 'react';
import "../../../css/Components/Tab/Preset.css";
import { Serializer } from '../../classes/Serializer';
import { CalcSet } from '../../classes/CalcSet';
import { ControlsBar, ControlsBarDivider } from '../Components/ControlsBar';
import { DialogContainer } from '../Components/Dialog/Container';
import { FullHeight, FullHeightScrollable, FullHeightStatic } from '../Components/FullHeight';
import { TitledButton } from '../Components/Inputs/Buttons';
import { TextInputWithButton } from '../Components/Inputs/Input';
import { ReactTab } from '../Components/Tab';
import { CharIcon, WeaponIcon } from '../Components/Icons';
import { Lang } from '../Lang';
import { Tab } from "../Tab";
import { PresetApi } from '../../classes/API/Preset';

let lang = new Lang();
let presetApi = new PresetApi();

const MAX_PARTY_FILTERS = 3;
const PAGE_SIZE = 10;

// ─── Tab shell ────────────────────────────────────────────────────────────────

export class PresetTab extends Tab {
    constructor(params) {
        super(params);
        this.id = 'preset';
        this.rightRab = false;
        this.title = lang.get('preset.tab_title');
    }

    refresh() {
        if (!this.component) return;
        this.component.activate();
    }

    createContent() {
        return (
            <PresetView
                ref={element => { this.component = element; }}
                app={this.app}
                title={this.title}
            />
        );
    }
}

// ─── Main view ────────────────────────────────────────────────────────────────

export class PresetView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            presets: [],
            loading: false,
            hasMore: true,
            offset: 0,
            currentUser: localStorage.getItem('preset_auth_username') || null,
            filters: {
                search: '',
                char_id: null,
                weapon_id: null,
                // Multi-party: array of up to MAX_PARTY_FILTERS serializeIds
                party_ids: [],
                liked: false,
            },
            // Resolved objects for display labels
            filterChar: null,
            filterWeapon: null,
            // Array of char objects matching party_ids filter
            filterPartyChars: [],
            searchTimer: null,
        };
        this.hasLoaded = false;
        this._sentinel = React.createRef();
        this._observer = null;
        this._initialPageLoaded = false;
        this._isReloading = false;
        this._isLoadingMore = false;
        this._reloadToken = 0;
    }

    componentDidMount() {
        // Don't load here — wait for first tab activation via activate().
        // This avoids a network request on every page load.
        this._setupObserver();
    }

    componentWillUnmount() {
        if (this._observer) this._observer.disconnect();
    }

    // Called by PresetTab.refresh() when the tab becomes active.
    // Only triggers the initial data load once; subsequent activations are no-ops.
    activate() {
        if (this.hasLoaded) return;
        this.hasLoaded = true;
        this.reload();
    }

    // ── Infinite scroll ───────────────────────────────────────────

    _setupObserver() {
        this._observer = new IntersectionObserver(entries => {
            let entry = entries[0];
            if (!entry?.isIntersecting) return;
            if (!this._initialPageLoaded || this._isReloading || this._isLoadingMore) return;
            if (this.state.hasMore && !this.state.loading) {
                this._loadMore();
            }
        }, { threshold: 0.1 });
        if (this._sentinel.current) this._observer.observe(this._sentinel.current);
    }

    async _loadMore() {
        if (!this._initialPageLoaded || this._isReloading || this._isLoadingMore || this.state.loading || !this.state.hasMore) return;

        this._isLoadingMore = true;
        let reloadToken = this._reloadToken;
        let newOffset = this.state.offset + PAGE_SIZE;
        this.setState({ loading: true });

        try {
            let result = await presetApi.list(this._activeFilters(), newOffset);
            if (reloadToken !== this._reloadToken) return;

            if (result.ok) {
                this.setState(prev => ({
                    presets: [...prev.presets, ...result.presets],
                    offset: newOffset,
                    hasMore: result.hasMore,
                    loading: false,
                }));
            } else {
                this.setState({ loading: false });
                if (result.error) alert(lang.get(result.error));
                if (result.error === 'preset.err_session_expired') this.setState({ currentUser: null });
            }
        } finally {
            this._isLoadingMore = false;
        }
    }

    // ── Data ──────────────────────────────────────────────────────

    _activeFilters() {
        let { search, char_id, weapon_id, party_ids, liked } = this.state.filters;
        let f = {};
        if (search)             f.search    = search;
        if (char_id)            f.char_id   = char_id;
        if (weapon_id)          f.weapon_id = weapon_id;
        if (party_ids.length)   f.party_ids = party_ids;
        if (liked)              f.liked     = true;
        return f;
    }

    _activeFilterCount() {
        let { search, char_id, weapon_id, party_ids, liked } = this.state.filters;
        return (search ? 1 : 0) + (char_id ? 1 : 0) + (weapon_id ? 1 : 0) + party_ids.length + (liked ? 1 : 0);
    }

    async reload() {
        let reloadToken = ++this._reloadToken;
        this._initialPageLoaded = false;
        this._isReloading = true;
        this._isLoadingMore = false;

        this.setState({ loading: true, offset: 0, hasMore: true });

        try {
            let result = await presetApi.list(this._activeFilters(), 0);
            if (reloadToken !== this._reloadToken) return;

            if (result.ok) {
                this._initialPageLoaded = true;
                this.setState({ presets: result.presets, offset: 0, hasMore: result.hasMore, loading: false });
            } else {
                this.setState({ loading: false, offset: 0 });
                if (result.error) alert(lang.get(result.error));
                if (result.error === 'preset.err_session_expired') this.setState({ currentUser: null });
            }
        } finally {
            if (reloadToken === this._reloadToken) {
                this._isReloading = false;
            }
        }
    }

    // ── Filters ───────────────────────────────────────────────────

    _setFilter(update, extra = {}) {
        this.setState(prev => ({
            filters: { ...prev.filters, ...update },
            ...extra,
        }), () => this.reload());
    }

    handleSearchChange(value) {
        clearTimeout(this.state.searchTimer);
        let timer = setTimeout(() => this._setFilter({ search: value || '' }), 350);
        this.setState({ searchTimer: timer, filters: { ...this.state.filters, search: value } });
    }

    handleCharFilter() {
        UI.CharSelectReact.show({
            showEmpty: true,
            callback: (char) => this._setFilter(
                { char_id: char ? char.getId() : null },
                { filterChar: char || null }
            ),
        });
    }

    handleWeaponFilter() {
        UI.WeaponSelectReact.show({
            changeWeaponType: true,
            selectedId: this.state.filters.weapon_id || 0,
            callback: (weapon) => this._setFilter(
                { weapon_id: weapon ? weapon.getId() : null },
                { filterWeapon: weapon || null }
            ),
        });
    }

    handleAddPartyFilter() {
        let existing = this.state.filters.party_ids;
        if (existing.length >= MAX_PARTY_FILTERS) return;

        UI.CharSelectReact.show({
            showEmpty: false,
            callback: (char) => {
                if (!char) return;
                let id = char.getId();
                if (existing.includes(id)) return; // already selected
                let newIds   = [...existing, id];
                let newChars = [...this.state.filterPartyChars, char];
                this._setFilter({ party_ids: newIds }, { filterPartyChars: newChars });
            },
        });
    }

    handleRemovePartyFilter(id) {
        let newIds   = this.state.filters.party_ids.filter(pid => pid !== id);
        let newChars = this.state.filterPartyChars.filter(c => c.getId() !== id);
        this._setFilter({ party_ids: newIds }, { filterPartyChars: newChars });
    }

    handleClearFilters() {
        this.setState({
            filters: { search: '', char_id: null, weapon_id: null, party_ids: [], liked: false },
            filterChar: null, filterWeapon: null, filterPartyChars: [],
        }, () => this.reload());
    }

    // ── Auth ──────────────────────────────────────────────────────

    handleLoginClick() {
        if (this.state.currentUser) {
            presetApi.logout().then(() => this.setState({ currentUser: null }));
        } else {
            this.loginModal.show((username) => this.setState({ currentUser: username }));
        }
    }

    // ── Preset actions ────────────────────────────────────────────

    handleSaveClick() {
        this.saveModal.show((data) => this.handleSaveConfirm(data));
    }

    async handleSaveConfirm(data) {
        let currentBuild = this.props.app.currentSet().clone();
        currentBuild.clearArtifacts();

        let charId   = currentBuild.getChar()?.object?.getId() ?? null;
        let weaponId = currentBuild.getWeapon()?.object?.getId() ?? null;
        let partyIds = currentBuild.getPartyChars?.() ?? [];

        let result = await presetApi.save({
            title:       data.name,
            description: data.description,
            char_id:     String(charId),
            weapon_id:   weaponId ? String(weaponId) : undefined,
            party_ids:   partyIds,
            data_blob:   Serializer.pack(currentBuild),
        });

        if (!result.ok) {
            alert(lang.get('preset.err_save') + ': ' + lang.get(result.error || 'preset.err_unknown'));
            if (result.error === 'preset.err_session_expired') this.setState({ currentUser: null });
            return;
        }
        this.reload();
    }

    handleLoadPreset(preset) {
        UI.ConfirmWindow.show('modal.confirm', 'share_view.confirm_load', () => {
            let dataArray = Serializer.unpack(preset.data_blob);
            let buildObj  = CalcSet.deserialize(dataArray);
            if (buildObj) this.props.app.replaceSet(buildObj);
        });
    }

    async handleDeletePreset(presetId) {
        UI.ConfirmWindow.show('modal.confirm', 'preset.confirm_delete', async () => {
            let result = await presetApi.delete(presetId);
            if (result.ok) {
                this.setState(prev => ({ presets: prev.presets.filter(p => p.id !== presetId) }));
            } else {
                alert(lang.get(result.error));
                if (result.error === 'preset.err_session_expired') this.setState({ currentUser: null });
            }
        });
    }

    handleLike(presetId, liked, likes) {
        this.setState(prev => ({
            presets: prev.presets.map(p =>
                p.id === presetId ? { ...p, liked_by_user: liked, likes } : p
            ),
        }));
    }

    // ── Render ────────────────────────────────────────────────────

    render() {
        let { presets, loading, hasMore, offset, currentUser, filters, filterChar, filterWeapon, filterPartyChars } = this.state;
        let isLoggedIn  = !!currentUser;
        let activeCount = this._activeFilterCount();

        return (
            <ReactTab title={this.props.title}>
                <FullHeight addClass="preset-view">
                    <FullHeightStatic>
                        {/* Top action bar */}
                        <ControlsBar>
                            {isLoggedIn ? (
                                <TitledButton icon="icon-ok" title={lang.get('preset.btn_save')} onClick={() => this.handleSaveClick()} />
                            ) : null}
                            <ControlsBarDivider />
                            <TitledButton
                                icon={isLoggedIn ? "icon-cancel" : "icon-user"}
                                title={isLoggedIn ? `${lang.get('preset.btn_logout')} (${currentUser})` : lang.get('preset.btn_login')}
                                onClick={() => this.handleLoginClick()}
                            />
                        </ControlsBar>

                        {/* Flat filter panel — no accordion */}
                        <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid #D3BC8E22' }}>
                            {/* Row 1: search */}
                            <TextInputWithButton
                                barClass="resizable"
                                placeholder={lang.get('preset.search_placeholder')}
                                value={filters.search}
                                onChange={(v) => this.handleSearchChange(v)}
                                buttonVisible={false}
                            />

                            {/* Row 2: selector buttons + party chips */}
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <FilterButton
                                    label={lang.get('preset.filter_char')}
                                    active={!!filters.char_id}
                                    activeLabel={filterChar ? UI.Lang.get(filterChar.getName()) : null}
                                    onClick={() => this.handleCharFilter()}
                                    onRemove={filters.char_id ? () => this._setFilter({ char_id: null }, { filterChar: null }) : null}
                                />
                                <FilterButton
                                    label={lang.get('preset.filter_weapon')}
                                    active={!!filters.weapon_id}
                                    activeLabel={filterWeapon ? UI.Lang.get(filterWeapon.getName()) : null}
                                    onClick={() => this.handleWeaponFilter()}
                                    onRemove={filters.weapon_id ? () => this._setFilter({ weapon_id: null }, { filterWeapon: null }) : null}
                                />

                                {/* Party member tags — one per selected, plus add button */}
                                {filterPartyChars.map(pc => (
                                    <FilterButton
                                        key={pc.getId()}
                                        label={UI.Lang.get(pc.getName())}
                                        active={true}
                                        onRemove={() => this.handleRemovePartyFilter(pc.getId())}
                                    />
                                ))}
                                {filters.party_ids.length < MAX_PARTY_FILTERS && (
                                    <FilterButton
                                        label={filters.party_ids.length === 0 ? lang.get('preset.filter_party') : lang.get('preset.filter_party_add')}
                                        active={false}
                                        onClick={() => this.handleAddPartyFilter()}
                                    />
                                )}

                                {isLoggedIn && (
                                    <FilterButton
                                        label={lang.get('preset.filter_liked')}
                                        active={filters.liked}
                                        onClick={() => this._setFilter({ liked: !filters.liked })}
                                    />
                                )}
                                {activeCount > 0 && (
                                    <FilterButton label={lang.get('preset.filter_clear')} onClick={() => this.handleClearFilters()} />
                                )}
                            </div>
                        </div>
                    </FullHeightStatic>

                    <FullHeightScrollable noPadding={true}>
                        <div className="char-list">
                            {presets.map(preset => (
                                <div key={preset.id} className="item">
                                    <PresetCard
                                        preset={preset}
                                        currentUser={currentUser}
                                        onLoad={() => this.handleLoadPreset(preset)}
                                        onDelete={() => this.handleDeletePreset(preset.id)}
                                        onLike={(liked, likes) => this.handleLike(preset.id, liked, likes)}
                                    />
                                </div>
                            ))}
                            <div ref={this._sentinel} style={{ height: 1 }} />
                            {!loading && !hasMore && presets.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#D3BC8E', opacity: 0.5 }}>{lang.get('preset.no_presets')}</div>
                            )}
                        </div>
                    </FullHeightScrollable>
                </FullHeight>

                <PresetSaveModal ref={obj => this.saveModal = obj} />
                <LoginModal ref={obj => this.loginModal = obj} />
            </ReactTab>
        );
    }
}

// ─── Filter button ────────────────────────────────────────────────────────────
// Fixed size. active=true tints the border. onRemove shows an × close affordance.

function FilterButton({ label, active, activeLabel, onClick, onRemove }) {
    return (
        <div
            style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '2px 8px',
                cursor: onClick ? 'pointer' : 'default',
                border: `1px solid ${active ? '#D3BC8E' : '#D3BC8E55'}`,
                background: active ? '#D3BC8E1A' : 'transparent',
                color: active ? '#D3BC8E' : '#D3BC8E99',
                fontSize: '12px',
                borderRadius: '3px',
                userSelect: 'none',
                whiteSpace: 'nowrap',
            }}
            onClick={onClick}
        >
            {active && activeLabel ? `${label}: ${activeLabel}` : label}
            {onRemove && (
                <span
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    style={{ marginLeft: '3px', opacity: 0.7, cursor: 'pointer', lineHeight: 1 }}
                >
                    ×
                </span>
            )}
        </div>
    );
}

// ─── Preset card ──────────────────────────────────────────────────────────────

class PresetCard extends React.Component {
    constructor(props) {
        super(props);
        this.state = { showDesc: false };
    }

    async handleLikeClick(e) {
        e.stopPropagation();
        let result = await presetApi.like(this.props.preset.id);
        if (result.ok) {
            this.props.onLike(result.liked, result.likes);
        } else {
            alert(lang.get(result.error));
        }
    }

    render() {
        let preset = this.props.preset;

        let buildObj;
        try {
            let dataArray = Serializer.unpack(preset.data_blob);
            buildObj = CalcSet.deserialize(dataArray);
        } catch (_) {}
        if (!buildObj) return null;

        let char       = buildObj.getChar()?.object;
        let weapon     = buildObj.getWeapon()?.object;
        let partyIds   = buildObj.getPartyChars?.()?.slice(0, 3) ?? [];
        let partyChars = partyIds.map(id => DB.Chars.getById(id)).filter(Boolean);

        let isOwn      = this.props.currentUser && preset.submitter === this.props.currentUser;
        let liked      = !!preset.liked_by_user;
        let isLoggedIn = !!this.props.currentUser;

        return (
            <div className="char-info preset-card">
                {/* Clickable area: loads the preset */}
                <div className="line" onClick={this.props.onLoad} style={{ cursor: 'pointer', alignItems: 'center' }}>
                    <div style={{ flexShrink: 0 }}>
                        <CharIcon char={char} size={80} />
                    </div>
                    <div className="data" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '12px', justifyContent: 'center' }}>
                        {/* Title + submitter */}
                        <div className="name" style={{ height: 'auto', lineHeight: 'normal', padding: '0' }}>
                            <div className="name-title" style={{ alignItems: 'baseline' }}>
                                <div className="title">{preset.title}</div>
                                <div className="level" style={{ marginLeft: 'auto', flexShrink: 0 }}>{preset.submitter}</div>
                            </div>
                        </div>

                        {/* Weapon + party + action buttons */}
                        <div className="items" style={{ alignItems: 'center' }}>
                            {weapon && <WeaponIcon key='weapon' weapon={weapon} size="40" addClass="char-info-item-icon" />}
                            {partyChars.length > 0 && (
                                <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                                    {partyChars.map(pc => <CharIcon key={pc.getId()} char={pc} size={40} />)}
                                </div>
                            )}
                            <div className="flex-spacer" />

                            {/* ── Action buttons ── all uniform 32px round, stop click propagation */}
                            <div
                                className="preset-card-actions"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Like */}
                                <div
                                    className={'line-button' + (liked ? ' liked' : '')}
                                    title={isLoggedIn ? (liked ? lang.get('preset.btn_unlike') : lang.get('preset.btn_like')) : lang.get('preset.login_to_like')}
                                    style={{ cursor: isLoggedIn ? 'pointer' : 'default', opacity: isLoggedIn ? 1 : 0.45 }}
                                    onClick={isLoggedIn ? (e) => { e.stopPropagation(); this.handleLikeClick(e); } : undefined}
                                >
                                    {liked ? '♥' : '♡'}
                                </div>
                                <span className="preset-card-like-count">{preset.likes ?? 0}</span>

                                {/* Info / description */}
                                <div
                                    className="line-button"
                                    title={lang.get('preset.desc_title')}
                                    style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 'bold' }}
                                    onClick={(e) => { e.stopPropagation(); this.setState({ showDesc: true }); }}
                                >
                                    i
                                </div>

                                {/* Delete — only for own presets */}
                                {isOwn && (
                                    <div
                                        className="line-button icon-delete"
                                        title={lang.get('preset.confirm_delete')}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            this.props.onDelete();
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogContainer
                    width={400}
                    isVisible={this.state.showDesc}
                    title={lang.get('preset.desc_title')}
                    closeCallback={() => this.setState({ showDesc: false })}
                >
                    <div style={{ padding: '10px 15px 20px 15px', fontSize: '14px', color: '#FFF7E9', whiteSpace: 'pre-wrap', lineHeight: '1.4', wordBreak: 'break-word', overflowWrap: 'break-word', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#D3BC8E', marginBottom: '8px' }}>
                            {preset.title}
                        </div>
                        <div>
                            {preset.description || lang.get('preset.desc_empty')}
                        </div>
                    </div>
                </DialogContainer>
            </div>
        );
    }
}

// ─── Save modal ───────────────────────────────────────────────────────────────

class PresetSaveModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = { isVisible: false, formName: '', formDescription: '' };
    }

    show(saveCallback) {
        this.saveCallback = saveCallback;
        this.setState({ isVisible: true, formName: '', formDescription: '' });
    }

    handleSave() {
        if (this.saveCallback) {
            this.saveCallback({ name: this.state.formName || lang.get('preset.unnamed'), description: this.state.formDescription || '' });
        }
        this.setState({ isVisible: false });
    }

    handleClose() { this.setState({ isVisible: false }); }

    render() {
        return (
            <DialogContainer addClass="preset-save-modal" width={500} isVisible={this.state.isVisible} title={lang.get('preset.save_modal_title')} closeCallback={() => this.handleClose()}>
                <div style={{ padding: '10px 15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <div style={{ marginBottom: '5px', color: '#D3BC8E' }}>{lang.get('preset.save_name')}</div>
                        <TextInputWithButton barClass="resizable" value={this.state.formName} onChange={(v) => this.setState({ formName: v })} buttonVisible={false} />
                    </div>
                    <div>
                        <div style={{ marginBottom: '5px', color: '#D3BC8E' }}>{lang.get('preset.save_desc')}</div>
                        <textarea className="inputs-text" style={{ width: '100%', minHeight: '80px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'Genshin, sans-serif' }} value={this.state.formDescription} onChange={(e) => this.setState({ formDescription: e.target.value })} />
                    </div>
                </div>
                <ControlsBar>
                    <ControlsBarDivider />
                    <TitledButton icon="icon-ok" title={lang.get('modal_buttons.confirm')} onClick={() => this.handleSave()} />
                    <TitledButton icon="icon-cancel" title={lang.get('modal_buttons.cancel')} onClick={() => this.handleClose()} />
                </ControlsBar>
            </DialogContainer>
        );
    }
}

// ─── Login modal ──────────────────────────────────────────────────────────────

class LoginModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = { isVisible: false, loading: false, error: '', formKey: 0 };
    }

    show(successCallback) {
        this.successCallback = successCallback;
        this.setState(prev => ({ isVisible: true, error: '', loading: false, formKey: prev.formKey + 1 }));
        this.pendingAction = 'login';
    }

    handleClose() { this.setState({ isVisible: false }); }

    submitAction(action) {
        this.pendingAction = action;
        if (this.submitBtn) this.submitBtn.click();
    }

    async handleAction(e) {
        e.preventDefault();
        this.setState({ loading: true, error: '' });

        let action = this.pendingAction || 'login';
        let username = e.target.username.value;
        let password = e.target.password.value;

        try {
            let result;
            if (action === 'login') {
                result = await presetApi.login(username, password);
                if (!result.ok) { this.setState({ loading: false, error: lang.get(result.error) }); return; }
                if (this.successCallback) this.successCallback(result.username);
                this.setState({ isVisible: false, loading: false });
            } else {
                result = await presetApi.register(username, password);
                if (!result.ok) { this.setState({ loading: false, error: lang.get(result.error) }); return; }
                this.setState({ error: lang.get('preset.msg_registered'), loading: false });
            }
        } catch (err) {
            this.setState({ loading: false, error: lang.get('preset.err_unknown') });
        }
    }

    render() {
        return (
            <DialogContainer width={400} isVisible={this.state.isVisible} title={lang.get('preset.login_modal_title')} closeCallback={() => this.handleClose()}>
                <form key={this.state.formKey} onSubmit={(e) => this.handleAction(e)} style={{ margin: 0 }}>
                    <div style={{ padding: '10px 15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <div style={{ marginBottom: '5px', color: '#D3BC8E' }}>{lang.get('preset.username')}</div>
                            <input type="text" name="username" autoComplete="username" className="inputs-text" style={{ width: '100%', boxSizing: 'border-box', height: '30px', padding: '0 10px' }} defaultValue="" />
                        </div>
                        <div>
                            <div style={{ marginBottom: '5px', color: '#D3BC8E' }}>{lang.get('preset.password')}</div>
                            <input type="password" name="password" autoComplete="current-password" className="inputs-text" style={{ width: '100%', boxSizing: 'border-box', height: '30px', padding: '0 10px' }} defaultValue="" />
                        </div>
                        {this.state.error
                            ? <div style={{ color: '#ff5d4e', textAlign: 'center', fontSize: '14px', height: '14px' }}>{this.state.error}</div>
                            : <div style={{ height: '24px' }} />}
                    </div>
                    <button ref={b => this.submitBtn = b} type="submit" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                    <ControlsBar>
                        <ControlsBarDivider />
                        <TitledButton icon="icon-ok"   title={lang.get('preset.btn_login')}    onClick={() => this.submitAction('login')} />
                        <TitledButton icon="icon-edit" title={lang.get('preset.btn_register')} onClick={() => this.submitAction('register')} />
                    </ControlsBar>
                </form>
            </DialogContainer>
        );
    }
}
