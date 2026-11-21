(() => {
  const $ = selector => document.querySelector(selector);
  const native = window.ShizhenNative;
  const folderStatus = $('#folderStatus'), importStatus = $('#importStatus'), fileList = $('#fileList');
  const categories = [
    ['characters','角色库'],['presets','预设库'],['vibes','画师串 / Vibe'],['prompts','提示词库'],
    ['combinations','组合配置'],['bindings','快捷绑定'],['records','生成记录'],['workLibrary','作品素材库'],
    ['viewfinderRoles','取景器角色']
  ];
  let settings = {}, category = 'characters', editingIndex = -1;
  const encodeBase64 = buffer => { const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary); };
  const safeName = name => String(name || 'asset').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').replace(/^\.+/,'_');
  const formatSize = bytes => bytes<1024?bytes+' B':bytes<1048576?(bytes/1024).toFixed(1)+' KB':(bytes/1048576).toFixed(1)+' MB';
  function setStatus(message, bad=false) { $('#saveState').textContent=message; $('#saveState').style.color=bad?'#a33':'var(--muted)'; }
  function updateStats() {
    try {
      const stats=JSON.parse(native.localDatabaseStats()),assets=stats.assets||[],snaps=stats.snapshots||[];
      const bytes=assets.reduce((sum,item)=>sum+Number(item.size||0),0);
      $('#vaultDatabaseStats').textContent='数据库：'+assets.length+' 个原始文件 · '+snaps.length+' 个历史快照 · '+formatSize(bytes);
      const list=$('#snapshotList');list.replaceChildren();
      if(!snaps.length){list.innerHTML='<div class="empty">还没有历史快照。首次从插件同步或在工作台保存后会建立快照。</div>';return;}
      snaps.forEach(s=>{const row=document.createElement('div');row.className='item';const info=document.createElement('div'),name=document.createElement('strong'),meta=document.createElement('small');name.textContent=s.current?'当前版本':'历史版本';meta.textContent=new Date(Number(s.createdAt)).toLocaleString()+' · '+s.id;info.append(name,meta);const tag=document.createElement('small');tag.textContent=s.current?'CURRENT':'';row.append(info,tag);list.append(row);});
    } catch(e) { $('#vaultDatabaseStats').textContent='数据库索引读取失败：'+e.message; }
  }
  function loadLibrary() {
    try { settings=JSON.parse(native.getLibrary()||'{}');if(!settings||Array.isArray(settings)||typeof settings!=='object')settings={}; }
    catch(e){setStatus('读取失败：'+e.message,true);settings={};}
    categories.forEach(([key])=>{if(!Array.isArray(settings[key]))settings[key]=[];});
    renderCategories();renderList();updateStats();
  }
  function titleOf(item,index) {
    if(typeof item==='string')return item.slice(0,70)||'条目 '+(index+1);
    if(!item||typeof item!=='object')return '条目 '+(index+1);
    return item.name||item.title||item.characterName||item.characterKey||item.displayName||item.prompt||item.id||item.key||('条目 '+(index+1));
  }
  function renderCategories() {
    const tabs=$('#categoryTabs');tabs.replaceChildren();
    categories.forEach(([key,label])=>{const b=document.createElement('button');b.textContent=label;b.className=key===category?'active':'';b.onclick=()=>{category=key;editingIndex=-1;$('#editor').classList.add('hidden');renderCategories();renderList();};tabs.append(b);});
    $('#sectionTitle').textContent=categories.find(x=>x[0]===category)?.[1]||category;
  }
  function renderList() {
    const list=$('#libraryList');list.replaceChildren();const items=settings[category]||[];
    $('#sectionCount').textContent=items.length+' 条';
    items.forEach((item,index)=>{const row=document.createElement('div');row.className='item';const info=document.createElement('div'),name=document.createElement('strong'),meta=document.createElement('small');
      name.textContent=titleOf(item,index);meta.textContent=(item&&typeof item==='object'?Object.keys(item).length+' 个字段':'文本条目')+' · 第 '+(index+1)+' 条';info.append(name,meta);
      const edit=document.createElement('button');edit.textContent='编辑';edit.onclick=()=>openEditor(index);row.append(info,edit);list.append(row);});
    if(!items.length)list.innerHTML='<div class="empty">这个分类还没有条目。可以点击「新增条目」创建。</div>';
  }
  function templateFor(key) {
    const id='sz-'+Date.now().toString(36);
    if(key==='characters')return {id,name:'新角色',appearance:'',characterAvatar:'',updatedAt:Date.now()};
    if(key==='presets')return {id,name:'新预设',prompt:'',negative:'',createdAt:Date.now()};
    if(key==='vibes')return {id,name:'新 Vibe',image:'',strength:0.6,informationExtracted:'',raw:''};
    if(key==='prompts')return {id,name:'新提示词',prompt:'',negative:''};
    if(key==='records')return {id,prompt:'',negative:'',image:'',createdAt:Date.now()};
    if(key==='workLibrary')return {id,name:'新素材',image:'',type:'image',createdAt:Date.now()};
    if(key==='combinations')return {id,name:'新组合',artistIndex:-1,vibeIndex:-1};
    if(key==='bindings')return {id,name:'新绑定',presetIndex:-1,vibeIndex:-1,combinationIndex:-1};
    if(key==='viewfinderRoles')return {id,name:'新角色槽位',characterKey:'',appearance:''};
    return {id,name:'新条目'};
  }
  function openEditor(index) {
    editingIndex=index;const item=settings[category][index];$('#editorTitle').textContent=(index<0?'新增':'编辑')+' · '+(titleOf(item,Math.max(index,0)));
    $('#itemJson').value=JSON.stringify(item,null,2);$('#editor').classList.remove('hidden');$('#editor').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function persist() {
    try {
      const result=JSON.parse(native.saveLibrary(JSON.stringify(settings)));
      if(!result.ok)throw new Error(result.error||'保存失败');
      setStatus('已保存 · 新快照 '+result.snapshotId.slice(0,8));$('#editor').classList.add('hidden');editingIndex=-1;renderList();updateStats();return true;
    } catch(e){setStatus('保存失败：'+e.message,true);return false;}
  }
  $('#addItem').onclick=()=>{settings[category].push(templateFor(category));openEditor(settings[category].length-1);};
  $('#saveItem').onclick=()=>{try{const parsed=JSON.parse($('#itemJson').value);if(!parsed||typeof parsed!=='object')throw new Error('条目必须是 JSON 对象或数组');settings[category][editingIndex]=parsed;persist();}catch(e){setStatus('JSON 格式错误：'+e.message,true);}};
  $('#deleteItem').onclick=()=>{if(editingIndex<0)return;if(!confirm('确定从当前拾帧库删除这条内容？旧历史快照仍会保留。'))return;settings[category].splice(editingIndex,1);persist();};
  $('#cancelEdit').onclick=()=>{$('#editor').classList.add('hidden');editingIndex=-1;};
  $('#reloadLibrary').onclick=loadLibrary;
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));$('#studio').classList.toggle('hidden',button.dataset.tab!=='studio');$('#transfer').classList.toggle('hidden',button.dataset.tab!=='transfer');}));
  function updateFolderStatus(external){folderStatus.textContent=external?'已选择外部文件夹；手动导入文件会写入这里，插件同步数据库仍保存在 App 私有目录。':'插件同步数据库当前保存在 App 私有目录。';}
  function refreshFiles(){
    updateStats();try{const result=JSON.parse(native.listFiles());if(!result.ok)throw new Error(result.error);const files=result.files||[];fileList.replaceChildren();if(!files.length){fileList.innerHTML='<div class="empty">尚无手动导入的文件。</div>';return;}files.sort((a,b)=>a.path.localeCompare(b.path));files.forEach(file=>{const row=document.createElement('div');row.className='item';const info=document.createElement('div'),name=document.createElement('strong'),size=document.createElement('small');name.textContent=file.path;size.textContent=formatSize(file.size);info.append(name,size);row.append(info);fileList.append(row);});}catch(e){fileList.textContent='读取失败：'+e.message;}
  }
  $('#backupFile').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;importStatus.textContent='正在校验备份包…';try{const result=JSON.parse(native.importBackupZip(encodeBase64(await file.arrayBuffer())));if(!result.ok)throw new Error(result.error);importStatus.textContent='已导入 '+result.imported+' 个文件（'+formatSize(result.bytes)+'），备份编号：'+result.backupId;refreshFiles();}catch(e){importStatus.textContent='导入失败：'+e.message;}event.target.value='';});
  $('#files').addEventListener('change',async event=>{const files=Array.from(event.target.files||[]);let saved=0;const failures=[];for(const file of files){try{const result=JSON.parse(native.saveFile('inbox/'+Date.now()+'_'+safeName(file.name),encodeBase64(await file.arrayBuffer())));if(!result.ok)throw new Error(result.error);saved++;}catch(e){failures.push(file.name+'：'+e.message);}}importStatus.textContent='已保存 '+saved+' 个文件'+(failures.length?'；失败：'+failures.join('；'):'');event.target.value='';refreshFiles();});
  $('#refresh').onclick=refreshFiles;
  $('#testTavern').onclick=()=>{const address=$('#tavernAddress').value.trim();tavernStatus.textContent='正在检测本机酒馆服务…';try{const result=JSON.parse(native.testTavern(address));tavernStatus.textContent=result.message||(result.ok?'连接成功':'连接失败');}catch(e){tavernStatus.textContent='检测失败：'+e.message;}};
  try{const info=JSON.parse(native.localServerInfo());$('#vaultServerUrl').textContent=info.url;$('#vaultServerToken').textContent=info.token;$('#vaultServerStatus').textContent=info.running?'本地数据库服务已启动。':'本地数据库服务未启动，请重启 App 后重试。';}catch(e){$('#vaultServerStatus').textContent='无法读取配对信息：'+e.message;}
  $('#tavernAddress').value=native.savedTavernAddress();window.ShizhenVault={folderChanged:updateFolderStatus};updateFolderStatus(native.hasExternalFolder());
  loadLibrary();refreshFiles();
})();