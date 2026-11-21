(() => {
'use strict';
const $=(s,root=document)=>root.querySelector(s),$$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const native=window.ShizhenNative;
function showPage(page){
 $$('.ql-tab').forEach(b=>{const on=b.dataset.page===page;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
 $$('.ql-page').forEach(p=>{const on=p.dataset.pagePanel===page;p.hidden=!on;p.classList.toggle('active',on);});
}
$$('.ql-tab').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
$$('.ql-subtabs').forEach(nav=>nav.addEventListener('click',e=>{
 const b=e.target.closest('[data-subpage]');if(!b)return;
 const scope=nav.closest('.ql-card')||nav.closest('.ql-page')||document,key=b.dataset.subpage;
 $$('[data-subpage]',nav).forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-selected',String(on));});
 $$('[data-subpage-panel]',scope).forEach(p=>{if(nav.parentElement.contains(p))p.hidden=p.dataset.subpagePanel!==key;});
}));
const set=(id,value)=>{const e=$('#'+id);if(e)e.textContent=value;};
const bytes=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';
const parse=v=>{try{return JSON.parse(v)}catch(e){return {ok:false,error:e.message}}};
function refresh(){
 if(!native){set('sz-vault-server','原生数据库服务不可用');return;}
 const info=parse(native.localServerInfo()),stats=parse(native.localDatabaseStats()),assets=stats.assets||[],snaps=stats.snapshots||[];
 set('sz-vault-server',info.running?'本地数据库服务运行中':'本地数据库服务未启动');
 $('#sz-vault-url').value=info.url||'http://127.0.0.1:8765';$('#sz-vault-token').value=info.token||'';
 const total=assets.reduce((n,a)=>n+Number(a.size||0),0);
 set('sz-vault-stats','资源 '+assets.length+' 个 · '+bytes(total)+' · 历史快照 '+snaps.length+' 个');
 const list=$('#sz-snapshot-list');list.replaceChildren();
 if(!snaps.length)list.textContent='暂无历史快照。完成首次插件同步后会在这里显示。';
 snaps.forEach(s=>{const row=document.createElement('div');row.className='ql-record';const title=document.createElement('strong'),meta=document.createElement('p');title.textContent=s.current?'当前版本':'历史版本';meta.className='ql-muted';meta.textContent=new Date(Number(s.createdAt)).toLocaleString()+' · '+s.id;row.append(title,meta);list.append(row);});
}
function copy(v){const t=document.createElement('textarea');t.value=v;document.body.append(t);t.select();try{document.execCommand('copy')}catch(e){}t.remove();}
$('#sz-copy-url')?.addEventListener('click',()=>copy($('#sz-vault-url').value));
$('#sz-copy-token')?.addEventListener('click',()=>copy($('#sz-vault-token').value));
$('#sz-test-tavern')?.addEventListener('click',()=>{const r=parse(native.testTavern($('#sz-tavern-address').value.trim()));set('sz-tavern-status',r.message||(r.ok?'本机服务可访问':'连接失败：'+(r.error||'未知错误')));});
if(native?.savedTavernAddress)$('#sz-tavern-address').value=native.savedTavernAddress();
$('#sz-choose-folder')?.addEventListener('click',()=>{if(native?.chooseExternalFolder)native.chooseExternalFolder();else set('sz-folder-status','此版本尚未接入目录授权入口');});
$('#sz-import-files')?.addEventListener('change',async e=>{
 let count=0;const errors=[];
 for(const f of Array.from(e.target.files||[])){try{const a=new Uint8Array(await f.arrayBuffer());let bin='';for(let i=0;i<a.length;i+=0x8000)bin+=String.fromCharCode(...a.subarray(i,i+0x8000));const safe=f.name.replace(/[\\/:*?"<>|]/g,'_');const r=parse(native.saveFile('inbox/'+Date.now()+'_'+safe,btoa(bin)));if(!r.ok)throw new Error(r.error);count++;}catch(err){errors.push(f.name+': '+err.message);}}
 set('sz-import-status','已导入 '+count+' 个文件'+(errors.length?'；失败：'+errors.join('；'):''));
 e.target.value='';refresh();
});
$('#sz-refresh-files')?.addEventListener('click',()=>{const r=parse(native.listFiles()),list=$('#sz-file-list');list.replaceChildren();if(!r.ok){list.textContent=r.error||'读取失败';return;}(r.files||[]).forEach(f=>{const p=document.createElement('p');p.className='ql-muted';p.textContent=f.path+' · '+bytes(Number(f.size||0));list.append(p);});if(!r.files?.length)list.textContent='暂无手动导入文件。';});
window.ShizhenVault={folderChanged:ready=>set('sz-folder-status',ready?'已选择外部文件夹':'尚未选择外部文件夹')};
if(native){set('sz-folder-status',native.hasExternalFolder()?'已选择外部文件夹':'尚未选择外部文件夹');refresh();}
showPage('generate');
})();