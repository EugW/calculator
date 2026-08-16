// ── Auth endpoints ──────────────────────────────────────────────
const API_AUTH_LOGIN    = '/api/auth/login';
const API_AUTH_REGISTER = '/api/auth/register';
const API_AUTH_LOGOUT   = '/api/auth/logout';
const API_AUTH_REFRESH  = '/api/auth/refresh';

// ── Preset endpoints ─────────────────────────────────────────────
const API_PRESETS      = '/api/presets';
const API_PRESET_LIKE  = '/api/presets/<id>/like';
const API_PRESET_ONE   = '/api/presets/<id>';

export class PresetApi {
    // ── helpers ──────────────────────────────────────────────────

    _getToken() {
        return localStorage.getItem('preset_auth_token');
    }

    async _fetchWithRetry(url, options, withAuth = false) {
        options.headers = options.headers || {};
        if (withAuth) {
            let token = this._getToken();
            if (token) options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        let res;
        try {
            res = await fetch(url, options);
        } catch (e) {
            return { ok: false, data: { error: 'preset.err_fetch' } };
        }

        if (withAuth && (res.status === 401 || res.status === 403) && url !== API_AUTH_REFRESH) {
            let refreshOk = await this.refresh();
            if (refreshOk) {
                let token = this._getToken();
                if (token) options.headers['Authorization'] = `Bearer ${token}`;
                try {
                    res = await fetch(url, options);
                } catch (e) {
                    return { ok: false, data: { error: 'preset.err_fetch' } };
                }
            } else {
                await this.logout();
                return { ok: false, data: { error: 'preset.err_session_expired' } };
            }
        }

        let data; try { data = await res.json(); } catch (_) { data = null; }
        return { ok: res.ok, status: res.status, data };
    }

    async _post(url, body, withAuth = false) {
        return this._fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, withAuth);
    }

    async _get(url, withAuth = false) {
        return this._fetchWithRetry(url, { method: 'GET' }, withAuth);
    }

    async _delete(url) {
        return this._fetchWithRetry(url, { method: 'DELETE' }, true);
    }

    // ── Auth ─────────────────────────────────────────────────────

    async login(username, password) {
        let { ok, data } = await this._post(API_AUTH_LOGIN, { username, password });
        if (!ok) return { ok: false, error: data?.error ? `preset.err_backend_${data.error.toLowerCase().replace(/\s+/g, '_')}` : 'preset.err_login' };
        localStorage.setItem('preset_auth_username', data.username);
        localStorage.setItem('preset_auth_token', data.accessToken);
        return { ok: true, username: data.username };
    }

    async register(username, password) {
        let { ok, data } = await this._post(API_AUTH_REGISTER, { username, password });
        if (!ok) return { ok: false, error: data?.error ? `preset.err_backend_${data.error.toLowerCase().replace(/\s+/g, '_')}` : 'preset.err_register' };
        return { ok: true };
    }

    async logout() {
        await fetch(API_AUTH_LOGOUT, { method: 'POST' }).catch(() => {});
        localStorage.removeItem('preset_auth_username');
        localStorage.removeItem('preset_auth_token');
    }

    async refresh() {
        let { ok, data } = await this._post(API_AUTH_REFRESH, {});
        if (ok && data?.accessToken) {
            localStorage.setItem('preset_auth_token', data.accessToken);
            return true;
        }
        return false;
    }

    // ── Presets ───────────────────────────────────────────────────

    /**
     * Fetch a page of presets.
     * @param {{ search?: string, char_id?: string|number, weapon_id?: string|number, party_id?: string|number }} filters
     * @param {number} offset  Pagination offset (default 0).
     */
    async list(filters = {}, offset = 0) {
        let params = new URLSearchParams();
        if (filters.search)    params.set('search',    String(filters.search));
        if (filters.char_id)   params.set('char_id',   String(filters.char_id));
        if (filters.weapon_id) params.set('weapon_id', String(filters.weapon_id));
        if (filters.party_ids && filters.party_ids.length > 0) {
            for (let pid of filters.party_ids) {
                params.append('party_id', String(pid));
            }
        }
        if (filters.liked)     params.set('liked',     'true');
        params.set('offset', String(offset));

        let url = API_PRESETS + '?' + params.toString();
        let { ok, data } = await this._get(url, /* withAuth */ true);

        if (!ok) return { ok: false, presets: [], total: 0, hasMore: false, error: data?.error ? `preset.err_backend_${data.error.toLowerCase().replace(/\s+/g, '_')}` : 'preset.err_fetch' };
        return { ok: true, presets: data.presets ?? [], total: data.total ?? 0, hasMore: data.hasMore ?? false };
    }

    /**
     * Save a new preset for the currently logged-in user.
     * @param {{ title: string, description?: string, char_id: string|number, weapon_id?: string|number, party_ids?: number[], data_blob: string }} preset
     */
    async save(preset) {
        let { ok, data } = await this._post(API_PRESETS, preset, /* withAuth */ true);
        if (!ok) return { ok: false, error: data?.error ? `preset.err_backend_${data.error.toLowerCase().replace(/\s+/g, '_')}` : 'preset.err_save' };
        return { ok: true, preset_id: data.preset_id };
    }

    /**
     * Toggle like on a preset. Returns updated liked state and count.
     * @param {number} presetId
     */
    async like(presetId) {
        let url = API_PRESET_LIKE.replace('<id>', String(presetId));
        let { ok, data } = await this._post(url, {}, /* withAuth */ true);
        if (!ok) return { ok: false, error: data?.error ? `preset.err_backend_${data.error.toLowerCase().replace(/\s+/g, '_')}` : 'preset.err_unknown' };
        return { ok: true, liked: data.liked, likes: data.likes };
    }

    /**
     * Delete your own preset.
     * @param {number} presetId
     */
    async delete(presetId) {
        let url = API_PRESET_ONE.replace('<id>', String(presetId));
        let { ok, data } = await this._delete(url);
        if (!ok) return { ok: false, error: data?.error ? `preset.err_backend_${data.error.toLowerCase().replace(/\s+/g, '_')}` : 'preset.err_unknown' };
        return { ok: true };
    }
}
