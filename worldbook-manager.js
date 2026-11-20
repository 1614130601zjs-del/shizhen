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
import { eventSource, event_types, getRequestHeaders, saveSettingsDebounced } from '/script.js';

const LOG = '[拾帧·世界书管理]';
const SCHEMA_VERSION = 2;
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
    if (!root.worldbookModeManager || typeof root.worldbookModeManager !== 'object') {
        root.worldbookModeManager = {};
    }
    const s = root.worldbookModeManager;
    if (s.schemaVersion !== SCHEMA_VERSION) {
        // 不把旧版“任意分类关联”自动升级成新授权；先记下旧版接管前的全局状态，初始化时恢复。
        const legacyStates = s.originalGlobalStates && typeof s.originalGlobalStates === 'object'
            ? { ...s.originalGlobalStates }
            : {};
        s.legacyRestoreStates = { ...(s.legacyRestoreStates || {}), ...legacyStates };
        s.enabled = false;
        s.coreBooks = { pair: '', group: '' };
        s.worldviewBook = '';
        s.worldview = '';
        s.originalGlobalStates = {};
        s.originalEntryStates = {};
        s.schemaVersion = SCHEMA_VERSION;
        saveSettingsDebounced();
    }
    if (!['pair', 'group'].includes(s.mode)) s.mode = 'pair';
    if (!s.coreBooks || typeof s.coreBooks !== 'object') s.coreBooks = { pair: '', group: '' };
    if (typeof s.coreBooks.pair !== 'string') s.coreBooks.pair = '';
    if (typeof s.coreBooks.group !== 'string') s.coreBooks.group = '';
    if (typeof s.worldviewBook !== 'string') s.worldviewBook = '';
    if (typeof s.worldview !== 'string') s.worldview = '';
    if (typeof s.enabled !== 'boolean') s.enabled = false;
    if (!s.originalGlobalStates || typeof s.originalGlobalStates !== 'object') s.originalGlobalStates = {};
    if (!s.originalEntryStates || typeof s.originalEntryStates !== 'object') s.originalEntryStates = {};
    return s;
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

async function restoreBook(manager, name) {
    if (!name) return;
    if (Object.prototype.hasOwnProperty.call(manager.originalGlobalStates, name)) {
        await setGlobalBook(name, Boolean(manager.originalGlobalStates[name]));
        delete manager.originalGlobalStates[name];
    }
    const saved = manager.originalEntryStates[name];
    if (saved) {
        const data = await fetchBook(name);
        let changed = false;
        for (const [uid, disabled] of Object.entries(saved)) {
            if (!data.entries[uid]) continue;
            if (Boolean(data.entries[uid].disable) !== Boolean(disabled)) {
                data.entries[uid].disable = Boolean(disabled);
                changed = true;
            }
        }
        if (changed) await saveWorldInfo(name, data, true);
        delete manager.originalEntryStates[name];
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
    for (const item of matches) {
        const shouldDisable = item.uid !== chosen.uid;
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

async function renderWorldviewChoices(host, cfg) {
    const manager = settingsOf(cfg);
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

async function renderEntryEditor(host, cfg) {
    const manager = settingsOf(cfg);
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
                    return `<label class="ql-check"><input type="checkbox" data-wbm-entry-toggle data-wbm-entry-book-name="${escapeAttr(name)}" data-wbm-entry-uid="${escapeAttr(uid)}" ${entry?.disable ? '' : 'checked'}> ${escapeHtml(title)}${worldviewTag}</label>`;
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
                    const manager = settingsOf(cfg);
                    if (name === manager.worldviewBook) await rememberEntryStates(manager, name);
                    const fresh = await fetchBook(name);
                    const entry = fresh.entries?.[uid];
                    if (!entry) throw new Error('条目已不存在，请刷新条目列表');
                    entry.disable = !toggle.checked;
                    await saveWorldInfo(name, fresh, true);
                    saveSettingsDebounced();
                    statusText(host, `已更新「${name}」中的条目：${entry.comment || uid}`);
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

function renderBookSelectors(host, cfg, books) {
    const manager = settingsOf(cfg);
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
        <p class="ql-muted">拾帧只管理你在下方明确指定的三本世界书：双人、群像、世界观特化。其他酒馆世界书不会被扫描接管、挂载或修改；角色卡/聊天绑定也不会被修改。</p>
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
        await renderWorldviewChoices(panel, cfg);
        await renderEntryEditor(panel, cfg);
    };

    async function updateAssignment(key, value) {
        const m = settingsOf(cfg);
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
            renderBookSelectors(panel, cfg, cachedBooks);
            statusText(panel, '双人、群像和世界观特化必须指定三本不同的世界书。');
            return;
        }
        const after = new Set(selectedBookNames(m));
        for (const oldName of before) {
            if (!after.has(oldName)) await restoreBook(m, oldName);
        }
        if (m.worldviewBook !== previousWorldviewBook) m.worldview = '';
        if (m.enabled) {
            for (const name of after) rememberGlobalState(m, name);
            if (m.worldviewBook) await rememberEntryStates(m, m.worldviewBook);
        }
        saveSettingsDebounced();
        renderBookSelectors(panel, cfg, cachedBooks);
        await refreshAssignedUi();
        if (m.enabled) {
            if (m.worldviewBook && m.worldview) await syncWorldviewEntry(m, message => statusText(panel, message));
            await applyMode(cfg, message => statusText(panel, message));
        }
    }

    let cachedBooks = [];
    panel.querySelector('[data-wbm-refresh]').addEventListener('click', async () => {
        const button = panel.querySelector('[data-wbm-refresh]');
        button.disabled = true;
        statusText(panel, '正在读取酒馆世界书列表…');
        try {
            cachedBooks = await fetchBooks();
            renderBookSelectors(panel, cfg, cachedBooks);
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
        const m = settingsOf(cfg);
        m.worldview = worldviewSelect.value;
        saveSettingsDebounced();
        try {
            if (m.enabled) {
                rememberGlobalState(m, m.worldviewBook);
                await syncWorldviewEntry(m, message => statusText(panel, message));
            }
            await renderEntryEditor(panel, cfg);
        } catch (error) {
            statusText(panel, error?.message || String(error));
        }
    });

    enabled.addEventListener('change', async () => {
        const m = settingsOf(cfg);
        m.enabled = enabled.checked;
        if (m.enabled) {
            for (const name of selectedBookNames(m)) rememberGlobalState(m, name);
            if (m.worldviewBook) await rememberEntryStates(m, m.worldviewBook);
        }
        saveSettingsDebounced();
        try {
            if (m.enabled && m.worldviewBook && m.worldview) {
                await syncWorldviewEntry(m, message => statusText(panel, message));
            }
            await applyMode(cfg, message => statusText(panel, message));
        } catch (error) { statusText(panel, error?.message || String(error)); }
    });

    mode.addEventListener('change', async () => {
        const m = settingsOf(cfg);
        m.mode = mode.value;
        saveSettingsDebounced();
        if (m.enabled) {
            try { await applyMode(cfg, message => statusText(panel, message)); }
            catch (error) { statusText(panel, error?.message || String(error)); }
        }
    });

    panel.querySelector('[data-wbm-apply]').addEventListener('click', async () => {
        const button = panel.querySelector('[data-wbm-apply]');
        button.disabled = true;
        try {
            if (!settingsOf(cfg).enabled) throw new Error('请先开启「启用拾帧世界书管理」');
            await applyMode(cfg, message => statusText(panel, message));
        } catch (error) {
            statusText(panel, error?.message || String(error));
        } finally {
            button.disabled = false;
        }
    });

    // 初始化时只显示当前保存的选择；不自动扫描或修改酒馆世界书。
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
}
