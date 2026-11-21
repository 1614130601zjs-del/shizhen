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

private class VaultIndex(context: Context) : SQLiteOpenHelper(context, "shizhen-vault.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE assets (id TEXT PRIMARY KEY, mime TEXT NOT NULL, filename TEXT NOT NULL, size INTEGER NOT NULL, updated_at INTEGER NOT NULL)")
        db.execSQL("CREATE TABLE snapshots (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL, updated_at INTEGER NOT NULL)")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {}
    fun putAsset(id: String, mime: String, filename: String, size: Long) {
        writableDatabase.insertWithOnConflict("assets", null, ContentValues().apply {
            put("id", id); put("mime", mime); put("filename", filename); put("size", size); put("updated_at", System.currentTimeMillis())
        }, SQLiteDatabase.CONFLICT_REPLACE)
    }
    fun hasAsset(id: String): Boolean = readableDatabase.rawQuery("SELECT 1 FROM assets WHERE id=?", arrayOf(id)).use { it.moveToFirst() }
    fun putSnapshot(json: String) {
        writableDatabase.insertWithOnConflict("snapshots", null, ContentValues().apply {
            put("id", 1); put("json", json); put("updated_at", System.currentTimeMillis())
        }, SQLiteDatabase.CONFLICT_REPLACE)
    }
    fun snapshot(): String? = readableDatabase.rawQuery("SELECT json FROM snapshots WHERE id=1", null).use { if (it.moveToFirst()) it.getString(0) else null }
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

    private fun digest(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(bytes)
        .joinToString("") { "%02x".format(it) }

    private fun json(status: Response.Status, body: JSONObject): Response =
        newFixedLengthResponse(status, "application/json; charset=utf-8", body.toString()).withCors()

    private fun Response.withCors(): Response {
        addHeader("Access-Control-Allow-Origin", "*")
        addHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS")
        addHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Asset-Mime,X-Asset-Name")
        addHeader("Access-Control-Max-Age", "600")
        return this
    }

    private fun authorized(session: IHTTPSession): Boolean =
        session.headers["authorization"] == "Bearer $token"

    private fun bodyFile(session: IHTTPSession): File {
        val files = HashMap<String, String>()
        session.parseBody(files)
        val path = files["postData"] ?: throw IOException("请求体为空")
        return File(path)
    }

    override fun serve(session: IHTTPSession): Response {
        if (session.method == Method.OPTIONS) return newFixedLengthResponse(Response.Status.NO_CONTENT, "text/plain", "").withCors()
        if (session.uri == "/v1/health" && session.method == Method.GET) {
            return json(Response.Status.OK, JSONObject().put("ok", true).put("service", "shizhen-vault").put("version", 1))
        }
        if (!authorized(session)) return json(Response.Status.UNAUTHORIZED, JSONObject().put("ok", false).put("error", "配对令牌无效"))
        return try {
            when {
                session.uri == "/v1/assets" && session.method == Method.GET ->
                    json(Response.Status.OK, index.listAssets())
                session.uri == "/v1/snapshot" && session.method == Method.GET -> {
                    val value = index.snapshot() ?: return json(Response.Status.NOT_FOUND, JSONObject().put("error", "本地数据库还没有快照"))
                    newFixedLengthResponse(Response.Status.OK, "application/json; charset=utf-8", value).withCors()
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
                    index.putSnapshot(saved)
                    json(Response.Status.OK, JSONObject().put("ok", true).put("assetCount", assets.length())
                        .put("updatedAt", System.currentTimeMillis()))
                }
                else -> json(Response.Status.NOT_FOUND, JSONObject().put("error", "未知的拾帧数据库接口"))
            }
        } catch (error: Exception) {
            json(Response.Status.BAD_REQUEST, JSONObject().put("ok", false).put("error", error.message ?: "本地数据库请求失败"))
        }
    }
}
