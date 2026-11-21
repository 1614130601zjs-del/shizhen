/**
 * 拾帧外接本地数据库适配层 v1
 * 只接收 extension_settings.shizhen；不读取酒馆角色卡、聊天或全局世界书。
 * 图片原始字节单独提取，设置快照只保留 shizhen-asset:// 引用。
 */
const FORMAT = 'shizhen-plugin-vault';
const VERSION = 1;
const IMAGE_REF_PREFIX = 'shizhen-asset://';
const IMAGE_KEYS = new Set(['dataUrl', 'image', 'avatar', 'url', 'cover', 'thumbnail']);

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value ?? null));
}

function isDataImage(value) {
    return typeof value === 'string' && /^data:image\/[a-z0-9.+-]+[;,]/i.test(value);
}

function isLocalImagePath(value, key) {
    if (typeof value !== 'string' || !IMAGE_KEYS.has(String(key || ''))) return false;
    if (!value.trim() || isDataImage(value) || value.startsWith(IMAGE_REF_PREFIX)) return false;
    if (/^(?:https?:)?\/\//i.test(value) || value.startsWith('blob:')) return false;
    const path = value.split(/[?#]/, 1)[0];
    return path.startsWith('/user/images/') || path.startsWith('user/images/');
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

async function readImageSource(source, { fetchImpl, origin }) {
    let response;
    if (isDataImage(source)) {
        response = await fetchImpl(source);
    } else {
        const url = new URL(source, origin);
        if (url.origin !== origin || !url.pathname.startsWith('/user/images/')) {
            throw new Error('拾帧图片引用不是本机酒馆图片路径');
        }
        response = await fetchImpl(url.href, { credentials: 'same-origin' });
    }
    if (!response.ok) throw new Error('读取拾帧图片失败：HTTP ' + response.status);
    const blob = await response.blob();
    if (!String(blob.type || '').startsWith('image/')) throw new Error('拾帧资源不是图片文件');
    return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: blob.type || 'application/octet-stream' };
}

/**
 * 返回 { manifest, snapshot, assets }；assets 中的 bytes 是图片原始字节。
 * 可注入 fetchImpl/origin 供自动化测试使用。
 */
export async function buildShizhenVaultSnapshot(config, options = {}) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new TypeError('拾帧设置对象无效');
    const fetchImpl = options.fetchImpl || globalThis.fetch?.bind(globalThis);
    const origin = options.origin || globalThis.location?.origin;
    if (typeof fetchImpl !== 'function' || !origin) throw new Error('当前环境无法读取拾帧图片资源');

    const snapshot = cloneJson(config);
    const assetsByHash = new Map();
    const seenObjects = new WeakSet();

    async function walk(value, key, pointer) {
        if (typeof value === 'string' && (isDataImage(value) || isLocalImagePath(value, key))) {
            const { bytes, mime } = await readImageSource(value, { fetchImpl, origin });
            const hash = await sha256(bytes);
            let asset = assetsByHash.get(hash);
            if (!asset) {
                asset = {
                    id: hash, sha256: hash, mime, filename: safeFilename(value, mime),
                    size: bytes.byteLength, bytes,
                    source: isDataImage(value) ? 'data-url' : 'tavern-user-image',
                    references: [],
                };
                assetsByHash.set(hash, asset);
            }
            asset.references.push(pointer);
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
    const assets = [...assetsByHash.values()];
    const manifest = {
        format: FORMAT, version: VERSION, createdAt: new Date().toISOString(),
        plugin: 'shizhen', assetCount: assets.length,
        snapshotBytes: new TextEncoder().encode(JSON.stringify(snapshot)).byteLength,
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
