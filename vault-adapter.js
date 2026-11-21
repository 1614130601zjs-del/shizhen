/**
 * 拾帧外接本地数据库适配层
 * 仅处理 extension_settings.shizhen，不接管酒馆缓存、素材读取或渲染。
 * 快照保留拾帧数据结构；图片字节独立存储，引用通过 SHA-256 资源 ID 连接。
 */
const FORMAT = 'shizhen-plugin-vault';
const VERSION = 1;
const SCHEMA_VERSION = 2;
const IMAGE_REF_PREFIX = 'shizhen-asset://';
const IMAGE_KEYS = new Set(['dataUrl', 'image', 'avatar', 'url', 'cover', 'thumbnail', 'thumb', 'characterAvatar']);

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value ?? null));
}

function isDataImage(value) {
    return typeof value === 'string' && /^data:image\/[a-z0-9.+-]+[;,]/i.test(value);
}

function rawImageInfo(value, key) {
    if (typeof value !== 'string' || isDataImage(value) || !IMAGE_KEYS.has(String(key || ''))) return null;
    const raw = value.trim().replace(/^data:[^,]*,/i, '').replace(/\s+/g, '');
    if (/^iVBOR/.test(raw)) return { mime: 'image/png', base64: raw, mode: 'raw-base64' };
    if (/^\/9j\//.test(raw)) return { mime: 'image/jpeg', base64: raw, mode: 'raw-base64' };
    if (/^UklGR/.test(raw)) return { mime: 'image/webp', base64: raw, mode: 'raw-base64' };
    if (/^R0lGOD/.test(raw)) return { mime: 'image/gif', base64: raw, mode: 'raw-base64' };
    return null;
}

function isLocalImagePath(value, key) {
    if (typeof value !== 'string' || !IMAGE_KEYS.has(String(key || ''))) return false;
    if (!value.trim() || isDataImage(value) || rawImageInfo(value, key) || value.startsWith(IMAGE_REF_PREFIX)) return false;
    if (/^(?:https?:)?\/\//i.test(value) || value.startsWith('blob:')) return false;
    const path = value.split(/[?#]/, 1)[0];
    return path.startsWith('/user/images/') || path.startsWith('user/images/') || path.startsWith('/user/files/') || path.startsWith('user/files/');
}

function safeFilename(path, mime) {
    const leaf = String(path || '').split(/[/?#]/).filter(Boolean).pop() || 'image';
    const cleaned = leaf.replace(/[^\w.\-一-龥]/g, '_').slice(-100);
    if (/\.[a-z0-9]{2,5}$/i.test(cleaned)) return cleaned;
    const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif' })[mime] || 'img';
    return cleaned + '.' + ext;
}

async function sha256(bytes) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

async function readImageSource(source, { fetchImpl, origin, mimeHint }) {
    let response;
    if (isDataImage(source)) {
        response = await fetchImpl(source);
    } else {
        const url = new URL(source, origin);
        if (url.origin !== origin || !(url.pathname.startsWith('/user/images/') || url.pathname.startsWith('/user/files/'))) {
            throw new Error('拾帧图片引用不是本机酒馆图片路径');
        }
        response = await fetchImpl(url.href, { credentials: 'same-origin' });
    }
    if (!response.ok) throw new Error('读取拾帧图片失败：HTTP ' + response.status);
    const blob = await response.blob();
    const mime = blob.type || mimeHint || 'application/octet-stream';
    if (!String(mime).startsWith('image/')) throw new Error('拾帧资源不是图片文件');
    return { bytes: new Uint8Array(await blob.arrayBuffer()), mime };
}

function collectLinkedCharacterIndices(config, cards) {
    const linked = new Set();
    if (!Array.isArray(cards) || !cards.length) return linked;
    const byAvatar = new Map();
    cards.forEach((card, index) => {
        const avatar = String(card?.avatar || '').trim();
        if (avatar) {
            if (!byAvatar.has(avatar)) byAvatar.set(avatar, []);
            byAvatar.get(avatar).push(index);
        }
    });
    const seen = new WeakSet();
    function walk(value, key = '') {
        if (!value || typeof value !== 'object' || seen.has(value)) return;
        seen.add(value);
        if (Array.isArray(value)) {
            value.forEach(item => walk(item));
            return;
        }
        for (const [childKey, child] of Object.entries(value)) {
            if ((childKey === 'characterKey' || childKey === 'albumCharacterKey') && /^\\d+$/.test(String(child ?? ''))) {
                const index = Number(child);
                if (index >= 0 && index < cards.length) linked.add(index);
            } else if (childKey === 'characterAvatar' && typeof child === 'string') {
                const matches = byAvatar.get(child.trim()) || [];
                if (matches.length === 1) linked.add(matches[0]);
            }
            walk(child, childKey);
        }
    }
    walk(config);
    for (const field of ['albumNames', 'albumCovers']) {
        for (const key of Object.keys(config?.[field] || {})) {
            if (/^\\d+$/.test(key) && Number(key) < cards.length) linked.add(Number(key));
        }
    }
    return linked;
}

async function buildCharacterManifest(cards, config, registerAsset, { fetchImpl, origin }) {
    if (!Array.isArray(cards)) return [];
    const linked = collectLinkedCharacterIndices(config, cards);
    const rows = cards.map((card, sourceIndex) => {
        const name = String(card?.name || '').trim();
        const avatar = String(card?.avatar || '').trim();
        return {
            sourceIndex, name, avatar,
            stableId: avatar ? 'avatar:' + avatar : (name ? 'name:' + name.normalize('NFKC').toLowerCase() : 'index:' + sourceIndex),
            linked: linked.has(sourceIndex),
        };
    });
    for (const row of rows) {
        if (!row.linked || !row.avatar || row.avatar.startsWith('data:')) continue;
        try {
            const url = new URL('/characters/' + encodeURIComponent(row.avatar), origin);
            if (url.origin !== origin) throw new Error('角色卡文件不属于当前酒馆');
            const response = await fetchImpl(url.href, { credentials: 'same-origin' });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const blob = await response.blob();
            const mime = blob.type || (/\\.png$/i.test(row.avatar) ? 'image/png' : 'application/octet-stream');
            if (!String(mime).startsWith('image/') && mime !== 'application/octet-stream') throw new Error('返回内容不是角色卡文件');
            const bytes = new Uint8Array(await blob.arrayBuffer());
            if (!bytes.byteLength) throw new Error('角色卡文件为空');
            row.cardAssetId = await registerAsset({
                bytes, mime, filename: row.avatar.split('/').pop() || ('character-' + row.sourceIndex + '.png'),
                source: 'character-card',
                reference: { pointer: '/@characters/' + row.sourceIndex, mode: 'character-card', key: 'avatar' },
            });
            row.cardMime = mime;
        } catch (error) {
            row.cardStatus = 'unavailable';
            row.cardError = String(error?.message || error).slice(0, 180);
        }
    }
    return rows;
}

/**
 * 返回 { manifest, snapshot, assets }。onAsset 可逐张上传原始字节以降低峰值内存。
 * reference 记录精确 JSON Pointer 与原始存储形式，恢复时据此还原，不把 Data URL、
 * 原始 Base64 和酒馆文件路径混成同一种格式。
 */
export async function buildShizhenVaultSnapshot(config, options = {}) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new TypeError('拾帧设置对象无效');
    const fetchImpl = options.fetchImpl || globalThis.fetch?.bind(globalThis);
    const origin = options.origin || globalThis.location?.origin;
    if (typeof fetchImpl !== 'function' || !origin) throw new Error('当前环境无法读取拾帧图片资源');

    const snapshot = cloneJson(config);
    delete snapshot.vaultEndpoint;
    delete snapshot.vaultToken;
    const assetsByHash = new Map();
    const seenObjects = new WeakSet();

    async function registerAsset({ bytes, mime, filename, source, reference }) {
        const hash = await sha256(bytes);
        let asset = assetsByHash.get(hash);
        if (!asset) {
            asset = { id: hash, sha256: hash, mime, filename: safeFilename(filename, mime), size: bytes.byteLength, bytes, source, references: [] };
            assetsByHash.set(hash, asset);
            if (typeof options.onAsset === 'function') {
                await options.onAsset({ ...asset }, assetsByHash.size);
                delete asset.bytes;
            }
        }
        if (reference) asset.references.push(reference);
        return hash;
    }

    async function walk(value, key, pointer) {
        const rawInfo = rawImageInfo(value, key);
        const localPath = isLocalImagePath(value, key);
        if (typeof value === 'string' && (isDataImage(value) || rawInfo || localPath)) {
            const mode = rawInfo ? 'raw-base64' : (isDataImage(value) ? 'data-url' : 'tavern-path');
            const source = rawInfo ? 'data:' + rawInfo.mime + ';base64,' + rawInfo.base64 : value;
            const { bytes, mime } = await readImageSource(source, { fetchImpl, origin, mimeHint: rawInfo?.mime });
            const hash = await registerAsset({
                bytes, mime, filename: value, source: mode,
                reference: { pointer, mode, key: String(key || '') },
            });
            return IMAGE_REF_PREFIX + hash;
        }
        if (!value || typeof value !== 'object' || seenObjects.has(value)) return value;
        seenObjects.add(value);
        if (Array.isArray(value)) {
            for (let index = 0; index < value.length; index++) {
                value[index] = await walk(value[index], String(index), pointer + '/' + index);
            }
        } else {
            for (const childKey of Object.keys(value)) {
                const escaped = childKey.replace(/~/g, '~0').replace(/\//g, '~1');
                value[childKey] = await walk(value[childKey], childKey, pointer + '/' + escaped);
            }
        }
        return value;
    }

    await walk(snapshot, '', '');
    const characters = await buildCharacterManifest(options.characterCards, snapshot, registerAsset, { fetchImpl, origin });
    const assets = [...assetsByHash.values()];
    const manifest = {
        format: FORMAT, version: VERSION, schemaVersion: SCHEMA_VERSION,
        createdAt: new Date().toISOString(), plugin: 'shizhen',
        assetCount: assets.length,
        snapshotBytes: new TextEncoder().encode(JSON.stringify(snapshot)).byteLength,
        characters,
        assets: assets.map(({ bytes, ...metadata }) => metadata),
    };
    return { manifest, snapshot, assets };
}

export function validateShizhenVaultSnapshot(payload) {
    if (!payload || payload.format !== FORMAT || payload.version !== VERSION) throw new Error('不支持的拾帧数据库备份格式或版本');
    if (!payload.snapshot || typeof payload.snapshot !== 'object' || Array.isArray(payload.snapshot)) throw new Error('拾帧数据库快照缺失');
    if (!Array.isArray(payload.assets)) throw new Error('拾帧数据库资源清单缺失');
    return true;
}

export const SHIZHEN_VAULT_FORMAT = FORMAT;
export const SHIZHEN_VAULT_VERSION = VERSION;
export const SHIZHEN_VAULT_SCHEMA_VERSION = SCHEMA_VERSION;
