# 拾帧 Android 本地素材库

这是拾帧 Lite 仓库中的独立 Android App 工程，不参与 SillyTavern 扩展加载。

## 当前阶段 0.6.0

- Android WebView 壳，支持 App 私有目录保存文件；可通过 Storage Access Framework 选择单独的长期文件夹。
- 支持导入拾帧 ZIP 备份包，并校验清单、路径、文件大小和 SHA-256。
- App 前台运行时，在 `127.0.0.1:8765` 启动仅监听回环地址的本地数据库 HTTP 服务。
- 首次启动生成随机配对令牌；拾帧插件通过 Bearer Token 访问本地服务。跨源请求只开放必要的 GET/POST/PUT/OPTIONS 方法与请求头。
- SQLite 保存资源索引和不可变快照历史；每次成功同步都会生成独立快照 ID，旧快照不会被覆盖。图片原始字节存储在 App 私有目录 `vault-db/assets/`，当前快照另存于 `vault-db/snapshot.json`。
- 接口：`GET /v1/health`、`GET /v1/assets`、`PUT /v1/assets/{sha256}`、`GET /v1/assets/{sha256}`、`POST /v1/snapshot`、`GET /v1/snapshot`、`GET /v1/snapshots`、`GET /v1/snapshots/{id}`。
- 提交快照前会检查清单中的每张图片是否已上传；上传时重新计算 SHA-256，避免把不完整快照标记为当前版本。
- 插件端适配器只接收 `extension_settings.shizhen`，递归提取拾帧设置中可识别的 Data URL 和酒馆本机 `/user/images/`、`/user/files/` 图片路径；图片按 SHA-256 去重，快照内以资源引用替代图片字节。
- 插件同步范围包括拾帧设置、缓存记录、相册与小剧场关联数据、Vibe、预设、角色词条、提示词、作品库、悬浮球自定义图标等插件自有内容；不读取酒馆其他角色卡、聊天记录或全局世界书。
- 插件恢复时先校验图片哈希，再将支持的图片写回酒馆图片目录并替换快照引用，最后只替换 `extension_settings.shizhen`。
- 配对令牌和同步地址保存在拾帧插件自己的扩展设置中。同步时会包含插件设置中的 API Key 等配置，请只连接自己的手机本机 App，不要分享令牌或快照。
- 当前服务只在 App 前台存活期间可用；关闭 App 或系统结束进程后，需要重新打开 App 才能同步。
- 尚未在 Android 真机、Termux 与实际 SillyTavern 实例完成联调；本阶段提交的是首版协议实现，构建和端到端验证仍待完成。

## 构建

使用 Android Studio 打开 android-app/，安装 Android SDK 35 后构建 app。

## 下一阶段

1. 在 App 中增加快照历史浏览、指定版本恢复与资源预览。
2. 让 SQLite 元数据与 SAF 用户选择的长期文件夹协同，支持数据库迁移与外部存储。
3. 完成 APK 构建、Android 真机、Termux 和 SillyTavern 同机端到端验证。
4. 增加同步中断续传、冲突提示、快照差异和资源完整性巡检。
5. 对大体积 Vibe 编码和图片增加分块传输与进度恢复。

当前尚未构建 APK 或完成真机联调；本阶段是首版可调用协议与数据层实现，不能视为已通过运行验证。
