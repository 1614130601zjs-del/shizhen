# 拾帧 Android 本地素材库

这是拾帧 Lite 仓库中的独立 Android App 工程，不参与 SillyTavern 扩展加载。

## 当前阶段 0.4.0

- Android WebView 壳，默认使用 App 私有目录保存文件。
- 可通过 Storage Access Framework 选择持久化文件夹。
- 支持导入单个原始文件并列出文件，图片不压缩。
- 支持导入拾帧 ZIP 备份包：必须包含根目录 `manifest.json`，格式为 `shizhen-vault-backup`，版本为 1。
- 清单格式：`{"format":"shizhen-vault-backup","version":1,"createdAt":"ISO-8601","assets":[{"path":"characters/example.png","type":"character","name":"example","size":123,"sha256":"<64位十六进制SHA-256>"}]}`。
- 导入时验证每个素材的路径、文件大小和 SHA-256；拒绝路径穿越、重复路径、缺失文件和不支持的版本。
- 单个清单最大 4 MB，备份解压总量最大 512 MB，最多 10000 项。
- 每次导入写入独立的 `backup-时间戳/` 目录，不覆盖既有文件。
- 支持 Termux 同机酒馆连接检测，默认 `http://127.0.0.1:8000`；只允许本机回环地址。\n- 可通过 SillyTavern 本地 API 导出全部角色卡原始 PNG 和世界书 JSON，生成带 SHA-256 清单的 ZIP，保存到素材库 `exports/`。\n- 导出调用 `POST /api/characters/all`、`POST /api/characters/export`、`POST /api/worldinfo/list`、`POST /api/worldinfo/get`；单次酒馆导出素材总量限制 128 MB（考虑手机内存占用）；ZIP 导入解压上限仍为 512 MB。

## 构建

使用 Android Studio 打开 android-app/，安装 Android SDK 35 后构建 app。

## 后续阶段

1. 在拾帧 Lite 扩展中实现素材清单生成与 ZIP 导出，优先覆盖角色卡和世界书。
2. 扩展图片、Vibe、角色卡关联资源的完整文件导出。
3. Android App 增加素材分类、预览、去重索引和 SQLite 元数据。
4. 实现酒馆端选择性恢复；恢复前检查重名冲突和哈希，绝不从酒馆删除动作反向删除本地备份。
5. 在真实 Termux + SillyTavern 环境验证接口后，再开放一键清理/恢复。

当前版本已有备份包导入和完整性校验，但尚未实现酒馆素材读取/导出、SQLite 索引或一键恢复。
