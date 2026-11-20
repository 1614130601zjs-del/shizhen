/**
 * 拾帧世界书管理器 v2
 * 唯一允许修改酒馆真实全局世界书挂载状态与条目 disable 状态的模块。
 * 其他功能不得导入本模块，也不得调用这里的写入方法。
 */
import {
    world_info,
    world_names,
    selected_world_info,
    updateWorldInfoList,
    saveWorldInfo,
} from '/scripts/world-info.js';
import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types, getRequestHeaders, saveSettingsDebounced } from '/script.js';

const LOG = '[拾帧·世界书管理]';
const SCHEMA_VERSION = 4;

function currentCardIdentity() {
    try {
        const context = getContext() || {};
        // 群聊不归属于某一张单独角色卡，必须继续使用通用兜底。
        if (context.groupId != null && String(context.groupId).trim() !== '') {
            return { key: '', name: '群聊（通用兜底）' };
        }

        // 不同酒馆版本/初始化时机暴露当前角色索引的位置可能不同，按可靠性依次兜底。
        const rawId = context.characterId ?? window.this_chid ?? globalThis.this_chid;
        let id = Number(rawId);
        let character = Number.isInteger(id) && id >= 0
            ? (context.characters?.[id] || window.characters?.[id] || null)
            : null;

        // 部分上下文会直接提供当前角色对象。
        character ||= context.character || context.currentCharacter || null;

        // 索引暂不可用时，只有在角色名唯一匹配时才回退，避免误绑定到群聊/错误角色。
        if (!character) {
            const currentName = String(context.name2 || context.characterName || '').trim();
            const roster = Array.isArray(context.characters) ? context.characters
                : (Array.isArray(window.characters) ? window.characters : []);
            if (currentName) {
                const matches = roster.filter(item => String(item?.name || '').trim() === currentName);
                if (matches.length === 1) character = matches[0];
            }
        }

        const avatar = String(character?.avatar || '').trim();
        if (!avatar) return { key: '', name: String(character?.name || context.name2 || '通用兜底') };
        return { key: avatar, name: String(character?.name || context.name2 || avatar) };
    } catch {
        return { key: '', name: '通用兜底' };
    }
}

function profileDefaults() {
    return { mode: 'pair', coreBooks: { pair: '', group: '' }, worldviewBook: '', worldview: '', enabled: false, worldviewEntryOverrides: {}, entryOverrides: {} };
}
const WORLDVIEW_PREFIX = '世界观｜';

const post = async (path, body = {}) => {
    const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getRequestHeaders() },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`请求失败：${path}（HTTP ${response.status}）`);
    return response.json();
};

function settingsOf(cfg) {
    const root = cfg();
    if (!root.worldbookModeManager || typeof root.worldbookModeManager !== 'object') root.worldbookModeManager = {};
    const manager = root.worldbookModeManager;
    if (manager.schemaVersion !== SCHEMA_VERSION) {
        const previousVersion = Number(manager.schemaVersion) || 0;
        if (previousVersion < 2) {
            const legacyStates = manager.originalGlobalStates && typeof manager.originalGlobalStates === 'object' ? { ...manager.originalGlobalStates } : {};
            manager.legacyRestoreStates = { ...(manager.legacyRestoreStates || {}), ...legacyStates };
            manager.enabled = false; manager.coreBooks = { pair: '', group: '' }; manager.worldviewBook = ''; manager.worldview = '';
            manager.originalGlobalStates = {}; manager.originalEntryStates = {};
        }
        manager.schemaVersion = SCHEMA_VERSION;
        saveSettingsDebounced();
    }
    if (!manager.defaultProfile || typeof manager.defaultProfile !== 'object') {
        const legacy = profileDefaults();
        for (const key of ['mode', 'coreBooks', 'worldviewBook', 'worldview', 'enabled', 'worldviewEntryOverrides']) {
            if (manager[key] !== undefined) legacy[key] = manager[key];
        }
        manager.defaultProfile = legacy;
    }
    if (!manager.cardProfiles || typeof manager.cardProfiles !== 'object') manager.cardProfiles = {};
    if (!manager.originalGlobalStates || typeof manager.originalGlobalStates !== 'object') manager.originalGlobalStates = {};
    if (!manager.originalEntryStates || typeof manager.originalEntryStates !== 'object') manager.originalEntryStates = {};
    if (!manager.legacyRestoreStates || typeof manager.legacyRestoreStates !== 'object') manager.legacyRestoreStates = {};
    const identity = currentCardIdentity();
    const stored = identity.key ? manager.cardProfiles[identity.key] : null;
    const profile = stored?.profileType === 'independent' ? stored : manager.defaultProfile;
    if (!['pair', 'group'].includes(profile.mode)) profile.mode = 'pair';
    if (!profile.coreBooks || typeof profile.coreBooks !== 'object') profile.coreBooks = { pair: '', group: '' };
    if (typeof profile.coreBooks.pair !== 'string') profile.coreBooks.pair = '';
    if (typeof profile.coreBooks.group !== 'string') profile.coreBooks.group = '';
    if (typeof profile.worldviewBook !== 'string') profile.worldviewBook = '';
    if (typeof profile.worldview !== 'string') profile.worldview = '';
    if (typeof profile.enabled !== 'boolean') profile.enabled = false;
    if (!profile.worldviewEntryOverrides || typeof profile.worldviewEntryOverrides !== 'object') profile.worldviewEntryOverrides = {};
    if (!profile.entryOverrides || typeof profile.entryOverrides !== 'object') profile.entryOverrides = {};
    Object.defineProperties(profile, {
        originalGlobalStates: { value: manager.originalGlobalStates, writable: true, configurable: true },
        originalEntryStates: { value: manager.originalEntryStates, writable: true, configurable: true },
        legacyRestoreStates: { value: manager.legacyRestoreStates, writable: true, configurable: true },
        _profileKey: { value: stored?.profileType === 'independent' ? identity.key : '*', writable: true, configurable: true },
        _profileName: { value: identity.name, writable: true, configurable: true },
        _profileMode: { value: stored?.profileType === 'independent' ? 'independent' : 'inherit', writable: true, configurable: true },
    });
    return profile;
}

const isGlobalOn = name => Array.isArray(selected_world_info) && selected_world_info.includes(name);

async function refreshGlobalList() {
    const $ = window.jQuery;
    const $wi = $ ? $('#world_info') : null;
    const hasOptions = Boolean($wi?.length && $wi.find('option[value!=""]').length > 0);
    const hasNames = Array.isArray(world_names) && world_names.length > 0;
    if (!hasOptions || !hasNames) await updateWorldInfoList();
}

function syncNativeWorldInfoSelect() {
    const $ = window.jQuery;
    if (!$) return false;
    const $wi = $('#world_info');
    if (!$wi.length || !Array.isArray(world_names) || world_names.length === 0) return false;
    $wi.find('option').each(function () {
        const optionName = String($(this).text() || '');
        $(this).prop('selected', selected_world_info.includes(optionName));
    });
    $wi.trigger('change');
    return true;
}

async function setGlobalBook(name, on) {
    if (!name) return;
    await refreshGlobalList();
    const before = isGlobalOn(name);
    if (before === Boolean(on)) return;
    if (on) {
        if (!selected_world_info.includes(name)) selected_world_info.push(name);
    } else {
        for (let i = selected_world_info.length - 1; i >= 0; i--) {
            if (selected_world_info[i] === name) selected_world_info.splice(i, 1);
        }
    }
    const usedNativeChannel = syncNativeWorldInfoSelect();
    if (!world_info || typeof world_info !== 'object') throw new Error('当前酒馆未提供 world_info 状态对象');
    world_info.globalSelect = [...selected_world_info];
    saveSettingsDebounced();
    if (!usedNativeChannel) {
        try { await eventSource.emit(event_types.WORLDINFO_SETTINGS_UPDATED); }
        catch (error) { console.warn(LOG, '世界书状态事件通知失败', error); }
    }
}

async function fetchBooks() {
    await refreshGlobalList();
    const rows = await post('/api/worldinfo/list');
    if (!Array.isArray(rows)) throw new Error('酒馆返回的世界书列表格式不正确');
    return rows.map(row => ({
        name: String(row.file_id || row.name || '').trim(),
        title: String(row.name || row.file_id || '').trim(),
    })).filter(row => row.name);
}

async function fetchBook(name) {
    const data = await post('/api/worldinfo/get', { name });
    if (!data || !data.entries || typeof data.entries !== 'object') {
        throw new Error(`世界书「${name}」没有可识别的条目数据`);
    }
    return data;
}

function selectedBookNames(manager) {
    return [...new Set([
        manager.coreBooks.pair,
        manager.coreBooks.group,
        manager.worldviewBook,
    ].filter(Boolean))];
}

function worldviewEntries(data) {
    return Object.entries(data.entries || {})
        .filter(([, entry]) => String(entry?.comment || '').startsWith(WORLDVIEW_PREFIX))
        .map(([uid, entry]) => ({
            uid,
            name: String(entry.comment).slice(WORLDVIEW_PREFIX.length).trim(),
            entry,
        }))
        .filter(item => item.name);
}

function rememberGlobalState(manager, name) {
    if (name && typeof manager.originalGlobalStates[name] !== 'boolean') {
        manager.originalGlobalStates[name] = isGlobalOn(name);
    }
}

async function rememberEntryStates(manager, name) {
    if (!name || manager.originalEntryStates[name]) return;
    const data = await fetchBook(name);
    manager.originalEntryStates[name] = Object.fromEntries(
        Object.entries(data.entries).map(([uid, entry]) => [uid, Boolean(entry?.disable)])
    );
}

async function restoreBook(manager, name, preserveManualOverrides = true) {
    if (!name) return;
    if (Object.prototype.hasOwnProperty.call(manager.originalGlobalStates, name)) {
        await setGlobalBook(name, Boolean(manager.originalGlobalStates[name]));
        delete manager.originalGlobalStates[name];
    }
    const saved = manager.originalEntryStates[name];
    const overrides = preserveManualOverrides
        ? { ...(manager.entryOverrides[name] || {}), ...(manager.worldviewEntryOverrides[name] || {}) }
        : {};
    if (saved || Object.keys(overrides).length) {
        const data = await fetchBook(name);
        let changed = false;
        for (const [uid, entry] of Object.entries(data.entries)) {
            let desired;
            if (saved && Object.prototype.hasOwnProperty.call(saved, uid)) desired = Boolean(saved[uid]);
            if (Object.prototype.hasOwnProperty.call(overrides, uid)) desired = Boolean(overrides[uid]);
            if (typeof desired !== 'boolean') continue;
            if (Boolean(entry?.disable) !== desired) {
                entry.disable = desired;
                changed = true;
            }
        }
        if (changed) await saveWorldInfo(name, data, true);
        if (saved) delete manager.originalEntryStates[name];
    }
}

async function applyProfileEntryOverrides(manager) {
    for (const name of selectedBookNames(manager)) {
        const overrides = {
            ...(manager.entryOverrides?.[name] || {}),
            ...(manager.worldviewEntryOverrides?.[name] || {}),
        };
        if (!Object.keys(overrides).length) continue;
        await rememberEntryStates(manager, name);
        const data = await fetchBook(name);
        let changed = false;
        for (const [uid, disabled] of Object.entries(overrides)) {
            const entry = data.entries?.[uid];
            if (!entry) continue;
            if (Boolean(entry.disable) !== Boolean(disabled)) {
                entry.disable = Boolean(disabled);
                changed = true;
            }
        }
        if (changed) await saveWorldInfo(name, data, true);
    }
}

async function syncWorldviewEntry(manager, report = () => {}) {
    if (!manager.worldviewBook || !manager.worldview) return;
    const data = await fetchBook(manager.worldviewBook);
    await rememberEntryStates(manager, manager.worldviewBook);
    const matches = worldviewEntries(data);
    if (!matches.length) {
        throw new Error(`「${manager.worldviewBook}」中没有 comment 以“${WORLDVIEW_PREFIX}”开头的世界观条目`);
    }
    const chosen = matches.find(item => item.name === manager.worldview);
    if (!chosen) throw new Error(`世界观「${manager.worldview}」已不存在，请重新选择`);
    let changed = false;
    const overrides = manager.worldviewEntryOverrides[manager.worldviewBook] || {};
    for (const item of matches) {
        // 用户在条目管理中手动设置过的状态优先；自动单选只接管尚无手动覆盖的条目。
        const hasManualOverride = Object.prototype.hasOwnProperty.call(overrides, item.uid);
        const shouldDisable = hasManualOverride
            ? Boolean(overrides[item.uid])
            : item.uid !== chosen.uid;
        if (Boolean(item.entry.disable) !== shouldDisable) {
            item.entry.disable = shouldDisable;
            changed = true;
        }
    }
    if (changed) await saveWorldInfo(manager.worldviewBook, data, true);
    report(`已在「${manager.worldviewBook}」中启用世界观：${manager.worldview}`);
}

async function restoreAll(cfg, report = () => {}) {
    const manager = settingsOf(cfg);
    const names = new Set([
        ...Object.keys(manager.originalGlobalStates),
        ...Object.keys(manager.originalEntryStates),
    ]);
    for (const name of names) await restoreBook(manager, name);
    saveSettingsDebounced();
    report('已恢复拾帧接管前的全局挂载状态与世界观条目状态。');
}

async function applyMode(cfg, report = () => {}) {
    const manager = settingsOf(cfg);
    if (!manager.enabled) return restoreAll(cfg, report);
    const books = await fetchBooks();
    const available = new Set(books.map(book => book.name));
    const pair = manager.coreBooks.pair;
    const group = manager.coreBooks.group;
    const worldview = manager.worldviewBook;
    if (!pair || !group || !worldview) {
        throw new Error('请分别指定双人、群像和世界观特化三本世界书后再启用管理。');
    }
    if (!manager.worldview) {
        throw new Error('请先从世界观特化世界书中选择一个世界观。');
    }
    const assignments = [pair, group, worldview].filter(Boolean);
    if (new Set(assignments).size !== assignments.length) {
        throw new Error('双人、群像和世界观特化必须指定三本不同的世界书');
    }
    for (const name of assignments) {
        if (!available.has(name)) throw new Error(`指定的世界书「${name}」不存在，请刷新列表`);
        rememberGlobalState(manager, name);
    }
    if (worldview) await rememberEntryStates(manager, worldview);
    const activeCore = manager.mode === 'pair' ? pair : group;
    for (const name of assignments) {
        const desired = name === activeCore || name === worldview;
        await setGlobalBook(name, desired);
        if (isGlobalOn(name) !== desired) throw new Error(`世界书「${name}」全局挂载状态同步失败`);
    }
    saveSettingsDebounced();
    report(`已挂载「${manager.mode === 'pair' ? '双人' : '群像'}」核心世界书${worldview ? '，世界观特化书保持挂载' : ''}。`);
}

function statusText(host, text) {
    const el = host.querySelector('[data-wbm-status]');
    if (el) el.textContent = text;
}

function fillSelect(select, books, selected, placeholder) {
    if (!select) return;
    select.innerHTML = [
        `<option value="">${placeholder}</option>`,
        ...books.map(book => `<option value="${escapeAttr(book.name)}">${escapeHtml(book.title)}</option>`),
    ].join('');
    select.value = selected || '';
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(value) { return escapeHtml(value); }

async function renderWorldviewChoices(host, cfg, getProfile) {
    const manager = getProfile ? getProfile() : settingsOf(cfg);
    const select = host.querySelector('[data-wbm-worldview]');
    if (!select) return;
    if (!manager.worldviewBook) {
        select.innerHTML = '<option value="">先指定世界观特化世界书</option>';
        select.disabled = true;
        return;
    }
    try {
        const data = await fetchBook(manager.worldviewBook);
        const options = worldviewEntries(data);
        select.innerHTML = '<option value="">选择世界观…</option>' + options.map(item =>
            `<option value="${escapeAttr(item.name)}">${escapeHtml(item.name)}</option>`
        ).join('');
        select.disabled = !options.length;
        if (options.some(item => item.name === manager.worldview)) select.value = manager.worldview;
        else {
            manager.worldview = options[0]?.name || '';
            select.value = manager.worldview;
            saveSettingsDebounced();
        }
        if (!options.length) statusText(host, `这本书里没有找到以“${WORLDVIEW_PREFIX}”开头的条目。`);
    } catch (error) {
        select.innerHTML = '<option value="">读取世界观条目失败</option>';
        select.disabled = true;
        statusText(host, error?.message || String(error));
    }
}

async function renderEntryEditor(host, cfg, getProfile) {
    const manager = getProfile ? getProfile() : settingsOf(cfg);
    // 编辑目标可能是当前未激活的通用/角色配置；它不会经过 settingsOf()，因此在此补齐条目覆盖存储。
    if (!manager.entryOverrides || typeof manager.entryOverrides !== 'object') manager.entryOverrides = {};
    if (!manager.worldviewEntryOverrides || typeof manager.worldviewEntryOverrides !== 'object') manager.worldviewEntryOverrides = {};
    const target = host.querySelector('[data-wbm-entry-editor]');
    if (!target) return;
    const names = selectedBookNames(manager);
    if (!names.length) {
        target.innerHTML = '<p class="ql-muted">先指定双人、群像或世界观特化世界书，再编辑具体条目。</p>';
        return;
    }
    target.innerHTML = '<p class="ql-muted">正在读取已授权世界书的条目…</p>';
    try {
        const chunks = [];
        for (const name of names) {
            const data = await fetchBook(name);
            const entries = Object.entries(data.entries).sort((a, b) =>
                Number(a[1]?.order ?? 100) - Number(b[1]?.order ?? 100)
            );
            chunks.push(`<details class="ql-card" data-wbm-entry-book="${escapeAttr(name)}">
                <summary>${escapeHtml(name)} <span class="ql-muted">· ${entries.length} 个条目</span></summary>
                <div class="ql-wbm-entry-list">${entries.map(([uid, entry]) => {
                    const title = entry?.comment || (Array.isArray(entry?.key) ? entry.key.join('、') : '') || `UID ${uid}`;
                    const worldviewTag = String(entry?.comment || '').startsWith(WORLDVIEW_PREFIX) ? ' <span class="ql-muted">（世界观）</span>' : '';
                    const worldviewOverride = manager.worldviewEntryOverrides?.[name]?.[uid];
                    const entryOverride = manager.entryOverrides?.[name]?.[uid];
                    const isEnabled = typeof worldviewOverride === 'boolean' ? !worldviewOverride : typeof entryOverride === 'boolean' ? !entryOverride : !entry?.disable;
                    return `<label class="ql-check"><input type="checkbox" data-wbm-entry-toggle data-wbm-entry-book-name="${escapeAttr(name)}" data-wbm-entry-uid="${escapeAttr(uid)}" ${isEnabled ? 'checked' : ''}> ${escapeHtml(title)}${worldviewTag}</label>`;
                }).join('')}</div>
            </details>`);
        }
        target.innerHTML = chunks.join('');
        target.querySelectorAll('[data-wbm-entry-toggle]').forEach(toggle => {
            toggle.addEventListener('change', async () => {
                toggle.disabled = true;
                try {
                    const name = toggle.dataset.wbmEntryBookName;
                    const uid = toggle.dataset.wbmEntryUid;
                    const manager = getProfile ? getProfile() : settingsOf(cfg);
                    const isActive = manager === activeProfileRef;
                    if (isActive) await rememberEntryStates(manager, name);
                    const fresh = await fetchBook(name);
                    const entry = fresh.entries?.[uid];
                    if (!entry) throw new Error('条目已不存在，请刷新条目列表');
                    entry.disable = !toggle.checked;
                    if (!manager.entryOverrides[name] || typeof manager.entryOverrides[name] !== 'object') manager.entryOverrides[name] = {};
                    manager.entryOverrides[name][uid] = Boolean(entry.disable);
                    if (name === manager.worldviewBook && String(entry.comment || '').startsWith(WORLDVIEW_PREFIX)) {
                        if (!manager.worldviewEntryOverrides[name] || typeof manager.worldviewEntryOverrides[name] !== 'object') {
                            manager.worldviewEntryOverrides[name] = {};
                        }
                        // 显式记录用户手动开关，避免切换世界观或停用管理器时覆盖该选择。
                        manager.worldviewEntryOverrides[name][uid] = Boolean(entry.disable);
                    }
                    if (isActive) await saveWorldInfo(name, fresh, true);
                    saveSettingsDebounced();
                    statusText(host, isActive ? `已更新「${name}」中的条目：${entry.comment || uid}` : `已保存「${name}」中的条目设置；当前配置未生效，切换到该配置后再应用。`);
                } catch (error) {
                    toggle.checked = !toggle.checked;
                    statusText(host, error?.message || String(error));
                } finally {
                    toggle.disabled = false;
                }
            });
        });
    } catch (error) {
        target.textContent = error?.message || String(error);
    }
}

function renderBookSelectors(host, cfg, books, getProfile) {
    const manager = getProfile ? getProfile() : settingsOf(cfg);
    fillSelect(host.querySelector('[data-wbm-pair-book]'), books, manager.coreBooks.pair, '选择双人世界书…');
    fillSelect(host.querySelector('[data-wbm-group-book]'), books, manager.coreBooks.group, '选择群像世界书…');
    fillSelect(host.querySelector('[data-wbm-worldview-book]'), books, manager.worldviewBook, '选择世界观特化世界书…');
    const selected = [manager.coreBooks.pair, manager.coreBooks.group, manager.worldviewBook].filter(Boolean);
    const duplicate = new Set(selected).size !== selected.length;
    const hint = host.querySelector('[data-wbm-assignment-hint]');
    if (hint) hint.textContent = duplicate
        ? '三种用途必须指定不同的世界书，请调整重复选择。'
        : '只有这里指定的三本世界书属于拾帧管理范围，列表中的其他世界书不会被修改。';
}

export function initWorldbookModeManager({ root, cfg }) {
    const settingsPage = root?.querySelector('[data-page-panel="settings"]');
    if (!settingsPage || settingsPage.querySelector('[data-wbm-root]')) return;

    const panel = document.createElement('details');
    panel.className = 'ql-card';
    panel.open = false;
    panel.dataset.wbmRoot = '1';
    panel.innerHTML = `
        <summary>模式管理 · 世界书联动</summary>
        <p class="ql-muted">拾帧只管理你在下方明确指定的三本世界书。其他酒馆世界书及角色卡/聊天绑定不会被修改。</p>
        <div class="ql-card" data-wbm-profile-box>
            <strong data-wbm-profile-title>当前角色设置</strong><label for="ql-wbm-edit-target">配置范围</label><select id="ql-wbm-edit-target" data-wbm-edit-target><option value="current">当前角色设置</option><option value="global">通用设置</option></select>
            <p class="ql-muted">同一角色卡的所有聊天共用一份配置；角色卡身份按头像文件名区分。</p><p class="ql-muted" data-wbm-edit-hint>选择要查看或编辑的配置。</p>
            <div data-wbm-card-controls>
            <label>当前角色卡配置</label>
            <select data-wbm-profile-mode><option value="inherit">继承通用兜底</option><option value="independent">独立保存</option></select>
            <button type="button" class="menu_button" data-wbm-profile-reset>恢复通用设置</button>
            </div>
        </div>
        <label class="ql-check"><input type="checkbox" data-wbm-enabled> 启用拾帧世界书管理</label>
        <label for="ql-wbm-mode">核心构图模式</label>
        <select id="ql-wbm-mode" data-wbm-mode><option value="pair">双人</option><option value="group">群像</option></select>
        <div class="ql-wbm-assignment">
            <label>双人核心世界书</label>
            <select data-wbm-pair-book><option value="">先刷新世界书列表…</option></select>
            <label>群像核心世界书</label>
            <select data-wbm-group-book><option value="">先刷新世界书列表…</option></select>
            <label>世界观特化世界书（一书多世界观）</label>
            <select data-wbm-worldview-book><option value="">先刷新世界书列表…</option></select>
            <p class="ql-muted" data-wbm-assignment-hint>请选择三本不同的世界书。</p>
        </div>
        <label>当前世界观（从特化世界书的条目名称读取）</label>
        <select data-wbm-worldview disabled><option value="">先指定世界观特化世界书</option></select>
        <div class="ql-row">
            <button type="button" class="menu_button" data-wbm-refresh>刷新酒馆世界书</button>
            <button type="button" class="menu_button ql-primary" data-wbm-apply>应用当前模式</button>
        </div>
        <p class="ql-muted" data-wbm-status role="status">请先刷新列表并指定管理范围。</p>
        <details class="ql-card">
            <summary>条目管理 · 仅显示已指定的世界书</summary>
            <div data-wbm-entry-editor><p class="ql-muted">尚未指定世界书。</p></div>
        </details>
    `;
    settingsPage.prepend(panel);

    const manager = settingsOf(cfg);
    const enabled = panel.querySelector('[data-wbm-enabled]');
    const mode = panel.querySelector('[data-wbm-mode]');
    const pairSelect = panel.querySelector('[data-wbm-pair-book]');
    const groupSelect = panel.querySelector('[data-wbm-group-book]');
    const worldviewBookSelect = panel.querySelector('[data-wbm-worldview-book]');
    const worldviewSelect = panel.querySelector('[data-wbm-worldview]');
    enabled.checked = manager.enabled;
    mode.value = manager.mode;

    const refreshAssignedUi = async () => {
        await renderWorldviewChoices(panel, cfg, editingProfile);
        await renderEntryEditor(panel, cfg, editingProfile);
    };
    let activeProfileRef = manager;
    let editingProfileRef = manager;
    let cachedBooks = [];
    const editTargetSelect = panel.querySelector("[data-wbm-edit-target]");
    const editingProfile = () => editingProfileRef || activeProfileRef || settingsOf(cfg);
    const profileModeSelect = panel.querySelector('[data-wbm-profile-mode]');
    const profileTitle = panel.querySelector('[data-wbm-profile-title]');
    const profileReset = panel.querySelector('[data-wbm-profile-reset]');
    const editHint = panel.querySelector('[data-wbm-edit-hint]');
    const cardControls = panel.querySelector('[data-wbm-card-controls]');

    function paintProfileControls(profile = settingsOf(cfg)) {
        const identity = currentCardIdentity();
        const hasCard = Boolean(identity.key);
        if (profileTitle) profileTitle.textContent = hasCard ? `当前角色卡：${identity.name}` : '当前配置：通用兜底（尚未进入角色卡聊天）';
        if (profileModeSelect) {
            profileModeSelect.disabled = !hasCard;
            profileModeSelect.value = profile._profileMode || 'inherit';
        }
        if (profileReset) profileReset.disabled = !hasCard || profile._profileMode !== 'independent';
        if (editTargetSelect) {
            const currentOption = editTargetSelect.querySelector('option[value="current"]');
            if (currentOption) currentOption.disabled = !hasCard;
            if (!hasCard) editTargetSelect.value = 'global';
        }
    }

    async function selectEditingTarget(target) {
        const identity = currentCardIdentity();
        const rootSettings = cfg().worldbookModeManager;
        if (target === 'global' || !identity.key) {
            if (editTargetSelect) editTargetSelect.value = 'global';
            editingProfileRef = rootSettings.defaultProfile;
        }
        else {
            const stored = rootSettings.cardProfiles?.[identity.key];
            editingProfileRef = stored?.profileType === 'independent' ? stored : rootSettings.defaultProfile;
        }
        const isCurrentTarget = target === 'current' && Boolean(identity.key);
        if (cardControls) cardControls.hidden = !isCurrentTarget;
        const inherited = isCurrentTarget && editingProfileRef === rootSettings.defaultProfile;
        if (editHint) editHint.textContent = inherited ? '当前角色卡正在继承通用设置；在这里修改会同步影响所有继承通用设置的角色卡。可切换为独立保存后单独编辑。' : target === 'global' ? '正在编辑通用设置，不会改动角色卡的独立配置。' : '正在编辑当前角色卡的独立设置。';
        const m = editingProfile(); enabled.checked = m.enabled; mode.value = m.mode;
        renderBookSelectors(panel, cfg, cachedBooks, editingProfile); await refreshAssignedUi();
        const apply = panel.querySelector('[data-wbm-apply]'); if (apply) apply.disabled = editingProfileRef !== activeProfileRef;
    }
    editTargetSelect?.addEventListener('change', () => selectEditingTarget(editTargetSelect.value).catch(error => statusText(panel, error?.message || String(error))));

    async function leaveActiveProfile() {
        if (!activeProfileRef) return;
        const names = new Set([
            ...Object.keys(activeProfileRef.originalGlobalStates || {}),
            ...Object.keys(activeProfileRef.originalEntryStates || {}),
        ]);
        for (const name of names) await restoreBook(activeProfileRef, name, false);
        saveSettingsDebounced();
    }

    async function enterCurrentProfile() {
        const next = settingsOf(cfg);
        activeProfileRef = next;
        if (editTargetSelect?.value !== 'global') editingProfileRef = next;
        paintProfileControls(next);
        enabled.checked = editingProfile().enabled;
        mode.value = editingProfile().mode;
        renderBookSelectors(panel, cfg, cachedBooks, editingProfile);
        await refreshAssignedUi();
        for (const name of selectedBookNames(next)) await rememberEntryStates(next, name);
        await applyProfileEntryOverrides(next);
        if (next.enabled) {
            if (next.worldviewBook && next.worldview) await syncWorldviewEntry(next, message => statusText(panel, message));
            await applyMode(cfg, message => statusText(panel, message));
        } else {
            statusText(panel, '已切换配置；当前角色卡使用' + (next._profileMode === 'independent' ? '独立配置。' : '通用兜底设置。'));
        }
    }

    async function changeCardProfileMode(nextMode) {
        const identity = currentCardIdentity();
        if (!identity.key) throw new Error('请先进入一张角色卡的聊天，再设置角色卡独立配置。');
        await leaveActiveProfile();
        const rootSettings = cfg().worldbookModeManager;
        if (nextMode === 'independent') {
            const existing = rootSettings.cardProfiles[identity.key];
            if (!existing || existing.profileType !== 'independent') {
                const copy = JSON.parse(JSON.stringify(rootSettings.defaultProfile || profileDefaults()));
                copy.profileType = 'independent';
                rootSettings.cardProfiles[identity.key] = copy;
            }
        } else {
            delete rootSettings.cardProfiles[identity.key];
        }
        saveSettingsDebounced();
        await enterCurrentProfile();
    }

    profileModeSelect?.addEventListener('change', () => {
        changeCardProfileMode(profileModeSelect.value).catch(error => {
            paintProfileControls();
            statusText(panel, error?.message || String(error));
        });
    });
    profileReset?.addEventListener('click', () => {
        changeCardProfileMode('inherit').catch(error => statusText(panel, error?.message || String(error)));
    });

    if (event_types.CHARACTER_SELECTED) {
        eventSource.on(event_types.CHARACTER_SELECTED, async () => {
            try {
                // CHARACTER_SELECTED 可能早于酒馆上下文更新；等一帧再读取当前角色身份。
                await new Promise(resolve => requestAnimationFrame(resolve));
                const nextIdentity = currentCardIdentity();
                if ((nextIdentity.key || '*') === (activeProfileRef?._profileKey || '*')) {
                    paintProfileControls(settingsOf(cfg));
                    return;
                }
                await leaveActiveProfile();
                await enterCurrentProfile();
            } catch (error) {
                statusText(panel, `切换角色卡配置失败：${error?.message || String(error)}`);
            }
        });
    }

    // 设置面板可能在角色卡上下文尚未就绪时初始化；用户真正展开面板时重新识别一次。
    panel.addEventListener('toggle', () => {
        if (!panel.open) return;
        const identity = currentCardIdentity();
        if ((identity.key || '*') !== (activeProfileRef?._profileKey || '*')) {
            enterCurrentProfile().catch(error => statusText(panel, `载入当前角色卡配置失败：${error?.message || String(error)}`));
        } else {
            paintProfileControls(settingsOf(cfg));
        }
    });
    paintProfileControls(manager);
    selectEditingTarget(editTargetSelect?.value || (currentCardIdentity().key ? 'current' : 'global')).catch(error => statusText(panel, error?.message || String(error)));

    async function updateAssignment(key, value) {
        const m = editingProfile();
        const isActive = m === activeProfileRef;
        const before = new Set(selectedBookNames(m));
        const previousWorldviewBook = m.worldviewBook;
        const previousValue = key === 'pair' || key === 'group' ? m.coreBooks[key] : m.worldviewBook;
        if (key === 'pair' || key === 'group') m.coreBooks[key] = value;
        else m.worldviewBook = value;
        const rawAssignments = [m.coreBooks.pair, m.coreBooks.group, m.worldviewBook].filter(Boolean);
        const duplicate = new Set(rawAssignments).size !== rawAssignments.length;
        if (duplicate) {
            if (key === 'pair' || key === 'group') m.coreBooks[key] = previousValue;
            else m.worldviewBook = previousValue;
            renderBookSelectors(panel, cfg, cachedBooks, editingProfile);
            statusText(panel, '双人、群像和世界观特化必须指定三本不同的世界书。');
            return;
        }
        const after = new Set(selectedBookNames(m));
        if (isActive) for (const oldName of before) {
            if (!after.has(oldName)) await restoreBook(m, oldName);
        }
        if (m.worldviewBook !== previousWorldviewBook) m.worldview = '';
        if (m.enabled && isActive) {
            for (const name of after) rememberGlobalState(m, name);
            if (m.worldviewBook) await rememberEntryStates(m, m.worldviewBook);
        }
        saveSettingsDebounced();
        renderBookSelectors(panel, cfg, cachedBooks, editingProfile);
        await refreshAssignedUi();
        if (m.enabled && isActive) {
            if (m.worldviewBook && m.worldview) await syncWorldviewEntry(m, message => statusText(panel, message));
            await applyMode(cfg, message => statusText(panel, message));
        }
    }

    panel.querySelector('[data-wbm-refresh]').addEventListener('click', async () => {
        const button = panel.querySelector('[data-wbm-refresh]');
        button.disabled = true;
        statusText(panel, '正在读取酒馆世界书列表…');
        try {
            cachedBooks = await fetchBooks();
            renderBookSelectors(panel, cfg, cachedBooks, editingProfile);
            await refreshAssignedUi();
            statusText(panel, `已读取 ${cachedBooks.length} 本世界书。只有上方指定的三本会由拾帧管理。`);
        } catch (error) {
            statusText(panel, error?.message || String(error));
        } finally {
            button.disabled = false;
        }
    });

    pairSelect.addEventListener('change', () => updateAssignment('pair', pairSelect.value).catch(error => statusText(panel, error?.message || String(error))));
    groupSelect.addEventListener('change', () => updateAssignment('group', groupSelect.value).catch(error => statusText(panel, error?.message || String(error))));
    worldviewBookSelect.addEventListener('change', () => updateAssignment('worldview', worldviewBookSelect.value).catch(error => statusText(panel, error?.message || String(error))));

    worldviewSelect.addEventListener('change', async () => {
        const m = editingProfile();
        m.worldview = worldviewSelect.value;
        saveSettingsDebounced();
        try {
            if (m.enabled && m === activeProfileRef) {
                rememberGlobalState(m, m.worldviewBook);
                await syncWorldviewEntry(m, message => statusText(panel, message));
            }
            await renderEntryEditor(panel, cfg, editingProfile);
        } catch (error) {
            statusText(panel, error?.message || String(error));
        }
    });

    enabled.addEventListener('change', async () => {
        const m = editingProfile();
        const isActive = m === activeProfileRef;
        m.enabled = enabled.checked;
        if (m.enabled && isActive) {
            for (const name of selectedBookNames(m)) rememberGlobalState(m, name);
            if (m.worldviewBook) await rememberEntryStates(m, m.worldviewBook);
        }
        saveSettingsDebounced();
        try {
            if (isActive) {
                if (m.enabled && m.worldviewBook && m.worldview) await syncWorldviewEntry(m, message => statusText(panel, message));
                await applyMode(cfg, message => statusText(panel, message));
            }
        } catch (error) { statusText(panel, error?.message || String(error)); }
    });

    mode.addEventListener('change', async () => {
        const m = editingProfile();
        m.mode = mode.value;
        saveSettingsDebounced();
        if (m.enabled && m === activeProfileRef) {
            try { await applyMode(cfg, message => statusText(panel, message)); }
            catch (error) { statusText(panel, error?.message || String(error)); }
        }
    });

    panel.querySelector('[data-wbm-apply]').addEventListener('click', async () => {
        const button = panel.querySelector('[data-wbm-apply]');
        button.disabled = true;
        try {
            if (editingProfile() !== activeProfileRef) throw new Error('当前编辑的是未生效配置；请切换到当前角色设置后再应用。');
            if (!activeProfileRef.enabled) throw new Error('请先开启「启用拾帧世界书管理」');
            await applyMode(cfg, message => statusText(panel, message));
        } catch (error) {
            statusText(panel, error?.message || String(error));
        } finally {
            button.disabled = false;
        }
    });

    // 初始化时只读取已分配的书籍，并恢复当前配置明确保存的条目状态。
    if (manager.coreBooks.pair || manager.coreBooks.group || manager.worldviewBook) {
        statusText(panel, '已载入上次保存的授权范围。点击刷新列表以检查世界书是否仍存在。');
    }
    if (manager.legacyRestoreStates && Object.keys(manager.legacyRestoreStates).length) {
        (async () => {
            const available = new Set((await fetchBooks()).map(book => book.name));
            for (const [name, original] of Object.entries(manager.legacyRestoreStates)) {
                if (available.has(name)) await setGlobalBook(name, Boolean(original));
            }
            manager.legacyRestoreStates = {};
            saveSettingsDebounced();
            statusText(panel, '已退出旧版宽泛管理，并恢复旧版接管前的全局世界书状态。请重新指定三本授权世界书。');
        })().catch(error => statusText(panel, `旧版世界书状态恢复失败：${error?.message || String(error)}`));
    }
    // 页面载入时按当前角色卡恢复其条目覆盖；只作用于已明确分配的三本书。
    enterCurrentProfile().catch(error => statusText(panel, `载入当前角色卡配置失败：${error?.message || String(error)}`));
}
