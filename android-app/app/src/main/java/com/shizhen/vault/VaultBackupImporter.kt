package com.shizhen.vault

import android.content.Context
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.security.MessageDigest
import java.util.zip.ZipInputStream

object VaultBackupImporter {
    private const val MAX_TOTAL_BYTES = 512L * 1024L * 1024L
    private const val MAX_MANIFEST_BYTES = 4L * 1024L * 1024L

    fun import(context: Context, archive: ByteArray, writeFile: (String, ByteArray) -> Unit): JSONObject {
        require(archive.isNotEmpty()) { "备份包为空" }
        val entries = linkedMapOf<String, ByteArray>()
        var total = 0L
        ZipInputStream(ByteArrayInputStream(archive)).use { zip ->
            while (true) {
                val entry = zip.nextEntry ?: break
                if (entry.isDirectory) { zip.closeEntry(); continue }
                val name = entry.name.replace('\\', '/')
                require(!name.startsWith("/") && name.split('/').none { it == ".." || it == "." || it.isBlank() }) {
                    "备份包包含非法路径"
                }
                require(name !in entries) { "备份包存在重复文件：$name" }
                val limit = if (name == "manifest.json") MAX_MANIFEST_BYTES else MAX_TOTAL_BYTES
                val out = java.io.ByteArrayOutputStream()
                val buffer = ByteArray(64 * 1024)
                while (true) {
                    val count = zip.read(buffer)
                    if (count < 0) break
                    total += count
                    require(total <= MAX_TOTAL_BYTES) { "备份包超过 512 MB 安全限制" }
                    require(out.size().toLong() + count <= limit) { "文件超过允许大小：$name" }
                    out.write(buffer, 0, count)
                }
                entries[name] = out.toByteArray()
                zip.closeEntry()
            }
        }
        val manifestBytes = entries["manifest.json"] ?: throw IllegalArgumentException("缺少 manifest.json")
        val manifest = JSONObject(String(manifestBytes, Charsets.UTF_8))
        require(manifest.optString("format") == "shizhen-vault-backup") { "不是拾帧备份包" }
        require(manifest.optInt("version") == 1) { "暂不支持该备份包版本" }
        val assets = manifest.optJSONArray("assets") ?: throw IllegalArgumentException("备份清单缺少 assets")
        require(assets.length() <= 10000) { "备份素材数量超出限制" }
        val validated = mutableListOf<Pair<String, ByteArray>>()
        val seen = mutableSetOf<String>()
        for (i in 0 until assets.length()) {
            val item = assets.getJSONObject(i)
            val path = item.optString("path").replace('\\', '/')
            require(path.isNotBlank() && !path.startsWith("/") &&
                path.split('/').none { it.isBlank() || it == "." || it == ".." }) { "素材清单包含非法路径" }
            require(seen.add(path)) { "素材清单存在重复路径：$path" }
            val bytes = entries[path] ?: throw IllegalArgumentException("备份文件缺失：$path")
            require(item.optLong("size", -1L) == bytes.size.toLong()) { "文件大小校验失败：$path" }
            val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
                .joinToString("") { "%02x".format(it) }
            require(digest.equals(item.optString("sha256"), ignoreCase = true)) { "SHA-256 校验失败：$path" }
            validated += path to bytes
        }
        require(validated.isNotEmpty()) { "备份清单中没有素材" }
        val backupId = "backup-" + System.currentTimeMillis()
        validated.forEach { (path, bytes) -> writeFile("$backupId/$path", bytes) }
        writeFile("$backupId/manifest.json", manifestBytes)
        return JSONObject().put("ok", true).put("backupId", backupId)
            .put("imported", validated.size).put("bytes", validated.sumOf { it.second.size.toLong() })
    }
}
