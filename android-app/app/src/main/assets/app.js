(() => {
'use strict';
const $=(s,root=document)=>root.querySelector(s),$$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const native=window.ShizhenNative;
let library={};
const PALETTES={
 mist:{accent:'#7f98ad',panel:'rgba(224,232,238,.96)',card:'rgba(239,243,246,.92)',text:'#344653',muted:'#657784',border:'rgba(100,125,145,.28)',field:'rgba(250,252,253,.92)'},
 sage:{accent:'#849b8c',panel:'rgba(225,234,226,.97)',card:'rgba(240,245,239,.94)',text:'#3c5044',muted:'#687a6d',border:'rgba(103,133,111,.28)',field:'rgba(250,252,248,.94)'},
 lavender:{accent:'#9a91b0',panel:'rgba(233,229,240,.97)',card:'rgba(246,243,249,.94)',text:'#4c465b',muted:'#777083',border:'rgba(140,127,164,.28)',field:'rgba(253,251,255,.94)'},
 oat:{accent:'#b09c82',panel:'rgba(239,232,220,.97)',card:'rgba(250,246,238,.94)',text:'#554b3e',muted:'#817565',border:'rgba(158,137,109,.28)',field:'rgba(255,252,246,.94)'},
 ink:{accent:'#8296aa',panel:'rgba(39,49,61,.98)',card:'rgba(49,61,74,.96)',text:'#e2e8ee',muted:'#aebbc7',border:'rgba(145,164,181,.25)',field:'rgba(31,41,52,.96)'}
};
const STYLE_NAMES=['pixel','ccd','polaroid','scroll','cyber','win','crab','cat','news','purikura','receipt','comic'];
const parse=v=>{try{return JSON.parse(v)}catch(e){return {ok:false,error:e.message}}};
const set=(id,value)=>{const e=$('#'+id);if(e)e.textContent=value;};
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
function persist(){
 if(!native?.saveLibrary){set('sz-theme-status','当前版本无法写入本地数据库');return false;}
 const result=parse(native.saveLibrary(JSON.stringify(library)));
 if(!result.ok){set('sz-theme-status','保存失败：'+(result.error||'未知错误'));return false;}
 set('sz-theme-status','外观设置已保存到拾帧本地数据库。');return true;
}
function customStyles(){return Array.isArray(library.customStyles)?library.customStyles.filter(x=>x&&x.id&&typeof x.css==='string'):[];}
function renderCustomStyles(){
 const select=$('#ql-ui-style'),pick=$('#ql-cs-pick');if(!select)return;
 select.querySelectorAll('option[data-custom]').forEach(o=>o.remove());
 customStyles().forEach(item=>{const o=document.createElement('option');o.value='custom:'+item.id;o.dataset.custom='1';o.textContent='✦ '+(item.name||'自定义风格');select.append(o);});
 const current=library.uiStyle||'default';select.value=[...select.options].some(o=>o.value===current)?current:'default';
 if(pick){const keep=pick.value;pick.replaceChildren(new Option('＋ 新建风格',''));customStyles().forEach(item=>pick.add(new Option(item.name||'自定义风格',item.id)));pick.value=[...pick.options].some(o=>o.value===keep)?keep:'';}
}
function applyAppearance(){
 const panel=$('#shizhen-panel'),root=document.documentElement;if(!panel)return;
 const preset=library.themePreset||'mist',color=/^#[0-9a-f]{6}$/i.test(library.themeColor||'')?library.themeColor:'#9aaec2';
 const p=preset==='custom'?{accent:color,panel:'rgba(242,246,249,.98)',card:'rgba(252,253,254,.98)',text:'#35434d',muted:'#687680',border:'color-mix(in srgb, '+color+' 32%, transparent)',field:'rgba(255,255,255,.98)'}:(PALETTES[preset]||PALETTES.mist);
 const vars={'--SmartThemeBodyColor':p.text,'--SmartThemeBorderColor':p.border,'--SmartThemeBlurTintColor':p.card,'--SmartThemeEmColor':p.accent,'--SmartThemeQuoteColor':p.muted,'--SmartThemeUnderlineColor':p.accent,'--ql-accent':p.accent,'--ql-panel':p.panel,'--ql-card':p.card,'--ql-text':p.text,'--ql-muted':p.muted,'--ql-border':p.border,'--ql-field':p.field,'--ql-button-bg':'color-mix(in srgb, '+p.accent+' 15%, '+p.card+')','--ql-button-hover':'color-mix(in srgb, '+p.accent+' 25%, '+p.card+')','--ql-button-active':'color-mix(in srgb, '+p.accent+' 34%, '+p.card+')','--ql-button-border':p.border,'--ql-button-text':p.text};
 for(const el of [root,panel])for(const [k,v] of Object.entries(vars))el.style.setProperty(k,v);
 panel.style.background='var(--ql-panel)';panel.style.color='var(--ql-text)';
 const style=String(library.uiStyle||'default'),custom=style.startsWith('custom:')?customStyles().find(x=>x.id===style.slice(7)):null;
 const named=STYLE_NAMES.includes(style)?style:'default';
 if(named==='default'||custom){panel.removeAttribute('data-ql-style');root.removeAttribute('data-ql-style');}
 else{panel.setAttribute('data-ql-style',named);root.setAttribute('data-ql-style',named);}
 if(custom){panel.setAttribute('data-ql-custom','1');root.setAttribute('data-ql-custom','1');}
 else{panel.removeAttribute('data-ql-custom');root.removeAttribute('data-ql-custom');}
 let cssNode=$('#ql-custom-style-css');if(!cssNode){cssNode=document.createElement('style');cssNode.id='ql-custom-style-css';document.head.append(cssNode);}cssNode.textContent=custom?custom.css:'';
 const tint=Math.max(0,Math.min(24,Number(library.uiTint??8)));
 const rgb=(hex)=>{const n=parseInt(hex.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];};
 const luma=a=>(.2126*a[0]+.7152*a[1]+.0722*a[2])/255;
 let accent=p.accent;if(style!=='default'&&style!=='custom'&&preset!=='mist'&&/^#[0-9a-f]{6}$/i.test(accent)){let c=rgb(accent),lum=luma(c);if((style==='ccd'||style==='cyber')&&lum<.3)c=c.map(v=>v+(255-v)*.45);else if(style!=='ccd'&&style!=='cyber'&&lum>.75)c=c.map(v=>v*.75);accent='#'+c.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');}
 const on=luma(rgb(accent))>.55?'#1b1b1b':'#ffffff';
 for(const el of [root,panel]){el.style.setProperty('--qs-user-accent',accent);el.style.setProperty('--qs-user-on',on);el.style.setProperty('--qs-tint',tint+'%');}
 const header=panel.querySelector('.ql-header');if(header){const d=new Date();header.setAttribute('data-ql-date',"'"+String(d.getFullYear()).slice(2)+' '+String(d.getMonth()+1).padStart(2,'0')+' '+String(d.getDate()).padStart(2,'0'));}
 if($('#ql-ui-style'))$('#ql-ui-style').value=style;
}
function loadAppearance(){
 if(!native?.getLibrary)return;
 const value=parse(native.getLibrary());if(value&&typeof value==='object'&&!value.error)library=value;
 if(!Array.isArray(library.customStyles))library.customStyles=[];
 $('#ql-theme-preset')&&($('#ql-theme-preset').value=library.themePreset||'mist');
 $('#ql-theme-color')&&($('#ql-theme-color').value=/^#[0-9a-f]{6}$/i.test(library.themeColor||'')?library.themeColor:'#9aaec2');
 $('#ql-theme-color-value')&&($('#ql-theme-color-value').textContent=$('#ql-theme-color').value.toUpperCase());
 $('#ql-ui-tint')&&($('#ql-ui-tint').value=String(Math.max(0,Math.min(24,Number(library.uiTint??8)))));
 $('#ql-ui-tint-value')&&($('#ql-ui-tint-value').textContent=$('#ql-ui-tint').value+'%');
 renderCustomStyles();applyAppearance();
}
function wireAppearance(){
 const preset=$('#ql-theme-preset'),color=$('#ql-theme-color'),style=$('#ql-ui-style'),tint=$('#ql-ui-tint');
 preset?.addEventListener('change',()=>{library.themePreset=preset.value;applyAppearance();persist();});
 color?.addEventListener('input',()=>{if($('#ql-theme-color-value'))$('#ql-theme-color-value').textContent=color.value.toUpperCase();});
 const hexToHsl=hex=>{const n=parseInt(hex.slice(1),16),r=((n>>16)&255)/255,g=((n>>8)&255)/255,b=(n&255)/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0,ss=0,ll=(max+min)/2;if(d){ss=d/(1-Math.abs(2*ll-1));if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;}return [Math.round(h),Math.round(ss*100),Math.round(ll*100)];};
 const hslToHex=(h,s,l)=>{s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),fn=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return '#'+[fn(0),fn(8),fn(4)].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');};
 const syncHsl=()=>{if(!color)return;const [h,s,l]=hexToHsl(color.value);if($('#ql-hsl-h'))$('#ql-hsl-h').value=h;if($('#ql-hsl-s'))$('#ql-hsl-s').value=s;if($('#ql-hsl-l'))$('#ql-hsl-l').value=Math.max(15,Math.min(85,l));};
 color?.addEventListener('input',syncHsl);syncHsl();
 const previewHsl=()=>{if(!color)return;color.value=hslToHex(Number($('#ql-hsl-h')?.value||0),Number($('#ql-hsl-s')?.value||0),Number($('#ql-hsl-l')?.value||50));if($('#ql-theme-color-value'))$('#ql-theme-color-value').textContent=color.value.toUpperCase();library.themePreset='custom';library.themeColor=color.value;applyAppearance();};
 ['h','s','l'].forEach(k=>$('#ql-hsl-'+k)?.addEventListener('input',previewHsl));
 $('#ql-theme-apply')?.addEventListener('click',()=>{library.themePreset='custom';library.themeColor=color?.value||'#9aaec2';if(preset)preset.value='custom';applyAppearance();persist();});
 $('#ql-theme-reset')?.addEventListener('click',()=>{library.themePreset='mist';delete library.themeCss;if(preset)preset.value='mist';applyAppearance();persist();});
 tint?.addEventListener('input',()=>{library.uiTint=Number(tint.value);$('#ql-ui-tint-value')&&($('#ql-ui-tint-value').textContent=tint.value+'%');applyAppearance();});
 tint?.addEventListener('change',persist);
 style?.addEventListener('change',()=>{library.uiStyle=style.value;applyAppearance();persist();});
 const pick=$('#ql-cs-pick'),name=$('#ql-cs-name'),css=$('#ql-cs-css');
 const loadPick=()=>{const item=customStyles().find(x=>x.id===pick?.value);if(name)name.value=item?.name||'';if(css)css.value=item?.css||'';};
 pick?.addEventListener('change',loadPick);
 $('#ql-cs-skeleton')?.addEventListener('click',()=>{if(css&&!css.value.trim())css.value='/* 拾帧自定义风格：可使用 #shizhen-panel、.ql-card、.ql-tab、.ql-primary 等选择器 */\n#shizhen-panel .ql-card { border-radius: 16px; }\n#shizhen-panel .ql-primary { font-weight: 700; }';});
 $('#ql-cs-save')?.addEventListener('click',()=>{const value=css?.value||'';if(!value.trim()){set('ql-cs-status','CSS 不能为空。');return;}let item=customStyles().find(x=>x.id===pick?.value);if(item){item.name=name?.value.trim()||'自定义风格';item.css=value;item.updatedAt=Date.now();}else{item={id:'cs'+Date.now().toString(36),name:name?.value.trim()||'自定义风格',css:value,updatedAt:Date.now()};library.customStyles.push(item);}library.uiStyle='custom:'+item.id;renderCustomStyles();if(pick)pick.value=item.id;applyAppearance();persist();set('ql-cs-status','已保存并应用「'+item.name+'」。');});
 $('#ql-cs-delete')?.addEventListener('click',()=>{const id=pick?.value;if(!id){set('ql-cs-status','请先选择自定义风格。');return;}library.customStyles=customStyles().filter(x=>x.id!==id);if(library.uiStyle==='custom:'+id)library.uiStyle='default';renderCustomStyles();loadPick();applyAppearance();persist();set('ql-cs-status','已删除自定义风格。');});
 $('#ql-cs-export')?.addEventListener('click',()=>{const item=customStyles().find(x=>x.id===pick?.value);if(!item){set('ql-cs-status','请先选择风格。');return;}downloadText(JSON.stringify({format:'shizhen-style-v1',name:item.name,css:item.css},null,2),'shizhen-style-'+item.name+'.json','application/json');});
 $('#ql-cs-import')?.addEventListener('click',()=>$('#ql-cs-file')?.click());
 $('#ql-cs-file')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const text=await file.text();let data;if(file.name.toLowerCase().endsWith('.css'))data={name:file.name.replace(/\.css$/i,''),css:text};else data=JSON.parse(text);if(typeof data.css!=='string'||!data.css.trim())throw new Error('文件中没有 CSS');const item={id:'cs'+Date.now().toString(36),name:String(data.name||'导入风格'),css:data.css,updatedAt:Date.now()};library.customStyles.push(item);library.uiStyle='custom:'+item.id;renderCustomStyles();if(pick)pick.value=item.id;loadPick();applyAppearance();persist();set('ql-cs-status','导入并应用成功。');}catch(err){set('ql-cs-status','导入失败：'+err.message);}e.target.value='';});
}
function downloadText(text,filename,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}
function copy(v){const t=document.createElement('textarea');t.value=v;document.body.append(t);t.select();try{document.execCommand('copy')}catch(e){}t.remove();}
const bytes=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';
let assetRows=[],assetOffset=0,assetServerInfo=null;
async function renderAssetBatch(reset=false){
 const list=$('#sz-asset-list'),more=$('#sz-asset-more');if(!list)return;
 if(reset){assetOffset=0;list.replaceChildren();}
 const batch=assetRows.slice(assetOffset,assetOffset+24);
 if(!assetRows.length){list.textContent='数据库中还没有同步图片。';if(more)more.hidden=true;return;}
 if(!batch.length){if(more)more.hidden=true;return;}
 for(const asset of batch){
  const row=document.createElement('div');row.className='ql-record';row.style.cssText='display:flex;align-items:center;gap:12px';
  const image=document.createElement('img');image.alt=asset.filename||'拾帧图片';image.loading='lazy';image.style.cssText='width:76px;height:76px;flex:0 0 76px;object-fit:cover;border-radius:10px;background:var(--ql-panel)';
  const info=document.createElement('div');info.style.cssText='min-width:0;flex:1';
  const title=document.createElement('strong'),meta=document.createElement('p');title.textContent=asset.filename||asset.id;title.style.cssText='display:block;overflow-wrap:anywhere';
  meta.className='ql-muted';meta.textContent=(asset.mime||'图片')+' · '+bytes(Number(asset.size||0));info.append(title,meta);row.append(image,info);list.append(row);
  if(assetServerInfo?.url&&assetServerInfo?.token){try{const response=await fetch(assetServerInfo.url.replace(/\/+$/,'')+'/v1/assets/'+encodeURIComponent(asset.id),{headers:{Authorization:'Bearer '+assetServerInfo.token}});if(!response.ok)throw new Error('HTTP '+response.status);image.src=URL.createObjectURL(await response.blob());}catch(error){image.alt='预览暂不可用：'+(error.message||'读取失败');}}
 }
 assetOffset+=batch.length;if(more){more.hidden=assetOffset>=assetRows.length;more.textContent='继续显示（已显示 '+assetOffset+' / '+assetRows.length+'）';}
}
function refresh(){
 if(!native){set('sz-vault-server','原生数据库服务不可用');return;}
 const info=parse(native.localServerInfo()),stats=parse(native.localDatabaseStats()),assets=stats.assets||[],snaps=stats.snapshots||[];
 assetRows=assets.slice();assetServerInfo=info;
 set('sz-vault-server',info.running?'本地数据库服务运行中':'本地数据库服务未启动');
 $('#sz-vault-url').value=info.url||'http://127.0.0.1:8765';$('#sz-vault-token').value=info.token||'';
 const total=assets.reduce((n,a)=>n+Number(a.size||0),0);
 set('sz-vault-stats','资源 '+assets.length+' 个 · '+bytes(total)+' · 历史快照 '+snaps.length+' 个');
 const list=$('#sz-snapshot-list');list.replaceChildren();
 if(!snaps.length)list.textContent='暂无历史快照。完成首次插件同步后会在这里显示。';
 snaps.forEach(s=>{const row=document.createElement('div');row.className='ql-record';const title=document.createElement('strong'),meta=document.createElement('p');title.textContent=s.current?'当前版本':'历史版本';meta.className='ql-muted';meta.textContent=new Date(Number(s.createdAt)).toLocaleString()+' · '+s.id;row.append(title,meta);list.append(row);});
 renderAssetBatch(true).catch(error=>{const target=$('#sz-asset-list');if(target)target.textContent='读取图片列表失败：'+(error.message||error);});
}
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
$('#sz-asset-more')?.addEventListener('click',()=>renderAssetBatch(false).catch(error=>set('sz-vault-stats','读取图片失败：'+(error.message||error))));
window.ShizhenVault={folderChanged:ready=>set('sz-folder-status',ready?'已选择外部文件夹':'尚未选择外部文件夹')};
if(native){set('sz-folder-status',native.hasExternalFolder()?'已选择外部文件夹':'尚未选择外部文件夹');refresh();loadAppearance();}
wireAppearance();
showPage('generate');
})();