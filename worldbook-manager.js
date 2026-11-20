/**
 * 拾帧模式管理：唯一允许修改酒馆真实世界书全局开关与条目启用状态的模块。
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

const LOG = '[拾帧·模式管理]';
const CATEGORIES = [
    { id: 'pair', label: '双人' },
    { id: 'group', label: '群像' },
    { id: 'ancient', label: '古风' },
    { id: 'cyberpunk', label: '赛博朋克' },
    { id: 'republic', label: '民国' },
];

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
        root.worldbookModeManager = {
            enabled: false,
            mode: 'pair',
            supplements: [],
            assignments: {},
            originalGlobalStates: {},
        };
    }
    const s = root.worldbookModeManager;
    if (!['pair', 'group'].includes(s.mode)) s.mode = 'pair';
    if (!Array.isArray(s.supplements)) s.supplements = [];
    if (!s.assignments || typeof s.assignments !== 'object' || Array.isArray(s.assignments)) s.assignments = {};
    if (!s.originalGlobalStates || typeof s.originalGlobalStates !== 'object' || Array.isArray(s.originalGlobalStates)) s.originalGlobalStates = {};
    return s;
}

const isGlobalOn = name => Array.isArray(selected_world_info) && selected_world_info.includes(name);

async function refreshGlobalList() {
    if (!Array.isArray(world_names) || world_names.length === 0) {
        await updateWorldInfoList();
    }
}

async function setGlobalBook(name, on) {
    if (!name) throw new Error('世界书名称为空');
    await refreshGlobalList();
    const before = isGlobalOn(name);
    if (before === Boolean(on)) return before;

    if (on) {
        if (!selected_world_info.includes(name)) selected_world_info.push(name);
    } else {
        for (let i = selected_world_info.length - 1; i >= 0; i--) {
            if (selected_world_info[i] === name) selected_world_info.splice(i, 1);
        }
    }

    // 与酒馆的全局世界书设置结构同步后再存盘；不触碰角色卡/聊天绑定。
    if (!world_info || typeof world_info !== 'object') throw new Error('当前酒馆未提供 world_info 状态对象');
    world_info.globalSelect = [...selected_world_info];
    saveSettingsDebounced();
    try {
        await eventSource.emit(event_types.WORLDINFO_SETTINGS_UPDATED);
    } catch (error) {
        console.warn(LOG, '世界书状态事件通知失败', error);
    }
    return isGlobalOn(name);
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
    if (!data || !data.entries || typeof data.entries !== 'object') throw new Error(`世界书「${name}」没有可识别的条目数据`);
    return data;
}

function assignedCategories(manager, name) {
    const value = manager.assignments[name];
    return Array.isArray(value) ? value : [];
}

function managedNames(manager) {
    return Object.keys(manager.assignments).filter(name => assignedCategories(manager, name).length > 0);
}

function shouldBeOn(manager, name) {
    const cats = assignedCategories(manager, name);
    if (cats.includes(manager.mode)) return true;
    return cats.some(id => CATEGORIES.some(x => x.id === id && id !== 'pair' && id !== 'group') && manager.supplements.includes(id));
}

async function applyMode(cfg, report = () => {}) {
    const manager = settingsOf(cfg);
    if (!manager.enabled) return;
    const names = managedNames(manager);
    for (const name of names) {
        const desired = shouldBeOn(manager, name);
        const actual = await setGlobalBook(name, desired);
        if (actual !== desired) throw new Error(`世界书「${name}」状态同步失败`);
    }
    report('已按当前模式同步拾帧管理的全局世界书。');
}

function statusText(host, text) {
    const el = host.querySelector('[data-wbm-status]');
    if (el) el.textContent = text;
}

function renderBookList(host, cfg, books) {
    const manager = settingsOf(cfg);
    const list = host.querySelector('[data-wbm-books]');
    if (!list) return;
    list.innerHTML = books.map(book => {
        const cats = assignedCategories(manager, book.name);
        const active = isGlobalOn(book.name);
        const categoryControls = CATEGORIES.map(cat =>
            `<label class="ql-check"><input type="checkbox" data-wbm-category="${cat.id}" data-wbm-book="${encodeURIComponent(book.name)}" ${cats.includes(cat.id) ? 'checked' : ''}> ${cat.label}</label>`
        ).join('');
        return `<details class="ql-card ql-wbm-book" data-wbm-book-card="${encodeURIComponent(book.name)}">
            <summary>${book.title.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
            <span class="ql-muted"> · ${active ? '全局已启用' : '全局未启用'}</span></summary>
            <p class="ql-muted">勾选该书参与哪些模式。只有勾选归入拾帧管理的世界书，才会被模式切换控制。</p>
            <div class="ql-wbm-categories">${categoryControls}</div>
            <div class="ql-row"><button type="button" class="menu_button" data-wbm-entry-load="${encodeURIComponent(book.name)}">查看 / 调整具体条目</button></div>
            <div data-wbm-entries hidden></div>
        </details>`;
    }).join('') || '<p class="ql-muted">酒馆中暂时没有可用的世界书。</p>';

    list.querySelectorAll('[data-wbm-category]').forEach(input => {
        input.addEventListener('change', () => {
            const name = decodeURIComponent(input.dataset.wbmBook || '');
            const manager = settingsOf(cfg);
            const current = new Set(assignedCategories(manager, name));
            if (input.checked) current.add(input.dataset.wbmCategory);
            else current.delete(input.dataset.wbmCategory);

            if (current.size && !(name in manager.originalGlobalStates)) {
                manager.originalGlobalStates[name] = isGlobalOn(name);
            }
            manager.assignments[name] = [...current];
            if (!current.size) {
                delete manager.assignments[name];
                delete manager.originalGlobalStates[name];
            }
            cfg().worldbookModeManager = manager;
            // 分配本身只保存拾帧设置，不立刻更改酒馆状态；用户点击应用后才执行同步。
            saveSettingsDebounced();
        });
    });

    list.querySelectorAll('[data-wbm-entry-load]').forEach(button => {
        button.addEventListener('click', async () => {
            const name = decodeURIComponent(button.dataset.wbmEntryLoad || '');
            const card = button.closest('[data-wbm-book-card]');
            const target = card?.querySelector('[data-wbm-entries]');
            if (!target) return;
            if (!target.hidden) { target.hidden = true; return; }
            target.hidden = false;
            target.textContent = '正在读取条目…';
            try {
                const data = await fetchBook(name);
                const entries = Object.entries(data.entries).sort((a, b) => Number(a[1]?.order ?? 100) - Number(b[1]?.order ?? 100));
                target.innerHTML = entries.map(([uid, entry]) => {
                    const title = String(entry?.comment || (Array.isArray(entry?.key) ? entry.key.join('、') : '') || `UID ${uid}`);
                    const safe = title.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
                    return `<label class="ql-check"><input type="checkbox" data-wbm-entry-toggle data-wbm-entry-world="${encodeURIComponent(name)}" data-wbm-entry-uid="${encodeURIComponent(uid)}" ${entry?.disable ? '' : 'checked'}> ${safe}</label>`;
                }).join('') || '<p class="ql-muted">这本世界书没有条目。</p>';
                target.querySelectorAll('[data-wbm-entry-toggle]').forEach(toggle => {
                    toggle.addEventListener('change', async () => {
                        toggle.disabled = true;
                        try {
                            const world = decodeURIComponent(toggle.dataset.wbmEntryWorld || '');
                            const entryUid = decodeURIComponent(toggle.dataset.wbmEntryUid || '');
                            const fresh = await fetchBook(world);
                            const entry = fresh.entries?.[entryUid];
                            if (!entry) throw new Error('条目已不存在，请刷新列表');
                            entry.disable = !toggle.checked;
                            await saveWorldInfo(world, fresh, true);
                            statusText(host, `已更新「${world}」中的条目：${entry.comment || entryUid}`);
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
        });
    });
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
        <p class="ql-muted">只管理你在这里明确关联的酒馆全局世界书。不会修改角色卡绑定、聊天绑定，也不会影响小剧场、提示词或其他拾帧功能的开关。</p>
        <label class="ql-check"><input type="checkbox" data-wbm-enabled> 启用模式管理</label>
        <label for="ql-wbm-mode">构图大模式</label>
        <select id="ql-wbm-mode" data-wbm-mode><option value="pair">双人</option><option value="group">群像</option></select>
        <p class="ql-muted">风格补充包（可叠加）</p>
        <div class="ql-wbm-supplements">
            <label class="ql-check"><input type="checkbox" data-wbm-supplement="ancient"> 古风</label>
            <label class="ql-check"><input type="checkbox" data-wbm-supplement="cyberpunk"> 赛博朋克</label>
            <label class="ql-check"><input type="checkbox" data-wbm-supplement="republic"> 民国</label>
        </div>
        <div class="ql-row"><button type="button" class="menu_button" data-wbm-refresh>刷新酒馆世界书</button><button type="button" class="menu_button ql-primary" data-wbm-apply>应用当前模式</button></div>
        <p class="ql-muted" data-wbm-status role="status">尚未读取世界书。</p>
        <p class="ql-muted">世界书关联（可一书多用）：</p>
        <div data-wbm-books><p class="ql-muted">点击「刷新酒馆世界书」读取列表。</p></div>
    `;
    settingsPage.prepend(panel);

    const manager = settingsOf(cfg);
    const enabled = panel.querySelector('[data-wbm-enabled]');
    const mode = panel.querySelector('[data-wbm-mode]');
    enabled.checked = manager.enabled;
    mode.value = manager.mode;
    panel.querySelectorAll('[data-wbm-supplement]').forEach(input => {
        input.checked = manager.supplements.includes(input.dataset.wbmSupplement);
        input.addEventListener('change', () => {
            const m = settingsOf(cfg);
            const set = new Set(m.supplements);
            if (input.checked) set.add(input.dataset.wbmSupplement);
            else set.delete(input.dataset.wbmSupplement);
            m.supplements = [...set];
            saveSettingsDebounced();
        });
    });
    enabled.addEventListener('change', async () => {
        const m = settingsOf(cfg);
        m.enabled = enabled.checked;
        saveSettingsDebounced();
        if (m.enabled) {
            try { await applyMode(cfg, message => statusText(panel, message)); }
            catch (error) { statusText(panel, error?.message || String(error)); }
        }
    });
    mode.addEventListener('change', () => {
        settingsOf(cfg).mode = mode.value;
        saveSettingsDebounced();
    });
    panel.querySelector('[data-wbm-refresh]').addEventListener('click', async () => {
        const button = panel.querySelector('[data-wbm-refresh]');
        button.disabled = true;
        statusText(panel, '正在读取酒馆世界书列表…');
        try {
            const books = await fetchBooks();
            renderBookList(panel, cfg, books);
            statusText(panel, `已读取 ${books.length} 本酒馆世界书。展开书名可调整具体条目。`);
        } catch (error) {
            statusText(panel, error?.message || String(error));
        } finally {
            button.disabled = false;
        }
    });
    panel.querySelector('[data-wbm-apply]').addEventListener('click', async () => {
        const button = panel.querySelector('[data-wbm-apply]');
        button.disabled = true;
        try {
            await applyMode(cfg, message => statusText(panel, message));
        } catch (error) {
            statusText(panel, error?.message || String(error));
        } finally {
            button.disabled = false;
        }
    });
}
