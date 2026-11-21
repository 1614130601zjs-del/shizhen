package com.shizhen.vault

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import fi.iki.elonen.NanoHTTPD
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.security.MessageDigest

private class VaultIndex(context: Context) : SQLiteOpenHelper(context, "shizhen-vault.db", null, 2) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE assets (id TEXT PRIMARY KEY, mime TEXT NOT NULL, filename TEXT NOT NULL, size INTEGER NOT NULL, updated_at INTEGER NOT NULL)")
        db.execSQL("CREATE TABLE snapshots (id TEXT PRIMARY KEY, json TEXT NOT NULL, created_at INTEGER NOT NULL, is_current INTEGER NOT NULL)")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) {
            db.execSQL("ALTER TABLE snapshots RENAME TO snapshots_legacy")
            db.execSQL("CREATE TABLE snapshots (id TEXT PRIMARY KEY, json TEXT NOT NULL, created_at INTEGER NOT NULL, is_current INTEGER NOT NULL)")
            db.execSQL("INSERT INTO snapshots (id,json,created_at,is_current) SELECT 'legacy',json,updated_at,1 FROM snapshots_legacy")
            db.execSQL("DROP TABLE snapshots_legacy")
        }
    }
    fun putAsset(id: String, mime: String, filename: String, size: Long) {
        writableDatabase.insertWithOnConflict("assets", null, ContentValues().apply {
            put("id", id); put("mime", mime); put("filename", filename); put("size", size); put("updated_at", System.currentTimeMillis())
        }, SQLiteDatabase.CONFLICT_REPLACE)
    }
    fun hasAsset(id: String): Boolean = readableDatabase.rawQuery("SELECT 1 FROM assets WHERE id=?", arrayOf(id)).use { it.moveToFirst() }
    fun putSnapshot(json: String): String {
        val id = java.util.UUID.randomUUID().toString()
        val now = System.currentTimeMillis()
        writableDatabase.beginTransaction()
        try {
            writableDatabase.execSQL("UPDATE snapshots SET is_current=0")
            writableDatabase.insertOrThrow("snapshots", null, ContentValues().apply {
                put("id", id); put("json", json); put("created_at", now); put("is_current", 1)
            })
            writableDatabase.setTransactionSuccessful()
        } finally { writableDatabase.endTransaction() }
        return id
    }
    fun snapshot(): String? = readableDatabase.rawQuery("SELECT json FROM snapshots WHERE is_current=1 ORDER BY created_at DESC LIMIT 1", null).use { if (it.moveToFirst()) it.getString(0) else null }
    fun snapshot(id: String): String? = readableDatabase.rawQuery("SELECT json FROM snapshots WHERE id=?", arrayOf(id)).use { if (it.moveToFirst()) it.getString(0) else null }
    fun listSnapshots(): org.json.JSONArray {
        val rows = org.json.JSONArray()
        readableDatabase.rawQuery("SELECT id,created_at,is_current FROM snapshots ORDER BY created_at DESC", null).use { c ->
            while (c.moveToNext()) rows.put(JSONObject().put("id", c.getString(0)).put("createdAt", c.getLong(1)).put("current", c.getInt(2) == 1))
        }
        return rows
    }
    fun listAssets(): JSONObject {
        val rows = org.json.JSONArray()
        readableDatabase.rawQuery("SELECT id,mime,filename,size,updated_at FROM assets ORDER BY updated_at DESC", null).use { c ->
            while (c.moveToNext()) rows.put(JSONObject().put("id", c.getString(0)).put("mime", c.getString(1))
                .put("filename", c.getString(2)).put("size", c.getLong(3)).put("updatedAt", c.getLong(4)))
        }
        return JSONObject().put("assets", rows)
    }
}

/** Loopback-only, bearer-token protected bridge used exclusively by the Shizhen extension. */
class ShizhenVaultServer(
    context: Context,
    private val token: String,
    private val root: File,
    port: Int = 8765
) : NanoHTTPD("127.0.0.1", port) {
    private val index = VaultIndex(context.applicationContext)
    private val assetDir = File(root, "assets").apply { mkdirs() }
    private val snapshotFile = File(root, "snapshot.json")

    fun currentLibrary(): JSONObject {
        val payload = index.snapshot() ?: return JSONObject()
        return JSONObject(payload).optJSONObject("snapshot") ?: JSONObject()
    }

    fun saveLibrary(settingsJson: String): JSONObject {
        val settings = JSONObject(settingsJson)
        // 连接凭据属于本机，不允许通过跨设备库编辑覆盖。
        settings.remove("vaultEndpoint")
        settings.remove("vaultToken")
        val current = index.snapshot()?.let { JSONObject(it) } ?: JSONObject()
        val oldManifest = current.optJSONObject("manifest") ?: JSONObject()
        val oldAssets = oldManifest.optJSONArray("assets") ?: org.json.JSONArray()
        val available = HashMap<String, JSONObject>()
        for (i in 0 until oldAssets.length()) {
            val item = oldAssets.optJSONObject(i) ?: continue
            available[item.optString("id")] = item
        }
        val referenced = linkedSetOf<String>()
        fun collect(value: Any?) {
            when (value) {
                is JSONObject -> {
                    val keys = value.keys()
                    while (keys.hasNext()) collect(value.opt(keys.next()))
                }
                is org.json.JSONArray -> for (i in 0 until value.length()) collect(value.opt(i))
                is String -> if (value.startsWith("shizhen-asset://")) {
                    val id = value.removePrefix("shizhen-asset://")
                    require(id.matches(Regex("[a-f0-9]{64}"))) { "素材引用格式无效" }
                    require(File(assetDir, id).isFile && index.hasAsset(id)) { "素材文件缺失：$id" }
                    referenced.add(id)
                }
            }
        }
        collect(settings)
        val assets = org.json.JSONArray()
        for (id in referenced) {
            val metadata = available[id]
                ?: throw IllegalArgumentException("当前快照未登记该素材：$id")
            assets.put(JSONObject(metadata.toString()))
        }
        val manifest = JSONObject(oldManifest.toString())
            .put("format", "shizhen-plugin-vault")
            .put("version", 1)
            .put("plugin", "shizhen")
            .put("createdAt", java.time.Instant.now().toString())
            .put("assetCount", assets.length())
            .put("snapshotBytes", settings.toString().toByteArray(Charsets.UTF_8).size)
            .put("assets", assets)
        val payload = JSONObject()
            .put("format", "shizhen-plugin-vault")
            .put("version", 1)
            .put("manifest", manifest)
            .put("snapshot", settings)
        val saved = payload.toString()
        snapshotFile.writeText(saved, Charsets.UTF_8)
        val snapshotId = index.putSnapshot(saved)
        return JSONObject().put("ok", true).put("snapshotId", snapshotId)
            .put("assetCount", assets.length()).put("updatedAt", System.currentTimeMillis())
    }


    private fun digest(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(bytes)
        .joinToString("") { "%02x".format(it) }

    private fun json(status: Response.Status, body: JSONObject): Response =
        newFixedLengthResponse(status, "application/json; charset=utf-8", body.toString()).withCors()

    private fun Response.withCors(): Response {
        addHeader("Access-Control-Allow-Origin", "*")
        addHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS")
        addHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Asset-Id,X-Asset-Mime,X-Asset-Name")
        // Android WebView may classify file:// -> loopback as a Private Network Access request.
        addHeader("Access-Control-Allow-Private-Network", "true")
        addHeader("Access-Control-Max-Age", "600")
        return this
    }

    private fun authorized(session: IHTTPSession): Boolean =
        session.headers["authorization"] == "Bearer $token"

    fun stats(): JSONObject = JSONObject()
        .put("assets", index.listAssets().getJSONArray("assets"))
        .put("snapshots", index.listSnapshots())

    private fun bodyFile(session: IHTTPSession): File {
        val files = HashMap<String, String>()
        session.parseBody(files)
        // NanoHTTPD 2.3.1 stores raw POST bodies as "postData", but PUT bodies as "content".
        // Asset uploads use PUT; looking only for postData made every non-empty upload look empty.
        val key = if (session.method == Method.PUT) "content" else "postData"
        val path = files[key] ?: throw IOException("请求体为空（" + session.method + "，已解析字段：" + files.keys.joinToString() + "）")
        val file = File(path)
        if (!file.isFile || file.length() == 0L) throw IOException("请求体为空（" + session.method + "，长度为 0）")
        return file
    }

    override fun serve(session: IHTTPSession): Response {
        if (session.method == Method.OPTIONS) return newFixedLengthResponse(Response.Status.NO_CONTENT, "text/plain", "").withCors()
        if (session.uri == "/v1/health" && session.method == Method.GET) {
            return json(Response.Status.OK, JSONObject().put("ok", true).put("service", "shizhen-vault").put("version", 1))
        }
        if (!authorized(session)) return json(Response.Status.UNAUTHORIZED, JSONObject().put("ok", false).put("error", "配对令牌无效"))
        return try {
            when {
                session.uri == "/v1/assets" && session.method == Method.GET -> {
                    val id = session.headers["x-asset-id"]
                    if (id.isNullOrBlank()) {
                        json(Response.Status.OK, index.listAssets())
                    } else {
                        require(id.matches(Regex("[a-f0-9]{64}"))) { "资源标识无效" }
                        val file = File(assetDir, id)
                        if (!file.isFile) return json(Response.Status.NOT_FOUND, JSONObject().put("error", "资源不存在"))
                        newFixedLengthResponse(Response.Status.OK, "application/octet-stream", file.inputStream(), file.length()).withCors()
                    }
                }
                session.uri == "/v1/assets" && session.method == Method.PUT -> {
                    val id = session.headers["x-asset-id"] ?: throw IllegalArgumentException("缺少资源 SHA-256 标识")
                    require(id.matches(Regex("[a-f0-9]{64}"))) { "资源 SHA-256 标识无效" }
                    val bytes = bodyFile(session).readBytes()
                    require(digest(bytes) == id) { "资源 SHA-256 校验失败" }
                    File(assetDir, id).writeBytes(bytes)
                    val mime = session.headers["x-asset-mime"] ?: "application/octet-stream"
                    val filename = session.headers["x-asset-name"] ?: id
                    index.putAsset(id, mime, filename, bytes.size.toLong())
                    json(Response.Status.OK, JSONObject().put("ok", true).put("id", id).put("size", bytes.size))
                }
                session.uri == "/v1/snapshot" && session.method == Method.GET -> {
                    val value = index.snapshot() ?: return json(Response.Status.NOT_FOUND, JSONObject().put("error", "本地数据库还没有快照"))
                    newFixedLengthResponse(Response.Status.OK, "application/json; charset=utf-8", value).withCors()
                }
                session.uri == "/v1/snapshots" && session.method == Method.GET ->
                    json(Response.Status.OK, JSONObject().put("snapshots", index.listSnapshots()))
                session.uri.startsWith("/v1/snapshots/") && session.method == Method.GET -> {
                    val id = session.uri.removePrefix("/v1/snapshots/")
                    require(id.matches(Regex("[a-f0-9-]{36}|legacy"))) { "快照编号无效" }
                    val value = index.snapshot(id) ?: return json(Response.Status.NOT_FOUND, JSONObject().put("error", "快照不存在"))
                    newFixedLengthResponse(Response.Status.OK, "application/json; charset=utf-8", value).withCors()
                }
                session.uri == "/v1/diagnostic-upload" && session.method == Method.PUT -> {
                    // Exercises the exact browser CORS + PUT + NanoHTTPD body parser path without saving anything.
                    val bytes = bodyFile(session).readBytes()
                    json(Response.Status.OK, JSONObject().put("ok", true).put("size", bytes.size).put("sha256", digest(bytes)))
                }
                session.uri.startsWith("/v1/assets/") && session.method == Method.PUT -> {
                    val id = session.uri.removePrefix("/v1/assets/")
                    require(id.matches(Regex("[a-f0-9]{64}"))) { "资源 SHA-256 标识无效" }
                    val bytes = bodyFile(session).readBytes()
                    require(digest(bytes) == id) { "资源 SHA-256 校验失败" }
                    File(assetDir, id).writeBytes(bytes)
                    val mime = session.headers["x-asset-mime"] ?: "application/octet-stream"
                    val filename = session.headers["x-asset-name"] ?: id
                    index.putAsset(id, mime, filename, bytes.size.toLong())
                    json(Response.Status.OK, JSONObject().put("ok", true).put("id", id).put("size", bytes.size))
                }
                session.uri.startsWith("/v1/assets/") && session.method == Method.GET -> {
                    val id = session.uri.removePrefix("/v1/assets/")
                    require(id.matches(Regex("[a-f0-9]{64}"))) { "资源标识无效" }
                    val file = File(assetDir, id)
                    if (!file.isFile) return json(Response.Status.NOT_FOUND, JSONObject().put("error", "资源不存在"))
                    newFixedLengthResponse(Response.Status.OK, "application/octet-stream", file.inputStream(), file.length()).withCors()
                }
                session.uri == "/v1/snapshot" && session.method == Method.POST -> {
                    val payload = JSONObject(bodyFile(session).readText(Charsets.UTF_8))
                    require(payload.optString("format") == "shizhen-plugin-vault" && payload.optInt("version") == 1) { "不支持的拾帧数据库格式" }
                    val manifest = payload.getJSONObject("manifest")
                    val assets = manifest.getJSONArray("assets")
                    for (i in 0 until assets.length()) {
                        val id = assets.getJSONObject(i).getString("id")
                        require(id.matches(Regex("[a-f0-9]{64}")) && File(assetDir, id).isFile && index.hasAsset(id)) {
                            "资源尚未完整同步：$id"
                        }
                    }
                    require(payload.optJSONObject("snapshot") != null) { "拾帧设置快照缺失" }
                    val saved = payload.toString()
                    snapshotFile.writeText(saved, Charsets.UTF_8)
                    val snapshotId = index.putSnapshot(saved)
                    json(Response.Status.OK, JSONObject().put("ok", true).put("snapshotId", snapshotId)
                        .put("assetCount", assets.length()).put("updatedAt", System.currentTimeMillis()))
                }
                else -> json(Response.Status.NOT_FOUND, JSONObject().put("error", "未知的拾帧数据库接口"))
            }
        } catch (error: Exception) {
            json(Response.Status.BAD_REQUEST, JSONObject().put("ok", false).put("error", error.message ?: "本地数据库请求失败"))
        }
    }
}
