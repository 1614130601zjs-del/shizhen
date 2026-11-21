(() => {
  const $ = selector => document.querySelector(selector);
  const folderStatus = $('#folderStatus');
  const importStatus = $('#importStatus');
  const fileList = $('#fileList');
  const tavernStatus = $('#tavernStatus');
  const native = window.ShizhenNative;
  try {
    const info = JSON.parse(native.localServerInfo());
    $('#vaultServerUrl').textContent = info.url;
    $('#vaultServerToken').textContent = info.token;
    $('#vaultServerStatus').textContent = info.running
      ? '本地数据库服务已启动。拾帧插件可在 App 保持前台时连接。'
      : '本地数据库服务未启动，请重启 App 后重试。';
  } catch (error) {
    $('#vaultServerStatus').textContent = '无法读取配对信息：' + error.message;
  }
  function updateDatabaseStats() {
    try {
      const stats = JSON.parse(native.localDatabaseStats());
      const assets = stats.assets || [], snapshots = stats.snapshots || [];
      const bytes = assets.reduce((sum, item) => sum + Number(item.size || 0), 0);
      $('#vaultDatabaseStats').textContent = '数据库：' + assets.length + ' 个原始文件 · ' +
        snapshots.length + ' 个历史快照 · ' + formatSize(bytes);
    } catch (error) {
      $('#vaultDatabaseStats').textContent = '数据库索引读取失败：' + error.message;
    }
  }
  const encodeBase64 = buffer => {
    const bytes = new Uint8Array(buffer); let binary = ''; const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    return btoa(binary);
  };
  const safeName = name => String(name || 'asset').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+/, '_');
  function updateFolderStatus(external) {
    folderStatus.textContent = external
      ? '已连接你选择的手机文件夹。新导入的素材会写入这个位置。'
      : '当前使用 App 私有存储。可在顶部选择一个手机文件夹作为长期素材库。';
  }
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
  function refresh() {
    updateDatabaseStats();
    try {
      const result = JSON.parse(native.listFiles());
      if (!result.ok) throw new Error(result.error);
      const files = result.files || []; fileList.innerHTML = '';
      if (!files.length) { fileList.innerHTML = '<div class="empty">这里还没有素材。导入文件后会显示在这里。</div>'; return; }
      files.sort((a,b) => a.path.localeCompare(b.path));
      files.forEach(file => {
        const row = document.createElement('div'); row.className = 'item';
        const info = document.createElement('div'); const name = document.createElement('strong');
        name.textContent = file.path; const size = document.createElement('small'); size.textContent = formatSize(file.size);
        info.append(name,size); row.append(info); fileList.append(row);
      });
    } catch (error) { fileList.textContent = '读取失败：' + error.message; }
  }
  $('#backupFile').addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    importStatus.textContent = '正在校验备份包…';
    try {
      const result = JSON.parse(native.importBackupZip(encodeBase64(await file.arrayBuffer())));
      if (!result.ok) throw new Error(result.error);
      importStatus.textContent = '备份包校验通过，已导入 ' + result.imported + ' 个文件（' + formatSize(result.bytes) + '），备份编号：' + result.backupId;
      refresh();
    } catch (error) { importStatus.textContent = '备份包导入失败：' + error.message; }
    event.target.value = '';
  });
  $('#files').addEventListener('change', async event => {
    const files = Array.from(event.target.files || []); if (!files.length) return;
    let saved = 0; const failures = [];
    for (const file of files) {
      try {
        const result = JSON.parse(native.saveFile('inbox/' + Date.now() + '_' + safeName(file.name), encodeBase64(await file.arrayBuffer())));
        if (!result.ok) throw new Error(result.error); saved++;
      } catch (error) { failures.push(file.name + '：' + error.message); }
    }
    importStatus.textContent = '已保存 ' + saved + ' 个文件' + (failures.length ? '；失败：' + failures.join('；') : '');
    event.target.value = ''; refresh();
  });
  $('#refresh').addEventListener('click', refresh);
  $('#testTavern').addEventListener('click', () => {
    const address = $('#tavernAddress').value.trim();
    tavernStatus.textContent = '正在检测本机酒馆服务…';
    try {
      const result = JSON.parse(native.testTavern(address));
      tavernStatus.textContent = result.message || (result.ok ? '连接成功' : '连接失败');
    } catch (error) { tavernStatus.textContent = '检测失败：' + error.message; }
  });
  $('#tavernAddress').value = native.savedTavernAddress();
  window.ShizhenVault = { folderChanged: updateFolderStatus };
  updateFolderStatus(native.hasExternalFolder()); refresh();
})();