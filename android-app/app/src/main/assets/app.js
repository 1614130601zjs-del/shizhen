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
let assetRows=[],assetOffset=0,assetServerInfo=null,characterRows=[];
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
async function renderCharacterRows(){
 const list=$('#sz-character-list');if(!list)return;list.replaceChildren();
 if(!characterRows.length){list.textContent='当前快照没有拾帧关联角色卡清单。';return;}
 for(const character of characterRows){
  const row=document.createElement('div');row.className='ql-record';row.style.cssText='display:flex;align-items:center;gap:12px';
  const info=document.createElement('div');info.style.cssText='min-width:0;flex:1';
  const title=document.createElement('strong'),meta=document.createElement('p');title.textContent=character.name||character.avatar||('角色 '+(Number(character.sourceIndex)+1));title.style.cssText='display:block;overflow-wrap:anywhere';
  meta.className='ql-muted';meta.textContent=(character.avatar||'未记录头像文件名')+' · '+(character.cardAssetId?'已保存原始角色卡文件':'仅保存身份与绑定信息');
  info.append(title,meta);row.append(info);
  if(character.cardAssetId){
   const image=document.createElement('img');image.alt=(character.name||'角色')+' 原始卡片';image.loading='lazy';image.style.cssText='width:76px;height:76px;flex:0 0 76px;object-fit:cover;border-radius:10px;background:var(--ql-panel)';row.prepend(image);
   if(assetServerInfo?.url&&assetServerInfo?.token){try{const response=await fetch(assetServerInfo.url.replace(/\/+$/,'')+'/v1/assets/'+encodeURIComponent(character.cardAssetId),{headers:{Authorization:'Bearer '+assetServerInfo.token}});if(!response.ok)throw new Error('HTTP '+response.status);image.src=URL.createObjectURL(await response.blob());}catch(error){image.alt='角色卡预览暂不可用：'+(error.message||'读取失败');}}
  }
  list.append(row);
 }
}

let filmRows=[],filmOffset=0,galleryObjectUrls=[];
function releaseGalleryUrls(){for(const url of galleryObjectUrls){try{URL.revokeObjectURL(url);}catch{}}galleryObjectUrls=[];}
async function resolveLibraryImage(value){
 const raw=String(value||'');
 if(!raw)return '';
 const match=raw.match(/^shizhen-asset:\/\/([a-f0-9]{64})$/i);
 if(!match)return raw;
 if(!assetServerInfo?.url||!assetServerInfo?.token)throw new Error('本地素材服务尚未就绪');
 const response=await fetch(assetServerInfo.url.replace(/\/+$/,'')+'/v1/assets/'+match[1],{headers:{Authorization:'Bearer '+assetServerInfo.token}});
 if(!response.ok)throw new Error('HTTP '+response.status);
 const url=URL.createObjectURL(await response.blob());galleryObjectUrls.push(url);return url;
}
function filmRecords(){
 return (Array.isArray(library.records)?library.records:[])
  .map((record,index)=>({...record,_libraryIndex:index}))
  .filter(record=>record?.dataUrl&&record.collection!=='deleted'&&!record.albumCharacterName&&record.collection!=='character-album'&&record.collection!=='prompt-gallery')
  .sort((a,b)=>Number(b.at||0)-Number(a.at||0));
}
async function renderFilmBatch(reset=false){
 const host=$('#ql-history'),more=$('#sz-film-more');if(!host)return;
 if(reset){filmOffset=0;filmRows=filmRecords();releaseGalleryUrls();host.replaceChildren();}
 if(!filmRows.length){host.textContent='本地底片相册暂无影像记录。';if(more)more.hidden=true;return;}
 const batch=filmRows.slice(filmOffset,filmOffset+24);
 for(const record of batch){
  const tile=document.createElement('article');tile.className='ql-cache-tile';
  const button=document.createElement('button');button.type='button';button.className='ql-cache-image';button.setAttribute('aria-label','底片影像 '+(record.prompt||record.basePrompt||''));
  const image=document.createElement('img');image.loading='lazy';image.alt='底片影像';button.append(image);tile.append(button);
  const caption=document.createElement('p');caption.className='ql-muted';caption.textContent=record.at?new Date(Number(record.at)).toLocaleString():(record.source||'拾帧影像');tile.append(caption);host.append(tile);
  try{image.src=await resolveLibraryImage(record.thumb||record.dataUrl);}catch(error){image.alt='图片读取失败：'+(error.message||error);}
 }
 filmOffset+=batch.length;
 if(more){more.hidden=filmOffset>=filmRows.length;more.textContent='继续显示底片（'+filmOffset+' / '+filmRows.length+'）';}
}
async function renderCharacterAlbums(){
 const host=$('#ql-character-albums');if(!host)return;
 host.replaceChildren();
 const records=(Array.isArray(library.records)?library.records:[])
  .map((record,index)=>({...record,_libraryIndex:index}))
  .filter(record=>record?.dataUrl&&record.albumCharacterName&&record.collection!=='deleted'&&record.collection!=='prompt-gallery'&&record.collection!=='cache');
 const groups=new Map();
 for(const record of records){const key=String(record.albumCharacterKey??record.albumCharacterName);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(record);}
 const names=library.albumNames&&typeof library.albumNames==='object'?library.albumNames:{};
 for(const [key,items] of groups){
  const section=document.createElement('section');section.className='ql-card ql-album-card';
  const heading=document.createElement('h3');heading.textContent=String(names[key]||items[0]?.albumCharacterName||'未命名相册')+' · '+items.length+' 张';section.append(heading);
  const grid=document.createElement('div');grid.className='ql-cache-grid';grid.dataset.columns='3';section.append(grid);host.append(section);
  for(const record of items){
   const tile=document.createElement('article');tile.className='ql-cache-tile ql-album-photo';
   const button=document.createElement('button');button.type='button';button.className='ql-cache-image';button.setAttribute('aria-label','相册照片');
   const image=document.createElement('img');image.loading='lazy';image.alt='相册照片';button.append(image);tile.append(button);grid.append(tile);
   try{image.src=await resolveLibraryImage(record.thumb||record.dataUrl);}catch(error){image.alt='图片读取失败：'+(error.message||error);}
  }
 }
 if(!groups.size)host.textContent='当前快照没有角色相册照片记录。';
}
function refresh(){
 if(!native){set('sz-vault-server','原生数据库服务不可用');return;}
 const freshLibrary=native.getLibrary?parse(native.getLibrary()):null;
 if(freshLibrary&&typeof freshLibrary==='object'&&!freshLibrary.error)library=freshLibrary;
 const info=parse(native.localServerInfo()),stats=parse(native.localDatabaseStats()),manifest=native.getVaultManifest?parse(native.getVaultManifest()):{},assets=stats.assets||[],snaps=stats.snapshots||[];characterRows=Array.isArray(manifest.characters)?manifest.characters:[];
 assetRows=assets.slice();assetServerInfo=info;
 set('sz-vault-server',info.running?'本地数据库服务运行中':'本地数据库服务未启动');
 $('#sz-vault-url').value=info.url||'http://127.0.0.1:8765';$('#sz-vault-token').value=info.token||'';
 const total=assets.reduce((n,a)=>n+Number(a.size||0),0);
 set('sz-vault-stats','资源 '+assets.length+' 个 · '+bytes(total)+' · 历史快照 '+snaps.length+' 个');
 const list=$('#sz-snapshot-list');list.replaceChildren();
 if(!snaps.length)list.textContent='暂无历史快照。完成首次插件同步后会在这里显示。';
 snaps.forEach(s=>{const row=document.createElement('div');row.className='ql-record';const title=document.createElement('strong'),meta=document.createElement('p');title.textContent=s.current?'当前版本':'历史版本';meta.className='ql-muted';meta.textContent=new Date(Number(s.createdAt)).toLocaleString()+' · '+s.id;row.append(title,meta);list.append(row);});
 renderAssetBatch(true).catch(error=>{const target=$('#sz-asset-list');if(target)target.textContent='读取图片列表失败：'+(error.message||error);});renderCharacterRows().catch(error=>{const target=$('#sz-character-list');if(target)target.textContent='读取角色卡清单失败：'+(error.message||error);});
 renderFilmBatch(true).catch(error=>{const target=$('#ql-history');if(target)target.textContent='读取底片相册失败：'+(error.message||error);});
 renderCharacterAlbums().catch(error=>{const target=$('#ql-character-albums');if(target)target.textContent='读取角色相册失败：'+(error.message||error);});
}
$('#sz-copy-url')?.addEventListener('click',()=>copy($('#sz-vault-url').value));
$('#sz-copy-token')?.addEventListener('click',()=>copy($('#sz-vault-token').value));
let importedSettings={};
function setImportedControl(id,value){
 const el=$('#'+id);if(!el||value===undefined||value===null)return;
 if(el.type==='checkbox'){el.checked=Boolean(value);return;}
 const text=String(value);
 if(el.tagName==='SELECT'&&text!==''&&![...el.options].some(option=>option.value===text))el.add(new Option(text,text));
 el.value=text;
}
function hydrateImportedSettings(config){
 if(!config||typeof config!=='object')return;
 importedSettings=config;
 const fields=[
  ['ql-fast-provider','provider'],['ql-provider','provider'],['ql-nai-key','naiApiKey'],
  ['ql-nai-third-endpoint','naiThirdEndpoint'],['ql-nai-third-key','naiThirdKey'],
  ['ql-endpoint','endpoint'],['ql-key','apiKey'],['ql-fast-model','model'],['ql-fast-size','size'],['ql-fast-quality','quality'],
  ['ql-fast-nai-model','naiModel'],['ql-fast-nai-steps','naiSteps'],['ql-fast-nai-scale','naiScale'],
  ['ql-fast-nai-sampler','naiSampler'],['ql-fast-nai-scheduler','naiScheduler'],['ql-fast-nai-quality','naiQualityMode'],
  ['ql-fast-nai-uc','naiUcPreset'],['ql-fast-nai-seed','naiSeed'],['ql-fast-nai-normalize','naiNormalizeVibeStrengths'],
  ['ql-llm-tag-mode','llmTagMode'],['ql-llm-tag-url','llmTagApiUrl'],['ql-llm-tag-key','llmTagApiKey'],
  ['ql-llm-tag-model','llmTagModel'],['ql-llm-tag-temp','llmTagTemperature'],['ql-llm-tag-sys','llmTagSystemPrompt'],
  ['ql-llm-tag-wi-on','llmTagUseWorldInfo'],['ql-prompt','prompt'],['ql-negative','negative'],
  ['ql-download-format','downloadFormat'],['ql-history-columns','historyColumns'],['ql-record-limit','recordLimit']
 ];
 for(const [id,key] of fields)setImportedControl(id,config[key]);
 const width=Number(config.naiWidth||832),height=Number(config.naiHeight||1216);
 setImportedControl('ql-fast-nai-width',width);setImportedControl('ql-fast-nai-height',height);setImportedControl('ql-fast-nai-size-preset',width+'x'+height);
 if($('#ql-llm-tag-custom-box'))$('#ql-llm-tag-custom-box').hidden=(config.llmTagMode||'main')!=='custom';
 if($('#ql-fast-nai'))$('#ql-fast-nai').hidden=String(config.provider||'novelai')==='openai';
 if($('#ql-fast-openai'))$('#ql-fast-openai').hidden=String(config.provider||'novelai')!=='openai';
}
function saveImportedSettingsFromControls(){
 if(!native?.saveImportedSettings)return;
 const fields=[
  ['provider','ql-fast-provider'],['naiApiKey','ql-nai-key'],['naiThirdEndpoint','ql-nai-third-endpoint'],['naiThirdKey','ql-nai-third-key'],
  ['endpoint','ql-endpoint'],['apiKey','ql-key'],['model','ql-fast-model'],['size','ql-fast-size'],['quality','ql-fast-quality'],
  ['naiModel','ql-fast-nai-model'],['naiSteps','ql-fast-nai-steps'],['naiScale','ql-fast-nai-scale'],['naiSampler','ql-fast-nai-sampler'],
  ['naiScheduler','ql-fast-nai-scheduler'],['naiQualityMode','ql-fast-nai-quality'],['naiUcPreset','ql-fast-nai-uc'],
  ['naiSeed','ql-fast-nai-seed'],['llmTagMode','ql-llm-tag-mode'],['llmTagApiUrl','ql-llm-tag-url'],
  ['llmTagApiKey','ql-llm-tag-key'],['llmTagModel','ql-llm-tag-model'],['llmTagTemperature','ql-llm-tag-temp'],
  ['llmTagSystemPrompt','ql-llm-tag-sys'],['prompt','ql-prompt'],['negative','ql-negative']
 ];
 for(const [key,id] of fields){const el=$('#'+id);if(!el)continue;let value=el.value;if(['naiSteps','naiScale','naiUcPreset','naiSeed','llmTagTemperature'].includes(key))value=value===''?'':Number(value);importedSettings[key]=value;}
 for(const [key,id] of [['naiNormalizeVibeStrengths','ql-fast-nai-normalize'],['llmTagUseWorldInfo','ql-llm-tag-wi-on']]){const el=$('#'+id);if(el)importedSettings[key]=el.checked;}
 const dims=($('#ql-fast-nai-size-preset')?.value||'').match(/^(\d+)x(\d+)$/);if(dims){importedSettings.naiWidth=Number(dims[1]);importedSettings.naiHeight=Number(dims[2]);}
 const result=parse(native.saveImportedSettings(JSON.stringify(importedSettings)));
 if(!result?.ok)set('sz-import-settings-status','设置保存失败：'+(result?.error||'未知错误'));
 else set('sz-import-settings-status','设置已安全保存到本机。');
}
function wireImportedSettings(){
 const ids=['ql-fast-provider','ql-nai-key','ql-nai-third-endpoint','ql-nai-third-key','ql-endpoint','ql-key','ql-fast-model','ql-fast-size','ql-fast-quality','ql-fast-nai-model','ql-fast-nai-steps','ql-fast-nai-scale','ql-fast-nai-sampler','ql-fast-nai-scheduler','ql-fast-nai-quality','ql-fast-nai-uc','ql-fast-nai-seed','ql-fast-nai-normalize','ql-fast-nai-size-preset','ql-llm-tag-mode','ql-llm-tag-url','ql-llm-tag-key','ql-llm-tag-model','ql-llm-tag-temp','ql-llm-tag-sys','ql-llm-tag-wi-on','ql-prompt','ql-negative'];
 for(const id of ids){const el=$('#'+id);if(!el)continue;el.addEventListener('change',()=>{if($('#ql-llm-tag-custom-box'))$('#ql-llm-tag-custom-box').hidden=$('#ql-llm-tag-mode')?.value!=='custom';saveImportedSettingsFromControls();});}
}
function importedSettingsStatus(){
 const target=$('#sz-import-settings-status');if(!target||!native?.getImportedSettings)return;
 const saved=parse(native.getImportedSettings());
 if(saved&&saved.ok===false){target.textContent='读取已移植设置失败：'+(saved.error||'未知错误');return;}
 if(!saved||!Object.keys(saved).length){target.textContent='尚未从拾帧插件移植设置。';return;}
 hydrateImportedSettings(saved);
 const provider=saved.provider==='novelai-thirdparty'?'NovelAI 第三方':saved.provider==='novelai'?'NovelAI 官网':'OpenAI 兼容服务';
 const model=saved.provider==='novelai'||saved.provider==='novelai-thirdparty'?(saved.naiModel||'未设置模型'):(saved.model||'未设置模型');
 target.textContent='已保存设置：'+provider+' · '+model+'。API 凭据已保存在 App 私有加密存储中。';
}
$('#sz-import-settings')?.addEventListener('click',()=>{
 try{
  if(!native?.getLibrary||!native?.saveImportedSettings)throw new Error('当前 App 版本尚未提供安全设置移植接口');
  const config=parse(native.getLibrary());
  if(!config||typeof config!=='object'||Array.isArray(config)||config.error)throw new Error(config?.error||'本地数据库中没有可用的拾帧设置快照');
  if(!Object.keys(config).length)throw new Error('尚未收到拾帧插件的设置快照，请先在插件中执行一次同步');
  const result=parse(native.saveImportedSettings(JSON.stringify(config)));
  if(!result?.ok)throw new Error(result?.error||'App 保存设置失败');
  hydrateImportedSettings(config);
  set('sz-import-settings-status','已将生图后端、密钥、模型、采样参数与文本 API 等配置填入对应设置位置，并加密保存在本机。');
  importedSettingsStatus();
 }catch(error){set('sz-import-settings-status','移植失败：'+(error.message||error));}
});
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
$('#sz-film-more')?.addEventListener('click',()=>renderFilmBatch(false).catch(error=>set('sz-vault-stats','读取底片失败：'+(error.message||error))));
$('#sz-refresh-vault')?.addEventListener('click',()=>{try{refresh();set('sz-vault-stats','数据库索引已刷新。');}catch(error){set('sz-vault-stats','刷新失败：'+(error.message||error));}});
window.ShizhenVault={folderChanged:ready=>set('sz-folder-status',ready?'已选择外部文件夹':'尚未选择外部文件夹')};
if(native){set('sz-folder-status',native.hasExternalFolder()?'已选择外部文件夹':'尚未选择外部文件夹');loadAppearance();refresh();importedSettingsStatus();}
wireImportedSettings();
wireAppearance();
showPage('generate');

function dataCategory(){return $('#sz-data-category')?.value||'presets';}
function dataEntries(key=dataCategory()){
 const value=library?.[key];
 if(key==='worldbookModeManager')return value&&typeof value==='object'&&!Array.isArray(value)?[value]:[];
 return Array.isArray(value)?value:[];
}
function dataEntryLabel(item,index,key){
 const name=item?.name||item?.title||item?.label||item?.avatar||item?.id||('条目 '+(index+1));
 if(key==='presets')return name+' · '+String(item?.positive||'').slice(0,36);
 if(key==='vibes')return name+' · '+(Array.isArray(item?.entries)?item.entries.length+' 条引用':'单条编码');
 if(key==='combinations')return name+' · 画师串 '+(Number(item?.artistIndex)>=0?Number(item.artistIndex)+1:'无')+' / Vibe '+(Number(item?.vibeIndex)>=0?Number(item.vibeIndex)+1:'无');
 return String(name);
}
let dataSelectedIndex=0;
function renderDataWorkspace(){
 const category=$('#sz-data-category'),entry=$('#sz-data-entry'),editor=$('#sz-data-json');
 if(!category||!entry||!editor)return;
 const key=dataCategory(),items=dataEntries(key),isObject=key==='worldbookModeManager';
 set('sz-data-count',isObject?'世界书联动配置对象':('共 '+items.length+' 条 · 原始数据字段完整保留'));
 entry.replaceChildren();
 if(isObject){
  entry.hidden=true;
  dataSelectedIndex=0;
 }else{
  entry.hidden=false;
  items.forEach((item,index)=>entry.add(new Option(dataEntryLabel(item,index,key),String(index))));
  dataSelectedIndex=Math.max(0,Math.min(items.length-1,dataSelectedIndex));
  entry.value=items.length?String(dataSelectedIndex):'';
 }
 const item=items[dataSelectedIndex];
 editor.value=item===undefined?'':JSON.stringify(item,null,2);
 $('#sz-data-delete').disabled=isObject||!items.length;
 $('#sz-data-apply').disabled=!item||!['presets','vibes','combinations'].includes(key);
 set('sz-data-status',items.length?'已读取 '+(isObject?'世界书联动配置':items.length+' 条数据')+'。':'当前类型暂无数据，可新建条目。');
}
function saveDataWorkspace(){
 const key=dataCategory(),editor=$('#sz-data-json');
 let parsed;
 try{parsed=JSON.parse(editor.value);}catch(error){set('sz-data-status','JSON 格式错误：'+error.message);return false;}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)){set('sz-data-status','条目必须是 JSON 对象。');return false;}
 if(key==='worldbookModeManager')library[key]=parsed;
 else{
  if(!Array.isArray(library[key]))library[key]=[];
  const index=Number($('#sz-data-entry').value);
  if(Number.isInteger(index)&&index>=0&&index<library[key].length)library[key][index]=parsed;
  else library[key].push(parsed);
  dataSelectedIndex=library[key].findIndex(x=>x===parsed);
 }
 if(!native?.saveLibrary){set('sz-data-status','当前 App 版本没有本地数据库写入接口。');return false;}
 const result=parse(native.saveLibrary(JSON.stringify(library)));
 if(!result?.ok){set('sz-data-status','保存失败：'+(result?.error||'未知错误'));return false;}
 library=parse(native.getLibrary());
 renderDataWorkspace();
 set('sz-data-status','已保存到本机数据库。原始字段与素材引用已交由数据库层保留。');
 return true;
}
function newDataEntry(){
 const key=dataCategory(),now=Date.now();
 const templates={
  presets:{id:'artist-'+now,name:'新画师串',positive:'',negative:''},
  vibes:{id:'vibe-'+now,name:'新 Vibe 分组',entries:[]},
  combinations:{id:'combo-'+now,name:'新组合',artistIndex:-1,vibeIndex:-1},
  prompts:{id:'prompt-'+now,name:'新提示词',prompt:'',promptEn:''},
  characters:{id:'character-'+now,name:'新角色词条',appearance:'',outfits:[]},
  viewfinderRoles:{id:'role-'+now,name:'新取景角色',appearance:''},
  bindings:{id:'binding-'+now,name:'新角色绑定',presetIndex:-1,vibeIndex:-1,comboIndex:-1},
  workLibrary:{id:'work-'+now,name:'新作品',items:[]}
 };
 if(key==='worldbookModeManager'){library[key]={schemaVersion:4,enabled:false,mode:'pair',coreBook:'',coreBooks:{pair:'',group:''},worldviewBook:'',worldview:'',modeEntryBindings:{pair:{},group:{}},worldviewEntryOverrides:{},entryOverrides:{}};}
 else{
  if(!Array.isArray(library[key]))library[key]=[];
  library[key].unshift(templates[key]||{id:'item-'+now,name:'新条目'});
  dataSelectedIndex=0;
 }
 renderDataWorkspace();
 $('#sz-data-status').textContent='已创建草稿；编辑 JSON 后点击保存写入本机。';
}
function applyDataEntry(){
 const key=dataCategory(),items=dataEntries(key),item=items[Number($('#sz-data-entry').value)];
 if(!item)return;
 if(key==='presets'){
  library.activeConfigMode='separate';library.activeComboIndex=-1;
  library.activePresetIndex=Number($('#sz-data-entry').value);library.activeVibeIndex=-1;
 }else if(key==='vibes'){
  library.activeConfigMode='separate';library.activeComboIndex=-1;
  library.activeVibeIndex=Number($('#sz-data-entry').value);
 }else if(key==='combinations'){
  const index=Number($('#sz-data-entry').value);
  library.activeConfigMode='combo';library.activeComboIndex=index;
  library.activePresetIndex=Number(item.artistIndex??-1);library.activeVibeIndex=Number(item.vibeIndex??-1);
 }
 syncGenerationConfigControls();
 if(native?.saveLibrary){
  const result=parse(native.saveLibrary(JSON.stringify(library)));
  if(result?.ok){library=parse(native.getLibrary());set('sz-data-status','已应用到取景配置并保存。');}
  else set('sz-data-status','应用失败：'+(result?.error||'未知错误'));
 }
}

function syncGenerationConfigControls(){
 const presets=Array.isArray(library.presets)?library.presets:[],vibes=Array.isArray(library.vibes)?library.vibes:[],combos=Array.isArray(library.combinations)?library.combinations:[];
 const fill=(id,items,placeholder,label)=>{const el=$('#'+id);if(!el)return;const value=el.value;el.replaceChildren(new Option(placeholder,'-1'));items.forEach((item,index)=>el.add(new Option(label(item,index),String(index))));if([...el.options].some(o=>o.value===value))el.value=value;};
 fill('ql-active-preset',combos,'不使用组合',(x,i)=>x?.name||('组合 '+(i+1)));
 fill('ql-active-artist',presets,'不使用画师串',(x,i)=>x?.name||('画师串 '+(i+1)));
 fill('ql-active-vibe',vibes,'不使用 Vibe',(x,i)=>x?.name||('Vibe '+(i+1)));
 const mode=library.activeConfigMode==='separate'?'separate':'combo';
 if($('#ql-active-config-mode'))$('#ql-active-config-mode').value=mode;
 if($('#ql-active-preset'))$('#ql-active-preset').value=String(Number(library.activeComboIndex??-1));
 if($('#ql-active-artist'))$('#ql-active-artist').value=String(Number(library.activePresetIndex??-1));
 if($('#ql-active-vibe'))$('#ql-active-vibe').value=String(Number(library.activeVibeIndex??-1));
 if($('#ql-combo-config-row'))$('#ql-combo-config-row').hidden=mode==='separate';
 if($('#ql-separate-config-row'))$('#ql-separate-config-row').hidden=mode!=='separate';
}
function saveGenerationSelection(){
 if(!native?.saveLibrary)return;
 const result=parse(native.saveLibrary(JSON.stringify(library)));
 if(!result?.ok)set('ql-status','保存当前取景配置失败：'+(result?.error||'未知错误'));
}
function wireGenerationSelections(){
 syncGenerationConfigControls();
 $('#ql-active-config-mode')?.addEventListener('change',()=>{
  library.activeConfigMode=$('#ql-active-config-mode').value==='separate'?'separate':'combo';
  if(library.activeConfigMode==='separate')library.activeComboIndex=-1;
  syncGenerationConfigControls();saveGenerationSelection();
 });
 $('#ql-active-preset')?.addEventListener('change',()=>{
  const index=Number($('#ql-active-preset').value);library.activeConfigMode='combo';
  library.activeComboIndex=Number.isInteger(index)?index:-1;
  const combo=library.combinations?.[library.activeComboIndex];
  if(combo){library.activePresetIndex=Number(combo.artistIndex??-1);library.activeVibeIndex=Number(combo.vibeIndex??-1);}
  syncGenerationConfigControls();saveGenerationSelection();
 });
 $('#ql-active-artist')?.addEventListener('change',()=>{
  library.activeConfigMode='separate';library.activeComboIndex=-1;
  library.activePresetIndex=Number($('#ql-active-artist').value);syncGenerationConfigControls();saveGenerationSelection();
 });
 $('#ql-active-vibe')?.addEventListener('change',()=>{
  library.activeConfigMode='separate';library.activeComboIndex=-1;
  library.activeVibeIndex=Number($('#ql-active-vibe').value);syncGenerationConfigControls();saveGenerationSelection();
 });
 $('#ql-apply-preset')?.addEventListener('click',()=>{
  const mode=library.activeConfigMode==='separate'?'独立配置':'组合';
  saveGenerationSelection();set('ql-status','已保存取景区当前'+mode+'选择。');
 });
}

function wireDataWorkspace(){
 wireGenerationSelections();
 $('#sz-data-category')?.addEventListener('change',()=>{dataSelectedIndex=0;renderDataWorkspace();});
 $('#sz-data-entry')?.addEventListener('change',()=>{dataSelectedIndex=Number($('#sz-data-entry').value)||0;renderDataWorkspace();});
 $('#sz-data-new')?.addEventListener('click',newDataEntry);
 $('#sz-data-delete')?.addEventListener('click',()=>{
  const key=dataCategory(),index=Number($('#sz-data-entry').value);
  if(key==='worldbookModeManager'||!Array.isArray(library[key])||!library[key][index])return;
  library[key].splice(index,1);dataSelectedIndex=Math.max(0,index-1);
  const result=parse(native?.saveLibrary?.(JSON.stringify(library))||'{}');
  if(!result?.ok){set('sz-data-status','删除保存失败：'+(result?.error||'本地数据库不可用'));return;}
  library=parse(native.getLibrary());renderDataWorkspace();set('sz-data-status','已删除条目并保存到本机数据库。');
 });
 $('#sz-data-save')?.addEventListener('click',saveDataWorkspace);
 $('#sz-data-apply')?.addEventListener('click',applyDataEntry);
 renderDataWorkspace();
}

wireDataWorkspace();
})();