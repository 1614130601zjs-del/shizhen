package com.shizhen.vault

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.Toast
import androidx.documentfile.provider.DocumentFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.io.ByteArrayOutputStream
import java.security.MessageDigest
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var treeUri: Uri? = null
    private val pickFolderRequest = 4102

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val chooseFolder = Button(this).apply {
            text = "选择本地素材库文件夹"
            setOnClickListener { chooseVaultFolder() }
        }
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webChromeClient = WebChromeClient()
            webViewClient = WebViewClient()
            addJavascriptInterface(VaultBridge(), "ShizhenNative")
        }
        root.addView(chooseFolder, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        root.addView(webView, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)
        treeUri = getSharedPreferences("vault", MODE_PRIVATE)
            .getString("treeUri", null)?.let(Uri::parse)
        webView.loadUrl("file:///android_asset/index.html")
    }

    private fun chooseVaultFolder() {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or
            Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
        startActivityForResult(intent, pickFolderRequest)
    }

    @Deprecated("Deprecated API retained for broad device compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != pickFolderRequest || resultCode != RESULT_OK) return
        val uri = data?.data ?: return
        val flags = data.flags and (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        contentResolver.takePersistableUriPermission(uri, flags)
        treeUri = uri
        getSharedPreferences("vault", MODE_PRIVATE).edit().putString("treeUri", uri.toString()).apply()
        webView.evaluateJavascript("window.ShizhenVault && window.ShizhenVault.folderChanged(true)", null)
        Toast.makeText(this, "本地素材库位置已设置", Toast.LENGTH_SHORT).show()
    }

    private fun safeSegments(path: String): List<String> {
        val clean = path.replace('\\', '/').trim('/')
        require(clean.isNotBlank() && clean.split('/').all {
            it.isNotBlank() && it != "." && it != ".."
        }) { "无效的素材路径" }
        return clean.split('/')
    }

    private fun targetDocument(path: String, create: Boolean): DocumentFile {
        var current = DocumentFile.fromTreeUri(this, treeUri!!)
            ?: throw IOException("无法访问所选文件夹")
        val parts = safeSegments(path)
        parts.dropLast(1).forEach { part ->
            current = current.findFile(part) ?: if (create) {
                current.createDirectory(part) ?: throw IOException("无法创建目录：$part")
            } else throw IOException("目录不存在：$part")
        }
        val name = parts.last()
        return current.findFile(name) ?: if (create) {
            current.createFile("application/octet-stream", name)
                ?: throw IOException("无法创建文件：$name")
        } else throw IOException("文件不存在：$name")
    }

    private fun writeBytes(path: String, bytes: ByteArray) {
        if (treeUri == null) {
            val base = File(filesDir, "vault").canonicalFile
            val file = File(base, path)
            file.parentFile?.mkdirs()
            require(file.canonicalPath.startsWith(base.path + File.separator)) { "非法路径" }
            file.writeBytes(bytes)
            return
        }
        val target = targetDocument(path, true)
        contentResolver.openOutputStream(target.uri, "wt").use { stream ->
            (stream ?: throw IOException("无法打开目标文件")).write(bytes)
        }
    }

    private fun readBytes(path: String): ByteArray {
        if (treeUri == null) {
            val base = File(filesDir, "vault").canonicalFile
            val file = File(base, path)
            require(file.canonicalPath.startsWith(base.path + File.separator)) { "非法路径" }
            return file.readBytes()
        }
        return contentResolver.openInputStream(targetDocument(path, false).uri)?.use { it.readBytes() }
            ?: throw IOException("无法读取文件")
    }

    private fun listVault(): JSONArray {
        val result = JSONArray()
        if (treeUri == null) {
            val base = File(filesDir, "vault")
            if (base.exists()) base.walkTopDown().filter { it.isFile }.forEach {
                result.put(JSONObject().put("path", it.relativeTo(base).invariantSeparatorsPath).put("size", it.length()))
            }
            return result
        }
        fun walk(dir: DocumentFile, prefix: String) {
            dir.listFiles().forEach { child ->
                val path = if (prefix.isEmpty()) child.name.orEmpty() else "${prefix}/${child.name.orEmpty()}"
                if (child.isDirectory) walk(child, path)
                else result.put(JSONObject().put("path", path).put("size", child.length()))
            }
        }
        DocumentFile.fromTreeUri(this, treeUri!!)?.let { walk(it, "") }
        return result
    }

    private fun normalizedTavernBase(): String {
        val address = getSharedPreferences("vault", MODE_PRIVATE)
            .getString("tavernAddress", "http://127.0.0.1:8000") ?: "http://127.0.0.1:8000"
        val url = URL(address.trim().trimEnd('/'))
        require(url.protocol == "http" && url.host in setOf("127.0.0.1", "localhost", "::1")) {
            "只允许连接本机 SillyTavern"
        }
        return address.trim().trimEnd('/')
    }

    private fun postTavern(path: String, payload: JSONObject): ByteArray {
        val connection = (URL("${normalizedTavernBase()}/api/${path.trimStart('/')}").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 8000
            readTimeout = 30000
            doOutput = true
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
            setRequestProperty("Accept", "application/json, image/png, application/octet-stream")
        }
        try {
            connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val bytes = stream?.use { it.readBytes() } ?: ByteArray(0)
            if (status !in 200..299) {
                val detail = String(bytes, Charsets.UTF_8).take(300)
                throw IOException("酒馆 API 返回 HTTP $status：$detail")
            }
            return bytes
        } finally {
            connection.disconnect()
        }
    }

    private fun archiveSafeName(value: String): String {
        val cleaned = value.replace(Regex("""[\\/:*?"<>|\u0000-\u001f]"""), "_")
            .trim().trim('.').take(100)
        return cleaned.ifBlank { "unnamed" }
    }

    private fun createTavernBackup(): JSONObject {
        val assets = JSONArray()
        val files = linkedMapOf<String, ByteArray>()
        var totalBytes = 0L
        fun addAsset(path: String, bytes: ByteArray, kind: String, displayName: String) {
            totalBytes += bytes.size
            require(totalBytes <= 512L * 1024L * 1024L) { "本次导出超过 512 MB 安全限制，请分批导出" }
            require(path !in files) { "导出文件名冲突：$path" }
            files[path] = bytes
            val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
                .joinToString("") { "%02x".format(it) }
            assets.put(JSONObject().put("path", path).put("size", bytes.size)
                .put("sha256", digest).put("type", kind).put("name", displayName))
        }

        val characters = JSONArray(String(postTavern("characters/all", JSONObject()), Charsets.UTF_8))
        for (i in 0 until characters.length()) {
            val character = characters.getJSONObject(i)
            val avatar = character.optString("avatar")
            if (avatar.isBlank() || !avatar.endsWith(".png", true)) continue
            val png = postTavern("characters/export", JSONObject()
                .put("avatar_url", avatar).put("format", "png"))
            addAsset("characters/${archiveSafeName(avatar)}", png, "character", character.optString("name", avatar))
        }

        val worlds = JSONArray(String(postTavern("worldinfo/list", JSONObject()), Charsets.UTF_8))
        for (i in 0 until worlds.length()) {
            val world = worlds.getJSONObject(i)
            val fileId = world.optString("file_id")
            if (fileId.isBlank()) continue
            val raw = postTavern("worldinfo/get", JSONObject().put("name", fileId))
            val parsed = JSONObject(String(raw, Charsets.UTF_8))
            val filename = archiveSafeName(fileId) + ".json"
            addAsset("worldbooks/$filename", parsed.toString(2).toByteArray(Charsets.UTF_8),
                "worldbook", world.optString("name", fileId))
        }

        require(files.isNotEmpty()) { "酒馆中没有找到可导出的角色卡或世界书" }
        val manifest = JSONObject().put("format", "shizhen-vault-backup")
            .put("version", 1).put("createdAt", System.currentTimeMillis())
            .put("source", "SillyTavern local API").put("assets", assets)
        val archiveBuffer = ByteArrayOutputStream()
        ZipOutputStream(archiveBuffer).use { zip ->
            files.forEach { (path, bytes) ->
                zip.putNextEntry(ZipEntry(path)); zip.write(bytes); zip.closeEntry()
            }
            zip.putNextEntry(ZipEntry("manifest.json"))
            zip.write(manifest.toString(2).toByteArray(Charsets.UTF_8))
            zip.closeEntry()
        }
        val backupName = "tavern-${System.currentTimeMillis()}.zip"
        val archive = archiveBuffer.toByteArray()
        writeBytes("exports/$backupName", archive)
        return JSONObject().put("ok", true).put("backupName", backupName)
            .put("path", "exports/$backupName").put("characters", characters.length())
            .put("worldbooks", worlds.length()).put("files", files.size)
            .put("bytes", totalBytes).put("archiveBytes", archive.size)
    }

    private fun probeLocalTavern(address: String): JSONObject {
        val url = URL(address.trim().trimEnd('/'))
        require(url.protocol == "http" && url.host in setOf("127.0.0.1", "localhost", "::1")) {
            "出于安全考虑，目前只允许连接本机 127.0.0.1 / localhost"
        }
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 3500
            readTimeout = 3500
            instanceFollowRedirects = false
        }
        return try {
            val code = connection.responseCode
            JSONObject().put("ok", code in 200..399)
                .put("httpStatus", code)
                .put("message", if (code in 200..399) "已连接到本机服务。此检测只确认端口可访问，尚未完成酒馆 API 配对。" else "本机服务有响应，但返回 HTTP $code。")
        } finally {
            connection.disconnect()
        }
    }

    inner class VaultBridge {
        @JavascriptInterface fun hasExternalFolder(): Boolean = treeUri != null
        @JavascriptInterface fun importBackupZip(base64: String): String = try {
            val bytes = Base64.decode(base64, Base64.DEFAULT)
            VaultBackupImporter.import(this@MainActivity, bytes, ::writeBytes).toString()
        } catch (error: Exception) {
            JSONObject().put("ok", false).put("error", error.message ?: "备份包导入失败").toString()
        }
        @JavascriptInterface fun exportTavernBackup(): String = try {
            createTavernBackup().toString()
        } catch (error: Exception) {
            JSONObject().put("ok", false).put("error", error.message ?: "酒馆素材导出失败").toString()
        }
        @JavascriptInterface fun savedTavernAddress(): String =
            getSharedPreferences("vault", MODE_PRIVATE).getString("tavernAddress", "http://127.0.0.1:8000")!!
        @JavascriptInterface fun testTavern(address: String): String = try {
            val result = probeLocalTavern(address)
            if (result.optBoolean("ok")) {
                getSharedPreferences("vault", MODE_PRIVATE).edit().putString("tavernAddress", address.trim().trimEnd('/')).apply()
            }
            result.toString()
        } catch (error: Exception) {
            JSONObject().put("ok", false).put("message", error.message ?: "连接失败").toString()
        }
        @JavascriptInterface fun saveFile(path: String, base64: String): String = try {
            writeBytes(path, Base64.decode(base64, Base64.DEFAULT))
            JSONObject().put("ok", true).toString()
        } catch (error: Exception) {
            JSONObject().put("ok", false).put("error", error.message ?: "保存失败").toString()
        }
        @JavascriptInterface fun readFile(path: String): String = try {
            JSONObject().put("ok", true)
                .put("base64", Base64.encodeToString(readBytes(path), Base64.NO_WRAP)).toString()
        } catch (error: Exception) {
            JSONObject().put("ok", false).put("error", error.message ?: "读取失败").toString()
        }
        @JavascriptInterface fun listFiles(): String = try {
            JSONObject().put("ok", true).put("files", listVault()).toString()
        } catch (error: Exception) {
            JSONObject().put("ok", false).put("error", error.message ?: "读取目录失败").toString()
        }
    }
}
