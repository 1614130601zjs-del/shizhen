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
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.security.SecureRandom

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var treeUri: Uri? = null
    private var vaultServer: ShizhenVaultServer? = null
    private var vaultToken: String = ""
    private var vaultServerStarted = false
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
        val prefs = getSharedPreferences("vault", MODE_PRIVATE)
        vaultToken = prefs.getString("vaultToken", null) ?: ByteArray(32).also {
            SecureRandom().nextBytes(it)
        }.let { Base64.encodeToString(it, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING) }
            .also { prefs.edit().putString("vaultToken", it).apply() }
        vaultServer = ShizhenVaultServer(this, vaultToken, File(filesDir, "vault-db").apply { mkdirs() })
        try {
            vaultServer?.start(5000, false)
            vaultServerStarted = true
        } catch (error: Exception) {
            vaultServerStarted = false
            vaultServer?.stop()
            vaultServer = null
            Toast.makeText(this, "本地数据库服务启动失败：" + (error.message ?: "未知错误"), Toast.LENGTH_LONG).show()
        }
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

    override fun onDestroy() {
        vaultServer?.stop()
        vaultServer = null
        vaultServerStarted = false
        super.onDestroy()
    }

    inner class VaultBridge {
        @JavascriptInterface fun localServerInfo(): String =
            JSONObject().put("url", "http://127.0.0.1:8765")
                .put("token", vaultToken).put("running", vaultServerStarted).toString()
        @JavascriptInterface fun hasExternalFolder(): Boolean = treeUri != null
        @JavascriptInterface fun importBackupZip(base64: String): String = try {
            val bytes = Base64.decode(base64, Base64.DEFAULT)
            VaultBackupImporter.import(this@MainActivity, bytes, ::writeBytes).toString()
        } catch (error: Exception) {
            JSONObject().put("ok", false).put("error", error.message ?: "备份包导入失败").toString()
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
