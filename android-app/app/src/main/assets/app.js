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
let jellyPickerLoaded=false;
function showPage(page){
 $$('.ql-tab').forEach(b=>{const on=b.dataset.page===page;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
 $$('.ql-page').forEach(p=>{const on=p.dataset.pagePanel===page;p.hidden=!on;p.classList.toggle('active',on);});
 // 果冻的缩略图只在真正点进这个 tab 时才解码，不跟着其他 tab 的每次刷新一起重复解码，
 // 避免每次生成图/推送/拉取都多扛一轮图片解码拖慢全局操作。
 if(page==='jelly'&&!jellyPickerLoaded){jellyPickerLoaded=true;renderJellyPicker().catch(()=>{jellyPickerLoaded=false;});}
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
// Vibe 编辑区整段照搬插件原有的 innerHTML+esc() 拼接写法(而不是前面几处改用 createElement)——
// 插件那边这块本来就是这个风格，量也大，原样抄最省事也最不容易漏字段。esc() 和插件里的定义完全一致。
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
 if(!characterRows.length){list.textContent='当前快照没有角色卡数据，推送一次拾帧数据后会显示酒馆里的角色卡清单。';return;}
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
// ===== 待推回插件标记 =====
// app 是本地仓库：这里只负责"勾选/取消勾选"+持久化 record.pendingPushBack 这个标记，
// 不负责真正的传输——插件侧新增的「拉取 App 里已标记的照片」按钮会读这个标记，
// 按 record.uid 去重后追加合并进插件自己的记录，不是整体覆盖。
function pendingCount(){
 return (Array.isArray(library.records)?library.records:[]).filter(r=>r&&r.pendingPushBack).length;
}
function setPendingMark(libraryIndex,checked){
 const record=Array.isArray(library.records)?library.records[libraryIndex]:null;
 if(!record)return;
 if(checked)record.pendingPushBack=true;else delete record.pendingPushBack;
 persist();
}
// 两个独立的"待推回"计数条引用（底片页/角色相册页各一条），
// 跨"继续显示"分批加载仍能原地刷新数字，不用每次都整段重建 DOM。
let filmPendingBarText=null,albumPendingBarText=null;
function buildPendingBar(onClear){
 const bar=document.createElement('div');bar.className='ql-record';bar.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px';
 const text=document.createElement('p');text.className='ql-muted';text.textContent='已标记 '+pendingCount()+' 张待推回插件';bar.append(text);
 const clear=document.createElement('button');clear.type='button';clear.className='menu_button';clear.textContent='清除全部标记';
 clear.addEventListener('click',()=>{for(const r of (library.records||[]))if(r&&r.pendingPushBack)delete r.pendingPushBack;persist();text.textContent='已标记 0 张待推回插件';onClear?.();});
 bar.append(clear);bar._pendingText=text;return bar;
}
function attachPendingCheckbox(tile,record,barText){
 const label=document.createElement('label');label.className='ql-pending-check';label.style.cssText='position:absolute;top:6px;left:6px;z-index:2;display:flex;align-items:center;gap:4px;background:var(--ql-field);padding:2px 6px;border-radius:8px;font-size:12px';
 const box=document.createElement('input');box.type='checkbox';box.checked=!!record.pendingPushBack;
 box.addEventListener('click',event=>event.stopPropagation());
 box.addEventListener('change',()=>{setPendingMark(record._libraryIndex,box.checked);if(barText)barText.textContent='已标记 '+pendingCount()+' 张待推回插件';});
 label.append(box,document.createTextNode('推回'));
 tile.style.position='relative';tile.append(label);
}
function filmRecords(){
 return (Array.isArray(library.records)?library.records:[])
  .map((record,index)=>({...record,_libraryIndex:index}))
  .filter(record=>record?.dataUrl&&record.collection!=='deleted'&&!record.albumCharacterName&&record.collection!=='character-album'&&record.collection!=='prompt-gallery')
  .sort((a,b)=>Number(b.at||0)-Number(a.at||0));
}
// 不依赖酒馆那套按 #ql-history 作用域写死的 CSS 选择器（相册页的 .ql-cache-grid 并不在
// #ql-history 底下，命中不了那条规则），直接用行内样式把列数定死，三处图片格子都走这一个函数。
function paintGridColumns(grid,columns){
 grid.style.display='grid';
 grid.style.gridTemplateColumns='repeat('+Math.max(1,Math.min(5,Number(columns)||3))+',minmax(0,1fr))';
 grid.style.gap='10px';
}
function filmColumns(){return Math.max(1,Math.min(5,Number(library.historyColumns)||3));}
function bindHistoryColumns(){
 const select=$('#ql-history-columns');if(!select)return;
 select.value=String(filmColumns());
 select.onchange=()=>{library.historyColumns=Math.max(1,Math.min(5,Number(select.value)||3));persist();renderFilmBatch(true);};
}
// 底片/相册点开照片时走详情面板（提示词/画师串/Vibe/生成参数），不是直接打开果冻弹窗——
// app 定位是"资料库"，翻出来的信息就该比插件里跑图现场看到的更全；面板里图片本身还能点开
// 再进果冻/放大查看，两件事不互相顶替。字段全部读现有 record 上已经有的数据，不额外采集。
let recordDetailModal=null;
function ensureRecordDetailModal(){
 if(recordDetailModal)return recordDetailModal;
 const modal=document.createElement('div');
 modal.id='ql-image-cache-modal';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','图片详情');
 const panel=document.createElement('div');panel.className='ql-cache-modal-panel';
 const close=document.createElement('button');close.type='button';close.className='menu_button ql-cache-modal-close ql-universal-close';close.setAttribute('aria-label','关闭图片详情');close.title='关闭';
 close.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
 close.addEventListener('click',()=>{modal.hidden=true;});
 modal.addEventListener('click',event=>{if(event.target===modal)modal.hidden=true;});
 const content=document.createElement('div');content.className='ql-cache-modal-content';
 panel.append(close,content);modal.append(panel);
 // 插件里这个弹窗是挂在 #ql-overlay 下的，extension.css 也有专门 #ql-overlay #ql-image-cache-modal
 // 的定位/层级规则；直接挂 document.body 不会报错，但少吃这层规则。跟插件一样优先找 #ql-overlay，
 // app 的 index.html 确实有这个容器（包着 #shizhen-panel），找不到才退回 document.body。
 (document.getElementById('ql-overlay')||document.body).append(modal);
 recordDetailModal=modal;
 return modal;
}
function buildStatEl(label,value){
 const el=document.createElement('div');el.className='ql-cache-stat';
 const span=document.createElement('span');span.textContent=label;
 const strong=document.createElement('strong');strong.textContent=value;
 el.append(span,strong);return el;
}
function buildAccordion(summaryText,smallText,bodyText){
 const details=document.createElement('details');
 const summary=document.createElement('summary');
 const span=document.createElement('span');span.textContent=summaryText;
 const small=document.createElement('small');small.textContent=smallText;
 summary.append(span,small);details.append(summary);
 const body=document.createElement('div');body.className='ql-cache-accordion-body';
 const pre=document.createElement('pre');pre.textContent=bodyText||'未记录';body.append(pre);details.append(body);
 return details;
}
async function copyText(value){
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return true;}}catch{}
 try{const area=document.createElement('textarea');area.value=value;area.style.cssText='position:fixed;opacity:0';document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();return ok;}catch{return false;}
}
async function openRecordDetail(record){
 const modal=ensureRecordDetailModal();
 const content=modal.querySelector('.ql-cache-modal-content');
 content.replaceChildren();
 const preset=record.preset||null,vibe=record.vibe||null,meta=record.config||{};
 const createdAt=new Date(Number(record.at)||Date.now());
 const npd=record.naiPromptData&&Array.isArray(record.naiPromptData.characters)&&record.naiPromptData.characters.length?record.naiPromptData:null;
 const promptSource=npd?'Base Prompt\n'+(npd.basePrompt||'（空）')+'\n\nCharacter Prompts\n'+npd.characters.map((x,i)=>(i+1)+'. '+x.prompt).join('\n'):String(record.prompt||record.basePrompt||'');
 const artistPositive=String(preset?.positive||'').trim();
 const promptText=String(record.basePrompt||'').trim()||(artistPositive&&promptSource.includes(artistPositive)
  ?promptSource.split(artistPositive).join(' ').replace(/(?:\s*[,，、]\s*){2,}/g,', ').replace(/^[\s,，、]+|[\s,，、]+$/g,'').trim()
  :promptSource);
 const promptWords=promptText.split(/[,，\n]+/).map(x=>x.trim()).filter(Boolean).length;
 const vibeCount=Array.isArray(vibe?.entries)?vibe.entries.length:0;

 const hero=document.createElement('div');hero.className='ql-cache-detail-hero';
 const imgWrap=document.createElement('div');imgWrap.className='ql-cache-detail-image-wrap';
 const img=document.createElement('img');img.className='ql-cache-large';img.alt='生成结果';img.style.cursor='zoom-in';img.title='点击放大/果冻互动查看原图';
 imgWrap.append(img);
 const heading=document.createElement('div');heading.className='ql-cache-detail-heading';
 const eyebrow=document.createElement('span');eyebrow.className='ql-cache-eyebrow';eyebrow.textContent='IMAGE ARCHIVE · 拾帧资料库';
 const h3=document.createElement('h3');h3.textContent=record.albumCharacterName?'相册照片':'生成记录';
 const timeP=document.createElement('p');timeP.textContent=createdAt.toLocaleString();
 const badges=document.createElement('div');badges.className='ql-cache-badges';
 for(const label of [record.provider||'未知后端',record.model||meta.model||'未知模型',record.size||meta.size||'尺寸未知']){const span=document.createElement('span');span.textContent=label;badges.append(span);}
 heading.append(eyebrow,h3,timeP,badges);
 hero.append(imgWrap,heading);

 const statGrid=document.createElement('div');statGrid.className='ql-cache-stat-grid';
 statGrid.append(buildStatEl('提示词条目',String(promptWords)),buildStatEl('Vibe 参考',String(vibeCount)),buildStatEl('画师串',preset?.name||'未使用'));

 const promptSection=document.createElement('section');promptSection.className='ql-cache-prompt-section';
 const sectionTitle=document.createElement('div');sectionTitle.className='ql-cache-section-title';
 const titleInner=document.createElement('div');
 const titleEyebrow=document.createElement('span');titleEyebrow.className='ql-cache-eyebrow';titleEyebrow.textContent='PROMPT';
 const titleH4=document.createElement('h4');titleH4.textContent='画面提示词';
 titleInner.append(titleEyebrow,titleH4);
 const copyIcon=document.createElement('button');copyIcon.type='button';copyIcon.className='ql-cache-copy-icon ql-cache-copy-pill';copyIcon.setAttribute('aria-label','复制画面提示词');copyIcon.title='复制画面提示词';
 copyIcon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8" y="8" width="11" height="13" rx="2"></rect><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"></path></svg>';
 copyIcon.addEventListener('click',async()=>{const ok=await copyText(promptText);copyIcon.classList.toggle('is-copied',ok);setTimeout(()=>copyIcon.classList.remove('is-copied'),1300);});
 sectionTitle.append(titleInner,copyIcon);
 const promptBox=document.createElement('div');promptBox.className='ql-cache-prompt-box';
 const pre=document.createElement('pre');pre.textContent=promptText||'此记录没有保存正向提示词';promptBox.append(pre);
 promptSection.append(sectionTitle,promptBox);

 const actions=document.createElement('div');actions.className='ql-cache-detail-actions';
 const copyPromptBtn=document.createElement('button');copyPromptBtn.type='button';copyPromptBtn.className='menu_button ql-cache-action-primary';copyPromptBtn.textContent='复制画面提示词';
 copyPromptBtn.addEventListener('click',async()=>{const ok=await copyText(promptText);copyPromptBtn.textContent=ok?'已复制':'复制失败，请长按选取';setTimeout(()=>{copyPromptBtn.textContent='复制画面提示词';},1300);});
 const saveBtn=document.createElement('button');saveBtn.type='button';saveBtn.className='menu_button';saveBtn.textContent='保存图片';
 saveBtn.addEventListener('click',async()=>{
  try{
   const src=await resolveLibraryImage(record.dataUrl||record.thumb);
   const blob=await (await fetch(src)).blob();
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;a.download='shizhen-'+(record.at||Date.now())+'.png';document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(error){console.warn('[拾帧] 保存图片失败',error);}
 });
 actions.append(copyPromptBtn,saveBtn);

 const accordions=document.createElement('div');accordions.className='ql-cache-accordions';
 accordions.append(
  buildAccordion('最终提交给 NAI 的完整提示词','FINAL PROMPT',promptSource),
  buildAccordion('画师串预设',preset?.name||'未使用','正文：\n'+(preset?.positive||'未记录')+'\n\n负向词：\n'+(preset?.negative||'未记录')),
  buildAccordion('负向提示词','NEGATIVE PROMPT',record.negative||meta.negative||'未记录'),
  buildAccordion('Vibe 参考',vibeCount+' 条参考',vibe?JSON.stringify(vibe,null,2):'未使用 Vibe'),
  buildAccordion('完整生成参数','ADVANCED',JSON.stringify(meta,null,2))
 );

 content.append(hero,statGrid,promptSection,actions,accordions);
 modal.hidden=false;
 try{img.src=await resolveLibraryImage(record.dataUrl||record.thumb);}catch(error){img.alt='图片读取失败：'+(error.message||error);}
 img.addEventListener('click',async()=>{try{openJellyViewer(await resolveLibraryImage(record.dataUrl||record.thumb));}catch{}});
}
async function renderFilmBatch(reset=false){
 const host=$('#ql-history'),more=$('#sz-film-more');if(!host)return;
 bindHistoryColumns();
 let grid=host.querySelector('.ql-cache-grid');
 if(reset){filmOffset=0;filmRows=filmRecords();releaseGalleryUrls();host.replaceChildren();const bar=buildPendingBar(()=>renderFilmBatch(true));filmPendingBarText=bar._pendingText;host.before(bar);grid=null;}
 if(!filmRows.length){host.textContent='本地底片相册暂无影像记录。';if(more)more.hidden=true;return;}
 if(!grid){grid=document.createElement('div');grid.className='ql-cache-grid';host.append(grid);}
 paintGridColumns(grid,filmColumns());
 const batch=filmRows.slice(filmOffset,filmOffset+24);
 for(const record of batch){
  const tile=document.createElement('article');tile.className='ql-cache-tile';
  const button=document.createElement('button');button.type='button';button.className='ql-cache-image';button.setAttribute('aria-label','底片影像 '+(record.prompt||record.basePrompt||''));
  const image=document.createElement('img');image.loading='lazy';image.alt='底片影像';button.append(image);tile.append(button);
  const caption=document.createElement('p');caption.className='ql-muted';caption.textContent=record.at?new Date(Number(record.at)).toLocaleString():(record.source||'拾帧影像');tile.append(caption);grid.append(tile);
  attachPendingCheckbox(tile,record,filmPendingBarText);
  button.addEventListener('click',()=>openRecordDetail(record));
  // 缩略图字节在本机缺失(通常是跨设备互传时素材没同步全)时直接丢掉这块格子，不留"图片读取失败"的碎图占位。
  try{image.src=await resolveLibraryImage(record.thumb||record.dataUrl);}catch(error){console.warn('[拾帧] 底片缩略图读取失败，已跳过',error);tile.remove();}
 }
 filmOffset+=batch.length;
 if(more){more.hidden=filmOffset>=filmRows.length;more.textContent='继续显示底片（'+filmOffset+' / '+filmRows.length+'）';}
}
// 两层结构，和插件一致：先是相册列表(封面+名字+张数)，点进去才展开那一个相册的照片网格——
// 不是把所有角色的照片铺成一张大杂烩表。openAlbumKey 为空就是列表层，非空且还存在就是详情层。
let openAlbumKey=null;
async function renderCharacterAlbums(){
 const host=$('#ql-character-albums');if(!host)return;
 host.replaceChildren();
 const records=(Array.isArray(library.records)?library.records:[])
  .map((record,index)=>({...record,_libraryIndex:index}))
  .filter(record=>record?.dataUrl&&record.albumCharacterName&&record.collection!=='deleted'&&record.collection!=='prompt-gallery'&&record.collection!=='cache');
 const groups=new Map();
 for(const record of records){const key=String(record.albumCharacterKey??record.albumCharacterName);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(record);}
 const names=library.albumNames&&typeof library.albumNames==='object'?library.albumNames:{};
 if(!groups.size){openAlbumKey=null;host.textContent='当前快照没有角色相册照片记录。';return;}
 if(!openAlbumKey||!groups.has(openAlbumKey)){
  const grid=document.createElement('div');grid.className='ql-cache-grid';paintGridColumns(grid,2);host.append(grid);
  for(const [key,items] of groups){
   const card=document.createElement('button');card.type='button';card.className='ql-card ql-album-card';
   card.style.cssText='text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:8px;width:100%';
   const cover=document.createElement('div');cover.style.cssText='aspect-ratio:3/4;border-radius:10px;overflow:hidden;background:rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center';
   const img=document.createElement('img');img.loading='lazy';img.alt='';img.style.cssText='width:100%;height:100%;object-fit:cover';cover.append(img);
   const heading=document.createElement('h3');heading.style.cssText='margin:0;font-size:14px';heading.textContent=String(names[key]||items[0]?.albumCharacterName||'未命名相册');
   const count=document.createElement('p');count.className='ql-muted';count.style.margin='0';count.textContent=items.length+' 张';
   card.append(cover,heading,count);grid.append(card);
   card.addEventListener('click',()=>{openAlbumKey=key;renderCharacterAlbums();});
   resolveLibraryImage(items[0]?.thumb||items[0]?.dataUrl).then(src=>{img.src=src;}).catch(()=>{cover.remove();});
  }
  return;
 }
 const items=groups.get(openAlbumKey);
 const toolbar=document.createElement('div');toolbar.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap';
 const back=document.createElement('button');back.type='button';back.className='menu_button';back.textContent='← 返回相册列表';
 back.addEventListener('click',()=>{openAlbumKey=null;renderCharacterAlbums();});
 const title=document.createElement('strong');title.textContent=String(names[openAlbumKey]||items[0]?.albumCharacterName||'未命名相册')+' · '+items.length+' 张';
 toolbar.append(back,title);host.append(toolbar);
 const bar=buildPendingBar(()=>renderCharacterAlbums());host.append(bar);albumPendingBarText=bar._pendingText;
 const grid=document.createElement('div');grid.className='ql-cache-grid';paintGridColumns(grid,3);host.append(grid);
 for(const record of items){
  const tile=document.createElement('article');tile.className='ql-cache-tile ql-album-photo';
  const button=document.createElement('button');button.type='button';button.className='ql-cache-image';button.setAttribute('aria-label','相册照片');
  const image=document.createElement('img');image.loading='lazy';image.alt='相册照片';button.append(image);tile.append(button);grid.append(tile);
  attachPendingCheckbox(tile,record,albumPendingBarText);
  button.addEventListener('click',()=>openRecordDetail(record));
  try{image.src=await resolveLibraryImage(record.thumb||record.dataUrl);}catch(error){console.warn('[拾帧] 相册缩略图读取失败，已跳过',error);tile.remove();}
 }
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
 // 果冻页不在这里跟着刷新：底片/相册数据变了，下次切进果冻 tab 时会重新解码，不用每次 refresh() 都多扛一轮。
 jellyPickerLoaded=false;
 populateAlbumTargetSelect();syncResultFavoriteButton();
 populatePresetEditSelect();renderPresetsList();
 if(!Array.isArray(library.vibes))library.vibes=[];if(!Array.isArray(library.vibePool))library.vibePool=[];
 qlVibeAttach(library);qlRenderVibeArea();
}
// 「收藏目标相册」下拉框：选项来自推送时带过来的完整酒馆角色卡清单(characterRows)，
// 外加 library.records 里已经存在、但角色卡清单里找不到对应项的老相册名(兼容老数据/角色卡已被删除的情况)。
// 选项 value 统一用角色名字本身(不用角色卡下标)，和 app 侧相册分组一直在用 albumCharacterName 文本分组的做法一致，
// 避免重蹈"保存那一刻的下标，跨设备/跨时间点就对不上"的覆辙。
function populateAlbumTargetSelect(){
 const select=$('#ql-result-album-target');if(!select)return;
 const albums=new Map();
 for(const card of characterRows){const name=String(card?.name||card?.avatar||'').trim();if(name&&!albums.has(name))albums.set(name,name);}
 for(const record of Array.isArray(library.records)?library.records:[]){
  const name=String(record?.albumCharacterName||'').trim();
  if(name&&!albums.has(name))albums.set(name,name);
 }
 const previous=select.value,savedTarget=String(library.viewfinderAlbumTargetKey||'');
 select.replaceChildren(new Option('请选择角色卡相册',''));
 for(const name of albums.keys())select.add(new Option(name,name));
 if(previous&&[...select.options].some(option=>option.value===previous))select.value=previous;
 else if(savedTarget&&[...select.options].some(option=>option.value===savedTarget))select.value=savedTarget;
}
// 当前生成结果是否已经收藏进角色相册，决定收藏按钮显示"收藏"还是"取消收藏"。
function syncResultFavoriteButton(){
 const favorite=$('#ql-result-favorite');if(!favorite)return;
 const record=lastGeneratedAssetRef?(Array.isArray(library.records)?library.records:[]).find(r=>r?.dataUrl===lastGeneratedAssetRef):null;
 const saved=Boolean(record?.albumCharacterName);
 favorite.classList.toggle('is-favorite',saved);
 const label=saved?'取消角色相册收藏':'收藏到角色相册';
 favorite.setAttribute('aria-label',label);favorite.title=label;favorite.setAttribute('aria-pressed',String(saved));
}
function toggleResultFavorite(){
 if(!lastGeneratedAssetRef){set('ql-status','请先生成一张图片。');return;}
 const record=(Array.isArray(library.records)?library.records:[]).find(r=>r?.dataUrl===lastGeneratedAssetRef);
 if(!record){set('ql-status','暂时找不到这张图片对应的记录。');return;}
 if(record.albumCharacterName){
  delete record.albumCharacterName;delete record.albumCharacterKey;record.collection='cache';
  persist();syncResultFavoriteButton();renderFilmBatch(true);renderCharacterAlbums();
  set('ql-status','已取消收藏，图片回到底片。');return;
 }
 const select=$('#ql-result-album-target'),target=String(select?.value||'');
 if(!target){set('ql-status','请先在上面选择一个角色卡相册，再点收藏。');return;}
 const name=select.selectedOptions[0]?.textContent||target;
 record.albumCharacterName=name;record.albumCharacterKey=name;record.collection='character-album';
 persist();syncResultFavoriteButton();renderFilmBatch(true);renderCharacterAlbums();
 set('ql-status','已收藏到「'+name+'」相册。');
}
function wireViewfinderResultActions(){
 $('#ql-result-favorite')?.addEventListener('click',toggleResultFavorite);
 $('#ql-result-enlarge')?.addEventListener('click',()=>{const image=$('#ql-result img');if(image)openResultZoom(image.src);});
 $('#ql-result-album-target-save')?.addEventListener('click',()=>{
  const select=$('#ql-result-album-target'),target=String(select?.value||'');
  if(!target){set('ql-status','请先选择要作为默认目标的相册。');return;}
  library.viewfinderAlbumTargetKey=target;persist();
  set('ql-status','已保存默认收藏目标：「'+(select.selectedOptions[0]?.textContent||target)+'」。');
 });
}
// WebView 没接管 onJsConfirm，裸 window.confirm() 不会真的弹出来，直接静默当"取消"处理——
// 删除这类操作不能指望它，这里自己拿个小弹窗顶上。
function appConfirm(message){
 return new Promise(resolve=>{
  const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px';
  const box=document.createElement('div');box.className='ql-card';box.style.cssText='max-width:320px;width:100%';
  const text=document.createElement('p');text.textContent=message;text.style.margin='0 0 12px';
  const row=document.createElement('div');row.className='ql-row';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='menu_button';cancel.textContent='取消';
  const ok=document.createElement('button');ok.type='button';ok.className='menu_button ql-primary';ok.textContent='确定';
  row.append(cancel,ok);box.append(text,row);overlay.append(box);document.body.append(overlay);
  const finish=value=>{overlay.remove();resolve(value);};
  cancel.addEventListener('click',()=>finish(false));
  ok.addEventListener('click',()=>finish(true));
  overlay.addEventListener('click',event=>{if(event.target===overlay)finish(false);});
 });
}
// appConfirm 的带输入框版本，对应插件里的 qlPrompt（同样绕开裸 prompt()，WebView 默认也不处理 onJsPrompt）。
function appPrompt(message,defaultValue){
 return new Promise(resolve=>{
  const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px';
  const box=document.createElement('div');box.className='ql-card';box.style.cssText='max-width:320px;width:100%';
  const text=document.createElement('p');text.textContent=message;text.style.margin='0 0 10px';
  const input=document.createElement('input');input.type='text';input.value=defaultValue||'';input.style.cssText='width:100%;box-sizing:border-box;margin-bottom:12px';
  const row=document.createElement('div');row.className='ql-row';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='menu_button';cancel.textContent='取消';
  const ok=document.createElement('button');ok.type='button';ok.className='menu_button ql-primary';ok.textContent='确定';
  row.append(cancel,ok);box.append(text,input,row);overlay.append(box);document.body.append(overlay);
  const finish=value=>{overlay.remove();resolve(value);};
  cancel.addEventListener('click',()=>finish(null));
  ok.addEventListener('click',()=>finish(input.value));
  input.addEventListener('keydown',event=>{if(event.key==='Enter')finish(input.value);});
  overlay.addEventListener('click',event=>{if(event.target===overlay)finish(null);});
  setTimeout(()=>input.focus(),0);
 });
}
// ———— 参数页·画师串编辑区：index.html 里这套"新建/编辑/批量/应用/复制/删除"markup 原来一行JS都没接，
// 纯摆设，参数页唯一真正在工作的只有最上面原生JSON那张卡片。这里照着插件的同名逻辑搬过来(cfg()→library，
// save()→persist())，但"一键迁移智绘姬/柏宝绘"那个功能不搬——那是扫描同一个酒馆页面里其他扩展的设置，
// app是独立于酒馆运行的本机资料库，身边没有这些扩展可扫，对应UI直接隐藏，而不是留着点了没反应。
let presetBatchMode=false;
const selectedPresets=new Set();
function renderPresetsList(){
 const host=$('#ql-presets-list');if(!host)return;
 const presets=Array.isArray(library.presets)?library.presets:[];
 const countEl=$('#ql-presets-list-count');if(countEl)countEl.textContent='（共 '+presets.length+' 条）';
 const batchBox=$('#ql-presets-batch');if(batchBox)batchBox.hidden=!presetBatchMode;
 host.replaceChildren();
 if(!presets.length){const empty=document.createElement('p');empty.className='ql-muted';empty.textContent='暂无画师串。';host.append(empty);return;}
 presets.forEach((p,i)=>{
  const card=document.createElement('div');
  card.className='ql-record ql-preset-compact'+(presetBatchMode?' ql-preset-selectable':'')+(selectedPresets.has(i)?' is-selected':'');
  if(presetBatchMode){card.setAttribute('role','button');card.tabIndex=0;card.setAttribute('aria-pressed',String(selectedPresets.has(i)));}
  const info=document.createElement('div');info.className='ql-preset-compact-info';
  const strong=document.createElement('strong');strong.textContent=p.name||('画师串 '+(i+1));
  const desc=document.createElement('p');desc.className='ql-muted';desc.textContent='正向 '+(p.positive?'已设置':'空')+' · 负向 '+(p.negative?'已设置':'未设置');
  info.append(strong,desc);card.append(info);
  if(!presetBatchMode){
   const actions=document.createElement('div');actions.className='ql-preset-compact-actions';
   const apply=document.createElement('button');apply.type='button';apply.className='menu_button';apply.textContent='应用';
   apply.addEventListener('click',()=>{
    library.activeConfigMode='separate';library.activeComboIndex=-1;library.activePresetIndex=i;
    syncGenerationConfigControls();saveGenerationSelection();
    set('ql-status','已单独选中画师串：'+(p.name||'')+'。');
   });
   const edit=document.createElement('button');edit.type='button';edit.className='menu_button';edit.textContent='编辑';
   edit.addEventListener('click',()=>loadPresetForEdit(i));
   const duplicate=document.createElement('button');duplicate.type='button';duplicate.className='menu_button';duplicate.textContent='复制';
   duplicate.addEventListener('click',()=>{
    const label=p.name||('画师串 '+(i+1));
    const clone={...p,id:'preset-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),name:label+' 副本',updatedAt:Date.now()};
    library.presets.push(clone);persist();renderPresetsList();populatePresetEditSelect();
    set('ql-status','已复制画师串「'+label+'」，新的一份在列表末尾，放心改。');
   });
   const del=document.createElement('button');del.type='button';del.className='menu_button';del.textContent='删除';
   del.addEventListener('click',async()=>{if(await appConfirm('确定删除这条画师串吗？'))deletePresetAt(i);});
   actions.append(apply,edit,duplicate,del);card.append(actions);
  }else{
   card.addEventListener('click',event=>{if(event.target.closest('button'))return;togglePresetSelection(i);});
   card.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;event.preventDefault();togglePresetSelection(i);});
  }
  host.append(card);
 });
}
function togglePresetSelection(i){if(selectedPresets.has(i))selectedPresets.delete(i);else selectedPresets.add(i);renderPresetsList();}
function deletePresetAt(i){
 if(!Array.isArray(library.presets)||!library.presets[i])return;
 library.presets.splice(i,1);
 if(Number(library.activePresetIndex)===i)library.activePresetIndex=-1;
 else if(Number(library.activePresetIndex)>i)library.activePresetIndex=Number(library.activePresetIndex)-1;
 if(Array.isArray(library.combinations))for(const combo of library.combinations){
  if(Number(combo.artistIndex)===i)combo.artistIndex=-1;
  else if(Number(combo.artistIndex)>i)combo.artistIndex=Number(combo.artistIndex)-1;
 }
 persist();populatePresetEditSelect();renderPresetsList();syncGenerationConfigControls();
 set('ql-status','已删除所选画师串。');
}
function populatePresetEditSelect(){
 const select=$('#ql-preset-edit-select');if(!select)return;
 const presets=Array.isArray(library.presets)?library.presets:[];
 const previous=select.value;
 select.replaceChildren(new Option('选择要编辑的画师串',''));
 presets.forEach((p,i)=>select.add(new Option(p.name||('画师串 '+(i+1)),String(i))));
 if(previous&&[...select.options].some(o=>o.value===previous))select.value=previous;
}
function loadPresetForEdit(index){
 const p=Array.isArray(library.presets)?library.presets[index]:null;if(!p)return;
 const editor=$('#ql-preset-editor');if(editor)editor.hidden=false;
 const select=$('#ql-preset-edit-select');if(select)select.value=String(index);
 const name=$('#ql-preset-name');if(name)name.value=p.name||'';
 const positive=$('#ql-preset-positive');if(positive)positive.value=p.positive||'';
 const negative=$('#ql-preset-negative');if(negative)negative.value=p.negative||'';
 const save=$('#ql-preset-save');if(save){save.dataset.edit=String(index);save.textContent='保存修改';}
}
function resetPresetEditor(){
 const save=$('#ql-preset-save');if(save){delete save.dataset.edit;save.textContent='保存画师串组合';}
 const name=$('#ql-preset-name');if(name)name.value='';
 const positive=$('#ql-preset-positive');if(positive)positive.value='';
 const negative=$('#ql-preset-negative');if(negative)negative.value='';
}
function wirePresetsEditor(){
 $('#ql-preset-new')?.addEventListener('click',()=>{
  const editor=$('#ql-preset-editor');if(editor)editor.hidden=false;
  const select=$('#ql-preset-edit-select');if(select)select.value='';
  resetPresetEditor();
  $('#ql-preset-name')?.focus();
 });
 $('#ql-preset-edit-select')?.addEventListener('change',function(){
  const value=this.value;
  if(value===''){resetPresetEditor();const editor=$('#ql-preset-editor');if(editor)editor.hidden=true;return;}
  loadPresetForEdit(Number(value));
 });
 $('#ql-preset-save')?.addEventListener('click',()=>{
  const name=String($('#ql-preset-name')?.value||'').trim();
  const positive=String($('#ql-preset-positive')?.value||'').trim();
  if(!name||!positive){set('ql-status','预设名称和正向画风串不能为空。');return;}
  if(!Array.isArray(library.presets))library.presets=[];
  const item={name,positive,negative:String($('#ql-preset-negative')?.value||'').trim(),updatedAt:Date.now()};
  const save=$('#ql-preset-save'),edit=save?.dataset.edit;
  if(edit!==undefined&&library.presets[Number(edit)]?.id)item.id=library.presets[Number(edit)].id;
  if(edit!==undefined){library.presets[Number(edit)]=item;delete save.dataset.edit;}
  else library.presets.unshift(item);
  library.presets=library.presets.slice(0,100);
  persist();
  const savedIndex=library.presets.findIndex(x=>x.name===item.name&&x.positive===item.positive);
  populatePresetEditSelect();renderPresetsList();syncGenerationConfigControls();
  const select=$('#ql-preset-edit-select');
  if(savedIndex>=0){if(select)select.value=String(savedIndex);if(save){save.dataset.edit=String(savedIndex);save.textContent='保存修改';}}
  set('ql-status','画师串已保存，可通过上方下拉框切换编辑。');
 });
 $('#ql-preset-batch-toggle')?.addEventListener('click',function(){
  presetBatchMode=!presetBatchMode;selectedPresets.clear();
  this.textContent=presetBatchMode?'退出批量编辑':'批量编辑';
  renderPresetsList();
 });
 $('#ql-preset-select-all')?.addEventListener('click',()=>{
  selectedPresets.clear();(Array.isArray(library.presets)?library.presets:[]).forEach((_,i)=>selectedPresets.add(i));renderPresetsList();
 });
 $('#ql-preset-clear-all')?.addEventListener('click',()=>{selectedPresets.clear();renderPresetsList();});
 $('#ql-preset-export')?.addEventListener('click',()=>{
  const items=[...selectedPresets].sort((a,b)=>a-b).map(i=>library.presets?.[i]).filter(Boolean);
  if(!items.length){set('ql-status','请先勾选要导出的画师串。');return;}
  downloadText(JSON.stringify(items,null,2),'shizhen-artist-presets.json','application/json');
 });
 $('#ql-preset-bulk-delete')?.addEventListener('click',async()=>{
  const indexes=[...selectedPresets].filter(i=>library.presets?.[i]);
  if(!indexes.length){set('ql-status','请先勾选要删除的画师串。');return;}
  if(!await appConfirm('确定删除选中的 '+indexes.length+' 条画师串？'))return;
  const removed=indexes.sort((a,b)=>b-a);
  for(const i of removed){
   if(Number(library.activePresetIndex)===i)library.activePresetIndex=-1;
   else if(Number(library.activePresetIndex)>i)library.activePresetIndex=Number(library.activePresetIndex)-1;
   if(Array.isArray(library.combinations))for(const combo of library.combinations){
    if(Number(combo.artistIndex)===i)combo.artistIndex=-1;
    else if(Number(combo.artistIndex)>i)combo.artistIndex=Number(combo.artistIndex)-1;
   }
  }
  library.presets=removed.reduce((arr,i)=>{arr.splice(i,1);return arr;},library.presets.slice());
  selectedPresets.clear();persist();populatePresetEditSelect();renderPresetsList();syncGenerationConfigControls();
  set('ql-status','已删除所选画师串。');
 });
 const migrateToggle=$('#ql-migrate-toggle');
 if(migrateToggle){const row=migrateToggle.closest('.ql-artist-toolbar');if(row&&row.contains(migrateToggle))migrateToggle.remove();}
 $('#ql-migrate-panel')?.remove();
}
// ———— 参数页·Vibe 编辑区：同样原来一行JS都没接。池(vibePool)+分组(vibes)两层结构、图片编码(NAI
// /ai/encode-vibe)、文件导入(.naiv4vibe/.naiv4vibeBundle/旧版导出json)照插件逻辑搬(cfg→library，
// save→persist，qlConfirm→appConfirm，qlPrompt→appPrompt)。渲染部分插件原本就是 innerHTML+esc()
// 拼接，这里保持同样写法整段搬，不改成 createElement——这块量大，照抄最不容易漏字段。
function qlUid(){return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);}
const QL_VIBE_ENCODE_MODELS=[['nai-diffusion-4-5-full','V4.5 Full'],['nai-diffusion-4-5-curated','V4.5 Curated'],['nai-diffusion-4-full','V4 Full'],['nai-diffusion-4-curated','V4 Curated']];
// vibeModelKey/extractUsableVibe/safeMigrationStringify app.js 里独立生图那段代码已经搬过一份了（给生图请求用），
// 这里直接复用，不重复定义。
function qlVibeIsImageB64(v){return typeof v==='string'&&/^(?:iVBOR|\/9j\/|UklGR|R0lGOD)/.test(v.replace(/^data:[^,]*,/,'').slice(0,8));}
function qlVibeImgUrl(b){
 if(!b)return '';
 if(/^data:/i.test(b))return b;
 const h=b.slice(0,5);
 return 'data:'+(h.startsWith('/9j/')?'image/jpeg':h.startsWith('UklGR')?'image/webp':h.startsWith('R0lGO')?'image/gif':'image/png')+';base64,'+b;
}
function qlVibeEntryHasEncoding(entry){
 if(!entry)return false;
 if(typeof entry.image==='string'&&entry.image.replace(/\s+/g,'').length>160&&!qlVibeIsImageB64(entry.image))return true;
 try{return !!extractUsableVibe(entry.raw||entry)?.image;}catch{return false;}
}
function qlVibeMaterialize(group,s){
 const pool=Array.isArray(s.vibePool)?s.vibePool:[];
 return (group.refs||[]).map(ref=>{
  const p=pool.find(x=>x&&x.id===ref.poolId);
  if(!p)return null;
  const {thumb,imageState,...rest}=p;
  return {...rest,poolId:p.id,strength:Number(ref.strength??p.strength??0.6),informationExtracted:Number(ref.informationExtracted??p.informationExtracted??1)};
 }).filter(Boolean);
}
function qlVibeAttach(s){
 for(const g of s.vibes){
  if(!g||typeof g!=='object'||!Array.isArray(g.refs))continue;
  if(Object.getOwnPropertyDescriptor(g,'entries')?.get)continue;
  delete g.entries;delete g.hasPayload;
  Object.defineProperty(g,'entries',{configurable:true,enumerable:false,get(){return qlVibeMaterialize(g,library);}});
  Object.defineProperty(g,'hasPayload',{configurable:true,enumerable:false,get(){return g.entries.some(qlVibeEntryHasEncoding);}});
 }
}
function qlVibeEntryToPool(entry,source,sourceName){
 const {strength,informationExtracted,thumb:oldThumb,thumbnail,...rest}=entry||{};
 const item={...rest};
 let thumb=typeof oldThumb==='string'&&oldThumb?oldThumb:(typeof thumbnail==='string'&&thumbnail?thumbnail:'');
 if(qlVibeIsImageB64(item.image)){
  if(!thumb)thumb=qlVibeImgUrl(item.image);
  if(item.raw&&item.raw.encodings&&typeof item.raw.encodings==='object'&&Object.keys(item.raw.encodings).length)item.image='';
 }
 item.id=qlUid();
 item.name=String(item.name||item.title||item.label||item.filename||item.raw?.name||item.raw?.title||item.raw?.label||'未命名 Vibe');
 item.strength=Number.isFinite(Number(strength))?Number(strength):0.6;
 item.informationExtracted=Number.isFinite(Number(informationExtracted))?Number(informationExtracted):1;
 item.source=item.source||source||'import';
 item.sourceName=item.sourceName||sourceName||'';
 item.thumb=thumb;
 item.imageState=thumb?'keep':'none';
 item.createdAt=item.createdAt||Date.now();
 return item;
}
function qlVibePoolKey(entry){
 const img=String(entry?.image||''),enc=entry?.raw?.encodings?JSON.stringify(entry.raw.encodings).length+':'+JSON.stringify(entry.raw.encodings).slice(-80):'';
 return img.length+':'+img.slice(-64)+'|'+enc;
}
function qlVibeDupGroups(s){const m=new Map();for(const p of s.vibePool||[]){const k=qlVibePoolKey(p);if(k.length<=8)continue;if(!m.has(k))m.set(k,[]);m.get(k).push(p);}return [...m.values()].filter(a=>a.length>1);}
function qlVibeMergeDups(s){let removed=0;for(const arr of qlVibeDupGroups(s)){const keep=arr[0];for(const d of arr.slice(1)){for(const g of s.vibes||[]){const refs=g.refs||[];const hasKeep=refs.some(r=>r.poolId===keep.id);g.refs=hasKeep?refs.filter(r=>r.poolId!==d.id):refs.map(r=>r.poolId===d.id?{...r,poolId:keep.id}:r);}s.vibePool=s.vibePool.filter(x=>x.id!==d.id);removed++;}}return removed;}
function qlVibeAddToPool(s,entry,source,sourceName,append=false){
 if(!Array.isArray(s.vibePool))s.vibePool=[];
 const key=qlVibePoolKey(entry);
 if(key.length>8){const dup=s.vibePool.find(p=>qlVibePoolKey(p)===key);if(dup)return {item:dup,created:false};}
 const item=qlVibeEntryToPool(entry,source,sourceName);
 if(append)s.vibePool.push(item);else s.vibePool.unshift(item);
 return {item,created:true};
}
function qlLoadImageSrc(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('无法读取这张图片'));img.src=src;});}
function qlReadFileDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('读取文件失败'));r.readAsDataURL(file);});}
function qlImageToCanvas(img,maxSide){
 const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height,k=Math.min(1,maxSide/Math.max(w,h));
 const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));
 const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);return c;
}
async function qlMakeThumbFromDataUrl(dataUrl){const img=await qlLoadImageSrc(dataUrl);return qlImageToCanvas(img,256).toDataURL('image/jpeg',0.8);}
function qlBytesToB64(bytes){let out='';for(let i=0;i<bytes.length;i+=0x8000)out+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(out);}
async function qlSha256Hex(text){try{const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('');}catch{return (qlUid()+qlUid()+qlUid()+qlUid()).padEnd(64,'0').slice(0,64);}}
async function qlEncodeVibeRequest(imageB64,informationExtracted,model){
 // 注意：NAI Key/第三方地址这些字段只存在 importedSettings 里（走 App 自己的"设置移植"安全存储，
 // 不会被同步进 vault 快照），不在 library 本体上——这里必须用 cfg()（library+importedSettings
 // 合并后的结果）取，直接读 library.naiApiKey 永远是空的。
 const c=cfg(),third=c.provider==='novelai-thirdparty';
 const key=third?(c.naiThirdKey||''):(c.naiApiKey||'');
 if(!key)throw new Error(third?'请先填写 NAI 第三方 API Key。':'请先填写 NovelAI 官网 Key（偏好里的接口设置）。');
 let base=third?String(c.naiThirdEndpoint||'').replace(/\/$/,''):'https://image.novelai.net';
 if(third&&!base)throw new Error('请先填写 NAI 第三方 API 地址。');
 base=base.replace(/\/ai\/generate-image$/i,'');
 const res=await fetch(base+'/ai/encode-vibe',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({image:imageB64,information_extracted:informationExtracted,model})});
 if(!res.ok){const t=await res.text().catch(()=> '');throw new Error('编码请求失败（HTTP '+res.status+'）：'+t.slice(0,200));}
 const buf=new Uint8Array(await res.arrayBuffer());
 let b64='';
 const asText=new TextDecoder().decode(buf.subarray(0,Math.min(buf.length,200000))).trim();
 if(buf.length&&(asText.startsWith('{')||asText.startsWith('"'))){
  try{const j=JSON.parse(new TextDecoder().decode(buf));const v=typeof j==='string'?j:(j.encoding||j.vibe||j.data||j.image||'');if(typeof v==='string')b64=v.replace(/^data:[^,]*,/,'').replace(/\s+/g,'');}catch{}
 }
 if(!b64&&/^[A-Za-z0-9+/=\s]+$/.test(asText)&&asText.length>160&&asText.length===buf.length)b64=asText.replace(/\s+/g,'');
 if(!b64)b64=qlBytesToB64(buf);
 if(b64.length<160)throw new Error('编码结果过短，可能不是有效的 Vibe 编码。');
 return b64;
}
async function qlEncodeFileToVibe(file,{name,model,informationExtracted,strength}){
 const dataUrl=await qlReadFileDataUrl(file);
 const img=await qlLoadImageSrc(dataUrl);
 const png=qlImageToCanvas(img,1536).toDataURL('image/png');
 const info=Math.max(0.01,Math.min(1,Number(informationExtracted)||1));
 const enc=await qlEncodeVibeRequest(png.replace(/^data:[^,]*,/,''),info,model);
 const hash=await qlSha256Hex(enc.slice(0,4096)+model+info);
 const label=name||file.name.replace(/\.[^.]+$/,'')||'图片 Vibe';
 const raw={identifier:'novelai-vibe-transfer',version:1,type:'encoding',id:qlUid(),name:label,createdAt:Math.floor(Date.now()/1000),importInfo:{model,information_extracted:info,strength:Number(strength)||0.6},encodings:{[vibeModelKey(model)]:{[hash]:{encoding:enc,params:{information_extracted:info}}}}};
 const thumb=qlImageToCanvas(img,256).toDataURL('image/jpeg',0.8);
 return {name:label,image:'',raw,identifier:'novelai-vibe-transfer',type:'encoding',strength:Number(strength)||0.6,informationExtracted:info,thumb,source:'encode',sourceName:file.name,encodeModel:model};
}
function qlVibeThumbHtml(p){
 const st=p.imageState||(p.thumb?'keep':'delete');
 if(st==='hide')return '<div class="ql-vthumb is-empty" title="原图已隐藏">原图已隐藏</div>';
 if((st==='keep'||st==='replace')&&p.thumb)return '<div class="ql-vthumb"><img src="'+esc(p.thumb)+'" alt=""></div>';
 return '<div class="ql-vthumb is-empty">'+(st==='delete'?'原图已删除':'无原图')+'</div>';
}
function qlVibeStateLabel(p){const st=p.imageState||(p.thumb?'keep':'delete');return {keep:'原图：保留',hide:'原图：隐藏',replace:'原图：已替换',delete:'原图：已删除',none:'原图：无'}[st]||'原图：无';}
function qlVibeSourceLabel(p){return {import:'导入',encode:'图片编码',legacy:'旧数据迁移',manual:'手动'}[p.source]||'导入';}
function qlVibeEncodeBadge(p){
 const ok=qlVibeEntryHasEncoding(p);
 const keys=p.raw?.encodings&&typeof p.raw.encodings==='object'?Object.keys(p.raw.encodings):[];
 return '<span class="ql-vibe-state '+(ok?'is-ready':'is-missing')+'">'+(ok?'已编码'+(keys.length?' · '+esc(keys.join('/')):''):'缺少编码')+'</span>';
}
function qlVibeCardHtml(p,{actions='',extra=''}={}){
 return '<div class="ql-vcard">'+qlVibeThumbHtml(p)+'<div class="ql-vcard-main"><strong class="ql-vcard-name">'+esc(p.name||'未命名 Vibe')+'</strong><div class="ql-vcard-badges">'+qlVibeEncodeBadge(p)+'<span class="ql-vibe-state">'+esc(qlVibeSourceLabel(p))+(p.sourceName?' · '+esc(String(p.sourceName).slice(0,24)):'')+'</span><span class="ql-vibe-state">'+esc(qlVibeStateLabel(p))+'</span></div>'+extra+'</div>'+(actions?'<div class="ql-vcard-actions">'+actions+'</div>':'')+'</div>';
}
function qlVibeDownload(groups,fileName){
 const payload=exportVibeGroups(false,groups);
 downloadText(JSON.stringify(payload,null,2),String(fileName||'vibe').replace(/[\\/:*?"<>|]+/g,'_').trim()+'.json','application/json');
}
function qlVibeExportGroupOf(items,name){
 return {name,entries:items.map(({p,r})=>{
  const m={...p,strength:Number(r?.strength??p.strength??0.6),informationExtracted:Number(r?.informationExtracted??p.informationExtracted??1)};
  delete m.thumb;delete m.imageState;
  if((p.imageState||'keep')==='keep'||p.imageState==='replace')if(p.thumb)m.thumbnail=p.thumb;
  return m;
 })};
}
function exportVibeGroups(hideOriginalImages=false,sourceGroups=library.vibes||[]){
 const groups=(sourceGroups||[]).map(group=>{
  const clone=JSON.parse(JSON.stringify({...group,entries:Array.isArray(group.entries)?group.entries:[]}));delete clone.refs;
  return clone;
 });
 return {format:'shizhen-vibe-export',version:1,exportedAt:new Date().toISOString(),hideOriginalImages:!!hideOriginalImages,groups};
}
function qlShiftVibeComboRefs(s,mapFn){
 const fix=o=>{if(!o||o.vibeIndex==null)return;const n=Number(o.vibeIndex);if(Number.isInteger(n)&&n>=0)o.vibeIndex=mapFn(n);};
 for(const combo of s.combinations||[])fix(combo);
 if(s.activeVibeIndex!=null){const n=Number(s.activeVibeIndex);if(Number.isInteger(n)&&n>=0)s.activeVibeIndex=mapFn(n);}
}
function qlVibeEntriesFromItem(item,naiModel){
 const rawSource=item.raw||item;
 const encoded=extractUsableVibe(rawSource,naiModel);
 const entries=Array.isArray(item.entries)?item.entries.map(x=>{
  const source=x.raw?{...x.raw,image:x.image||x.raw.image||''}:x;
  const extracted=extractUsableVibe(source,naiModel);
  const image=typeof x.image==='string'&&x.image.trim()?x.image.trim().replace(/^data:(?:application\/octet-stream|image\/[^;]+);base64,/i,'').replace(/\s+/g,''):extracted?.image||'';
  return {...x,image,raw:x.raw||undefined,strength:Number(x.strength??extracted?.strength??0.6),informationExtracted:Number(x.informationExtracted??extracted?.informationExtracted??1)};
 }):(encoded||(rawSource.identifier==='novelai-vibe-transfer'&&rawSource.encodings&&Object.keys(rawSource.encodings).length))?[...(encoded?[encoded]:[{image:typeof rawSource.image==='string'?rawSource.image:'',strength:Number(rawSource.importInfo?.strength??0.6),informationExtracted:1}]).map(entry=>({...entry,raw:(rawSource.identifier==='novelai-vibe-transfer'?(({image,thumbnail,...rest})=>rest)(rawSource):rawSource),image:typeof rawSource.image==='string'?rawSource.image:entry.image,thumbnail:typeof rawSource.thumbnail==='string'?rawSource.thumbnail:undefined,strength:Number(rawSource.importInfo?.strength??entry.strength??0.6),informationExtracted:Number(entry.informationExtracted??1)}))]:[];
 return entries.filter(x=>x&&typeof x.image==='string'&&((x.image.length>160&&/^[A-Za-z0-9+/]+={0,2}$/.test(x.image))||(x.raw&&x.raw.encodings&&qlVibeEntryHasEncoding(x))));
}
function collectVibeItems(data,fileName='Vibe 导入',out=[],seen=new WeakSet()){
 if(!data||typeof data!=='object'||seen.has(data))return out;
 seen.add(data);
 if(Array.isArray(data)){for(const item of data)collectVibeItems(item,fileName,out,seen);return out;}
 const name=String(data.name||data.title||data.label||data.filename||fileName||'导入的 Vibe').trim();
 const canonical=data.identifier==='novelai-vibe-transfer';
 const directEntries=Array.isArray(data.entries)?data.entries:(Array.isArray(data.images)?data.images:(Array.isArray(data.references)?data.references:(Array.isArray(data.vibeData)?data.vibeData:(Array.isArray(data.vibes)?data.vibes:(Array.isArray(data.items)?data.items:null)))));
 if(!canonical&&directEntries&&directEntries.length&&directEntries.some(x=>x&&typeof x==='object'&&('image' in x||'raw' in x||'encoding' in x||'identifier' in x||'encodings' in x))){out.push({name,raw:data,entries:directEntries,source:'group'});return out;}
 if(canonical){out.push({name,raw:data,source:'novelai-vibe-transfer'});return out;}
 const groupKeys=/^(?:vibes?|vibeGroups?|groups|参考图组|参考组|氛围转移)$/i;
 for(const [key,value] of Object.entries(data)){
  if(Array.isArray(value)&&groupKeys.test(key)){
   for(const [index,item] of value.entries()){
    if(!item||typeof item!=='object')continue;
    const itemName=String(item.name||item.title||item.label||('Vibe '+(index+1))).trim();
    const entries=Array.isArray(item.entries)?item.entries:(Array.isArray(item.images)?item.images:(Array.isArray(item.references)?item.references:(Array.isArray(item.vibeData)?item.vibeData:(Array.isArray(item.vibes)?item.vibes:(Array.isArray(item.items)?item.items:null)))));
    if(entries){out.push({name:itemName,raw:item,entries,source:'group'});}
    else{const before=out.length;collectVibeItems(item,itemName,out,seen);if(out.length===before&&extractUsableVibe(item))out.push({name:itemName,raw:item,source:'group-item'});}
   }
   continue;
  }
  if(value&&typeof value==='object')collectVibeItems(value,name,out,seen);
 }
 return out;
}
async function readVibeArchiveJson(file){const buffer=await file.arrayBuffer(),view=new DataView(buffer),bytes=new Uint8Array(buffer),out=[];const u16=o=>view.getUint16(o,true),u32=o=>view.getUint32(o,true);const decoder=new TextDecoder();for(let p=0;p+46<=bytes.length;){if(u32(p)!==0x02014b50){p++;continue;}const method=u16(p+10),compressed=u32(p+20),nameLen=u16(p+28),extraLen=u16(p+30),commentLen=u16(p+32),localOffset=u32(p+42);const name=decoder.decode(bytes.slice(p+46,p+46+nameLen));if(/\.(?:json|naiv4vibe|naiv4vibebundle)$/i.test(name)){if(u32(localOffset)!==0x04034b50)throw new Error('Vibe 压缩包中的文件头无法识别：'+name);const localName=u16(localOffset+26),localExtra=u16(localOffset+28),start=localOffset+30+localName+localExtra,packed=bytes.slice(start,start+compressed);let raw;if(method===0)raw=packed;else if(method===8&&typeof DecompressionStream!=='undefined'){const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));raw=new Uint8Array(await new Response(stream).arrayBuffer());}else throw new Error('当前浏览器不支持该 Vibe 压缩算法。');try{out.push(JSON.parse(decoder.decode(raw)));}catch{}}p+=46+nameLen+extraLen+commentLen;}return out;}
async function qlVibeImportFile(file,mode){
 const s=library,naiModel=cfg().naiModel||'nai-diffusion-4-5-full';
 let data;
 try{data=JSON.parse(await file.text());}catch{
  const files=await readVibeArchiveJson(file);
  if(!files.length)throw new Error('无法从该文件中读取 JSON 资源；该 Vibe 文件可能使用了当前浏览器不支持的打包格式。');
  data=files;
 }
 if(!Array.isArray(s.vibes))s.vibes=[];if(!Array.isArray(s.vibePool))s.vibePool=[];
 const candidates=collectVibeItems(data,file.name);
 let pooledNew=0,pooledReused=0,groupsMade=0,refsAdded=0;
 const targetGroup=mode&&mode!=='__new__'&&mode!=='__pool__'?s.vibes.find(g=>g.id===mode):null;
 for(const item of candidates){
  const entries=qlVibeEntriesFromItem(item,naiModel);
  if(!entries.length)continue;
  const refs=[];
  for(const [j,entry] of entries.entries()){
   const withName={...entry,name:entry.name||entry.title||entry.label||entry.filename||entry.raw?.name||entry.raw?.title||entry.raw?.label||(entries.length===1&&item.name?item.name:(item.name||'参考')+' '+(j+1))};
   const r=qlVibeAddToPool(s,withName,'import',file.name);
   if(r.created)pooledNew++;else pooledReused++;
   refs.push({poolId:r.item.id,strength:Number(withName.strength??0.6),informationExtracted:Number(withName.informationExtracted??1)});
  }
  if(mode==='__pool__')continue;
  if(targetGroup){for(const ref of refs)if(!targetGroup.refs.some(x=>x.poolId===ref.poolId)){targetGroup.refs.push(ref);refsAdded++;}}
  else{
   const g={id:qlUid(),name:String(item.name||file.name||'导入的 Vibe 组'),refs,source:'import',sourceName:file.name,importedAt:Date.now(),vibeVersion:2,_vibeMigrationVersion:1};
   s.vibes.push(g);groupsMade++;
  }
 }
 if(!pooledNew&&!pooledReused)throw new Error('没有识别到可用的 Vibe 编码。请确认文件内包含当前模型对应的 NovelAI Vibe 编码，或是带有 entries 的 Vibe 分组；普通图片请到「Vibe 生成」页用图片直接编码。');
 qlVibeAttach(s);persist();
 return {pooledNew,pooledReused,groupsMade,refsAdded};
}
function qlRenderVibeArea(){
 const s=library;
 if(!Array.isArray(s.vibes))s.vibes=[];if(!Array.isArray(s.vibePool))s.vibePool=[];
 qlVibeAttach(s);
 const poolHost=$('#ql-vibe-pool-list'),groupHost=$('#ql-vibe-groups-list');
 if(poolHost){
  {const cn=$('#ql-vibe-pool-count');if(cn)cn.textContent='（'+(s.vibePool||[]).length+' 条）';const dg=qlVibeDupGroups(s),n=dg.reduce((a,x)=>a+x.length-1,0),tip=$('#ql-vibe-pool-dup-tip'),btn=$('#ql-vibe-pool-dedupe');if(tip)tip.textContent=n?'发现 '+n+' 条重复的 Vibe（编码相同），点“合并重复”只保留一份，分组里的引用会自动指向保留的那条。':'没有重复的 Vibe。';if(btn)btn.disabled=!n;if(cn&&n)cn.textContent+=' · 有 '+n+' 条重复';}
  const q=String($('#ql-vibe-pool-filter')?.value||'').trim().toLowerCase();
  const items=(s.vibePool||[]).filter(p=>!q||String(p.name||'').toLowerCase().includes(q));
  poolHost.innerHTML=items.map(p=>{
   const used=s.vibes.filter(g=>(g.refs||[]).some(r=>r.poolId===p.id)).length;
   const stateSel='<select data-vp-state="'+esc(p.id)+'" aria-label="原图状态"><option value="keep"'+((p.imageState||'keep')==='keep'?' selected':'')+'>保留原图</option><option value="hide"'+(p.imageState==='hide'?' selected':'')+'>隐藏原图</option><option value="replace">替换原图…</option><option value="delete"'+(p.imageState==='delete'?' selected':'')+'>删除原图</option></select>';
   const body='<label>名称（同步到所有引用它的分组）</label><input data-vp-name="'+esc(p.id)+'" value="'+esc(p.name||'')+'"><label>原图</label>'+stateSel+'<p class="ql-muted">被 '+used+' 个分组引用。原图状态只影响显示与导出，不影响编码数据。</p>';
   return qlVibeCardHtml(p,{extra:body,actions:'<button type="button" class="menu_button" data-vp-export="'+esc(p.id)+'">导出</button><button type="button" class="menu_button" data-vp-delete="'+esc(p.id)+'">删除</button>'});
  }).join('')||'<p class="ql-muted">'+(q?'没有匹配的 Vibe。':'Vibe 池还是空的。可以在“新建与导入”导入文件，或在“Vibe 生成”用图片直接编码。')+'</p>';
 }
 if(groupHost){
  const gq=String($('#ql-vibe-group-filter')?.value||'').trim().toLowerCase();
  const poolName=id=>String((s.vibePool||[]).find(x=>x.id===id)?.name||'').toLowerCase();
  const shownGroups=s.vibes.map((g,i)=>({g,i})).filter(({g})=>!gq||String(g.name||'').toLowerCase().includes(gq)||(g.refs||[]).some(r=>poolName(r.poolId).includes(gq)));
  groupHost.innerHTML=shownGroups.map(({g,i})=>{
   const active=Number(s.activeVibeIndex)===i;
   const mats=(g.refs||[]).map((r,j)=>({r,j,p:(s.vibePool||[]).find(x=>x.id===r.poolId)}));
   const usable=mats.filter(m=>m.p&&qlVibeEntryHasEncoding(m.p)).length;
   const rows=mats.map(({r,j,p})=>p?('<div class="ql-vref">'+qlVibeThumbHtml(p)+'<div class="ql-vcard-main"><strong class="ql-vcard-name">'+esc(p.name||'未命名')+'</strong><div class="ql-vcard-badges">'+qlVibeEncodeBadge(p)+'</div><div class="ql-row"><div><label>参考强度</label><input type="number" min="0" max="1" step="0.05" data-vg-strength="'+esc(g.id)+'|'+j+'" value="'+Math.max(0,Math.min(1,Number(r.strength??0.6)))+'"></div><div><label>Information Extracted</label><input type="number" disabled title="编码时已固定；要改需重新用原图编码" value="'+Math.max(0,Math.min(1,Number(r.informationExtracted??p.informationExtracted??1)))+'"></div></div></div><div class="ql-vcard-actions"><button type="button" class="menu_button" data-vg-unref="'+esc(g.id)+'|'+j+'">移出分组</button></div></div>'):('<div class="ql-vref"><div class="ql-vthumb is-empty">缺失</div><div class="ql-vcard-main"><strong>引用的 Vibe 已不在池中</strong></div><div class="ql-vcard-actions"><button type="button" class="menu_button" data-vg-unref="'+esc(g.id)+'|'+j+'">移出分组</button></div></div>')).join('');
   const addable=(s.vibePool||[]).filter(p=>!(g.refs||[]).some(r=>r.poolId===p.id));
   const addSel='<div class="ql-row"><select data-vg-addsel="'+esc(g.id)+'"><option value="">从 Vibe 池添加…</option>'+addable.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name||'未命名')+'</option>').join('')+'</select><button type="button" class="menu_button" data-vg-add="'+esc(g.id)+'">添加</button></div>';
   return '<div class="ql-record ql-vibe-group'+(active?' is-active':'')+'"><div class="ql-vibe-group-top"><div class="ql-vibe-group-info"><strong>'+esc(g.name||'未命名分组')+'</strong><p>'+usable+' / '+mats.length+' 条参考可用'+(active?' · 当前使用中':'')+'</p></div><button type="button" class="menu_button" data-vg-use="'+esc(g.id)+'">'+(active?'当前使用中':'整组使用')+'</button></div><label>分组名称</label><input data-vg-name="'+esc(g.id)+'" value="'+esc(g.name||'')+'"><details class="ql-vibe-details"'+(mats.length<=3?' open':'')+'><summary>组内参考（'+mats.length+'）</summary>'+(rows||'<p class="ql-muted">这个分组还没有引用任何 Vibe。</p>')+addSel+'</details><div class="ql-vibe-group-actions"><button type="button" class="menu_button" data-vg-export="'+esc(g.id)+'">导出本组</button><button type="button" class="menu_button" data-vg-delete="'+esc(g.id)+'">删除分组（不删池内 Vibe）</button></div></div>';
  }).join('')||'<p class="ql-muted">'+(gq?'没有匹配的分组。':'暂无分组。分组只引用 Vibe 池里的条目，删除分组不会删掉池里的 Vibe。')+'</p>';
 }
 const sel=$('#ql-vibe-import-target');
 if(sel){
  const old=sel.value;
  sel.innerHTML='<option value="__new__">新建分组并引用（保留文件里的分组结构）</option><option value="__pool__">仅放入 Vibe 池</option>'+s.vibes.map(g=>'<option value="'+esc(g.id)+'">追加到分组：'+esc(g.name||'未命名分组')+'</option>').join('');
  if([...sel.options].some(o=>o.value===old))sel.value=old;
 }
 const gSel=$('#ql-vibe-encode-target');
 if(gSel){
  const old=gSel.value;
  gSel.innerHTML='<option value="__pool__">仅放入 Vibe 池</option><option value="__new__">同时新建同名分组</option>'+s.vibes.map(g=>'<option value="'+esc(g.id)+'">同时加入分组：'+esc(g.name||'未命名分组')+'</option>').join('');
  if([...gSel.options].some(o=>o.value===old))gSel.value=old;
 }
}
function wireVibeEditor(){
 const st=t=>{const el=$('#ql-vibe-status');if(el)el.textContent=t;};
 $('#ql-vibe-create-group')?.addEventListener('click',async()=>{
  const name=await appPrompt('给新 Vibe 分组起个名字：','我的 Vibe 组');if(name===null)return;
  const clean=name.trim();if(!clean){st('分组名称不能为空。');return;}
  const s=library;if(!Array.isArray(s.vibes))s.vibes=[];
  s.vibes.push({id:qlUid(),name:clean,refs:[],source:'manual',createdAt:Date.now(),vibeVersion:2,_vibeMigrationVersion:1});
  qlVibeAttach(s);persist();qlRenderVibeArea();syncGenerationConfigControls();st('已创建分组「'+clean+'」，到「Vibe 编辑」里从池中添加参考。');
 });
 $('#ql-vibe-pick')?.addEventListener('click',()=>$('#ql-vibe-import-file')?.click());
 $('#ql-vibe-import-file')?.addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
   const r=await qlVibeImportFile(file,$('#ql-vibe-import-target')?.value);
   qlRenderVibeArea();syncGenerationConfigControls();
   st('导入完成：新增 '+r.pooledNew+' 条到 Vibe 池'+(r.pooledReused?'，'+r.pooledReused+' 条已存在（复用）':'')+(r.groupsMade?'，新建 '+r.groupsMade+' 个分组':'')+(r.refsAdded?'，追加 '+r.refsAdded+' 条引用':'')+'。');
  }catch(err){st('导入失败：'+(err?.message||String(err)));}
  finally{e.target.value='';}
 });
 let encodeFile=null;
 const encStatus=t=>{const el=$('#ql-vibe-encode-status');if(el)el.textContent=t;};
 $('#ql-vibe-encode-pick')?.addEventListener('click',()=>$('#ql-vibe-encode-file')?.click());
 $('#ql-vibe-encode-file')?.addEventListener('change',async e=>{
  const f=e.target.files?.[0];if(!f)return;encodeFile=f;
  try{const url=await qlMakeThumbFromDataUrl(await qlReadFileDataUrl(f));const preview=$('#ql-vibe-encode-preview');if(preview)preview.innerHTML='<div class="ql-vthumb big"><img src="'+esc(url)+'" alt=""></div>';}catch(err){encStatus('读取图片失败：'+(err?.message||err));}
  const nameInput=$('#ql-vibe-encode-name');if(nameInput&&!nameInput.value)nameInput.value=f.name.replace(/\.[^.]+$/,'');
  encStatus('已选择：'+f.name);
 });
 const modelSelect=$('#ql-vibe-encode-model');
 if(modelSelect){
  modelSelect.innerHTML=QL_VIBE_ENCODE_MODELS.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('');
  modelSelect.value=QL_VIBE_ENCODE_MODELS.some(m=>m[0]===cfg().naiModel)?cfg().naiModel:'nai-diffusion-4-5-full';
 }
 const infoInput=$('#ql-vibe-encode-info'),infoOut=$('#ql-vibe-encode-info-out');
 if(infoInput){infoInput.oninput=()=>{if(infoOut)infoOut.textContent=Number(infoInput.value).toFixed(2);};infoInput.oninput();}
 $('#ql-vibe-encode-run')?.addEventListener('click',async()=>{
  if(!encodeFile){encStatus('请先选择一张图片。');return;}
  const btn=$('#ql-vibe-encode-run');if(btn)btn.disabled=true;encStatus('正在向 NovelAI 请求编码…（会消耗 Anlas，按官网规则计费）');
  try{
   const s=library;if(!Array.isArray(s.vibes))s.vibes=[];if(!Array.isArray(s.vibePool))s.vibePool=[];
   const entry=await qlEncodeFileToVibe(encodeFile,{name:$('#ql-vibe-encode-name')?.value.trim(),model:$('#ql-vibe-encode-model')?.value,informationExtracted:$('#ql-vibe-encode-info')?.value,strength:$('#ql-vibe-encode-strength')?.value});
   const r=qlVibeAddToPool(s,entry,'encode',entry.sourceName);
   if(!r.created)encStatus('池里已经有完全相同的编码，已复用。');
   const mode=$('#ql-vibe-encode-target')?.value;
   let target=null;
   if(mode==='__new__'){target={id:qlUid(),name:entry.name,refs:[],source:'encode',createdAt:Date.now(),vibeVersion:2,_vibeMigrationVersion:1};s.vibes.push(target);}
   else if(mode!=='__pool__')target=s.vibes.find(g=>g.id===mode);
   if(target&&!target.refs.some(x=>x.poolId===r.item.id))target.refs.push({poolId:r.item.id,strength:entry.strength,informationExtracted:entry.informationExtracted});
   qlVibeAttach(s);persist();qlRenderVibeArea();syncGenerationConfigControls();
   encStatus('编码完成：「'+r.item.name+'」已加入 Vibe 池'+(target?'，并加入分组「'+target.name+'」':'')+'。');
  }catch(err){encStatus('编码失败：'+(err?.message||String(err)));}
  finally{const runBtn=$('#ql-vibe-encode-run');if(runBtn)runBtn.disabled=false;}
 });
 const poolReplace=async(id)=>{
  const input=document.createElement('input');input.type='file';input.accept='image/*';
  input.onchange=async()=>{const f=input.files?.[0];if(!f)return;const s=library,p=s.vibePool.find(x=>x.id===id);if(!p)return;try{p.thumb=await qlMakeThumbFromDataUrl(await qlReadFileDataUrl(f));p.imageState='replace';persist();qlRenderVibeArea();}catch(err){st('替换原图失败：'+(err?.message||err));}};
  input.click();
 };
 const vibeRoot=$('[data-subpage-panel="vibes"]');
 if(vibeRoot&&!vibeRoot.dataset.qlVibeChangeBound){
  vibeRoot.dataset.qlVibeChangeBound='1';
  vibeRoot.addEventListener('change',async e=>{
   const t=e.target,s=library;
   if(t.dataset?.vpName!==undefined){const p=s.vibePool.find(x=>x.id===t.dataset.vpName);if(p){p.name=t.value.trim()||p.name||'未命名 Vibe';persist();qlRenderVibeArea();}}
   else if(t.dataset?.vpState!==undefined){
    const p=s.vibePool.find(x=>x.id===t.dataset.vpState);if(!p)return;
    if(t.value==='replace'){await poolReplace(p.id);qlRenderVibeArea();return;}
    if(t.value==='delete'){if(!await appConfirm('删除原图后无法恢复显示（编码数据不受影响，之后可以用"替换原图"换一张）。继续吗？')){qlRenderVibeArea();return;}p.thumb='';p.imageState='delete';}
    else if(t.value==='hide'){p.imageState='hide';}
    else {if(!p.thumb){qlRenderVibeArea();st('这条 Vibe 已没有原图，请选择"替换原图…"。');return;}p.imageState='keep';}
    persist();qlRenderVibeArea();
   }
   else if(t.dataset?.vgName!==undefined){const g=s.vibes.find(x=>x.id===t.dataset.vgName);if(g){g.name=t.value.trim()||g.name||'未命名分组';persist();qlRenderVibeArea();}}
   else if(t.dataset?.vgStrength!==undefined){const [gid,j]=t.dataset.vgStrength.split('|'),g=s.vibes.find(x=>x.id===gid),ref=g?.refs?.[Number(j)];if(ref){ref.strength=Math.max(0,Math.min(1,Number(t.value)||0));persist();st('已保存参考强度。');}}
   else if(t.id==='ql-vibe-pool-filter'||t.id==='ql-vibe-group-filter'){qlRenderVibeArea();}
  });
  vibeRoot.addEventListener('input',e=>{if(e.target.id==='ql-vibe-pool-filter'||e.target.id==='ql-vibe-group-filter')qlRenderVibeArea();});
  vibeRoot.addEventListener('click',async e=>{
   const b=e.target.closest('button');if(!b)return;
   const d=b.dataset,s=library;
   if(b.id==='ql-vibe-pool-dedupe'){const n=qlVibeDupGroups(s).reduce((a,x)=>a+x.length-1,0);if(!n)return;if(!await appConfirm('合并 '+n+' 条重复的 Vibe？只保留每组里最靠前的一条，分组引用会改指向它。'))return;const r=qlVibeMergeDups(s);persist();qlRenderVibeArea();st('已合并，移除了 '+r+' 条重复。');return;}
   if(d.vpDelete!==undefined){
    const p=s.vibePool.find(x=>x.id===d.vpDelete);if(!p)return;
    const users=s.vibes.filter(g=>(g.refs||[]).some(r=>r.poolId===p.id));
    if(!await appConfirm('从 Vibe 池删除「'+(p.name||'未命名')+'」？'+(users.length?'它会同时从 '+users.length+' 个分组中移除。':'')+'此操作无法撤销。'))return;
    s.vibePool=s.vibePool.filter(x=>x.id!==p.id);for(const g of s.vibes)g.refs=(g.refs||[]).filter(r=>r.poolId!==p.id);
    persist();qlRenderVibeArea();st('已从 Vibe 池删除。');
   }else if(d.vpExport!==undefined){
    const p=s.vibePool.find(x=>x.id===d.vpExport);if(!p)return;
    qlVibeDownload([qlVibeExportGroupOf([{p,r:null}],p.name||'vibe')],p.name||'vibe');st('已导出「'+(p.name||'Vibe')+'」。');
   }else if(d.vgUse!==undefined){
    const i=s.vibes.findIndex(g=>g.id===d.vgUse),g=s.vibes[i];if(!g)return;
    if(!g.entries.some(qlVibeEntryHasEncoding)){st('这个分组里没有可用的预编码 Vibe。');return;}
    s.activeConfigMode='separate';s.activeComboIndex=-1;s.activeVibeIndex=i;persist();syncGenerationConfigControls();saveGenerationSelection();qlRenderVibeArea();st('已整组启用：'+(g.name||'未命名分组'));
   }else if(d.vgDelete!==undefined){
    const i=s.vibes.findIndex(x=>x.id===d.vgDelete),g=s.vibes[i];if(!g)return;
    if(!await appConfirm('删除分组「'+(g.name||'未命名')+'」？池里的 Vibe 不会被删除。'))return;
    s.vibes=s.vibes.filter(x=>x!==g);
    if(Number(s.activeVibeIndex)===i)s.activeVibeIndex=-1;
    else if(Number(s.activeVibeIndex)>i)s.activeVibeIndex=Number(s.activeVibeIndex)-1;
    qlShiftVibeComboRefs(s,n=>n===i?-1:n>i?n-1:n);
    persist();qlRenderVibeArea();syncGenerationConfigControls();st('已删除分组（池里的 Vibe 保留）。');
   }else if(d.vgUnref!==undefined){
    const [gid,j]=d.vgUnref.split('|'),g=s.vibes.find(x=>x.id===gid);if(!g)return;
    g.refs.splice(Number(j),1);persist();qlRenderVibeArea();st('已移出分组（池里的 Vibe 保留）。');
   }else if(d.vgAdd!==undefined){
    const g=s.vibes.find(x=>x.id===d.vgAdd),sel=b.parentElement.querySelector('[data-vg-addsel]');if(!g||!sel?.value){st('请先选择要添加的 Vibe。');return;}
    const p=s.vibePool.find(x=>x.id===sel.value);if(!p)return;
    g.refs.push({poolId:p.id,strength:p.strength??0.6,informationExtracted:p.informationExtracted??1});persist();qlRenderVibeArea();
   }else if(d.vgExport!==undefined){
    const g=s.vibes.find(x=>x.id===d.vgExport);if(!g)return;
    const items=(g.refs||[]).map(r=>({p:s.vibePool.find(x=>x.id===r.poolId),r})).filter(x=>x.p);
    qlVibeDownload([qlVibeExportGroupOf(items,g.name||'vibe')],g.name||'vibe');st('已导出分组「'+(g.name||'')+'」，仅含当前组。');
   }
  });
 }
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
// ———— 偏好·NAI 官网账号信息：填好 Key 之后点一下就能看到月卡到期时间、剩余 Anlas 点数、
// 当前的免费生成额度（usage，NAI 把 V4/V5 这类新模型的"每日限量"做成一个按百分比计费/回满的槽位，
// 接口里统称 usage，没有再细分到具体某个模型版本，这里按"V5 额度"的叫法展示）。
// 接口是 NovelAI 官网账号体系的 GET https://api.novelai.net/user/subscription（Bearer 官网 Key），
// 第三方 NAI 兼容服务一般不提供这个账号接口，所以仅官网模式可用。
function qlNaiTierLabel(tier){return {0:'Paper（免费）',1:'Tablet',2:'Scroll',3:'Opus'}[Number(tier)]||('未知档位 '+tier);}
function qlFormatDuration(sec){
 sec=Math.max(0,Math.round(Number(sec)||0));
 if(!sec)return '随时';
 const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
 const parts=[];if(h)parts.push(h+'小时');if(m)parts.push(m+'分钟');if(!h&&!m)parts.push(s+'秒');
 return parts.join('');
}
async function qlFetchNaiSubscription(){
 const c=cfg();
 if(c.provider==='novelai-thirdparty')throw new Error('第三方 NAI 兼容服务一般不提供官网账号信息查询，该功能仅支持 NovelAI 官网模式。');
 const key=String(c.naiApiKey||'').trim();
 if(!key)throw new Error('请先在上方填写并保存 NovelAI 官网 Key。');
 const res=await fetch('https://api.novelai.net/user/subscription',{headers:{Authorization:'Bearer '+key}});
 if(!res.ok){
  const text=await res.text().catch(()=>'');
  if(res.status===401)throw new Error('Key 无效或已过期（HTTP 401），请重新填写并保存 NovelAI 官网 Key。');
  throw new Error('查询失败（HTTP '+res.status+'）'+(text?('：'+text.slice(0,200)):''));
 }
 return res.json();
}
function qlRenderNaiSubscription(data){
 const steps=data?.trainingStepsLeft||{},fixed=Number(steps.fixedTrainingStepsLeft)||0,purchased=Number(steps.purchasedTrainingSteps)||0;
 const usage=data?.usage||null;
 const expires=Number(data?.expiresAt)?new Date(Number(data.expiresAt)*1000).toLocaleString():'无到期时间';
 const lines=[
  '档位：'+esc(qlNaiTierLabel(data?.tier))+(data?.active?'（生效中）':'（未生效）'),
  '到期时间：'+esc(expires),
  '剩余点数（Anlas）：'+(fixed+purchased)+'（固定 '+fixed+' + 购买 '+purchased+'）',
 ];
 if(usage){
  lines.push('免费生成额度（V5 等新模型用，按百分比回满）：'+Number(usage.percent||0)+'%'+(Number(usage.purchasedPercent)?'（另有购买加成 '+Number(usage.purchasedPercent)+'%）':'')+(usage.isNegative?'（当前不可用）':'')+'，距下一次 +1% 还需 '+esc(qlFormatDuration(usage.timeUntilNextPercent)));
 }
 return lines.map(l=>'<div>'+l+'</div>').join('');
}
function wireNaiSubscriptionCheck(){
 $('#ql-nai-sub-check')?.addEventListener('click',async()=>{
  const out=$('#ql-nai-sub-info');if(!out)return;
  out.textContent='正在查询…';
  try{const data=await qlFetchNaiSubscription();out.innerHTML=qlRenderNaiSubscription(data);}
  catch(err){out.textContent='查询失败：'+(err?.message||String(err));}
 });
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
wireNaiSubscriptionCheck();
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
 if(key==='vibes'){const refs=Array.isArray(item?.refs)?item.refs:[];return name+' · '+refs.length+' 条池引用';}
 if(key==='vibePool')return name+' · '+(item?.raw?.encodings?'含 raw.encodings':'编码字段待填写');
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
  vibes:{id:'vibe-'+now,name:'新 Vibe 分组',refs:[]},
  vibePool:{id:'vibe-pool-'+now,name:'新 Vibe 编码',image:'',raw:{},strength:0.6,informationExtracted:1,source:'app',imageState:'none',createdAt:now},
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


function cfg(){return {...library,...importedSettings};}
function safeMigrationStringify(value){try{return JSON.stringify(value);}catch{return '';}}
function qlWithExtraNeg(negative,c){
 const extra=String((c||cfg()).extraNegative||'').trim();if(!extra)return String(negative||'');
 const have=new Set(String(negative||'').split(/[,，]/).map(x=>x.trim().toLowerCase()).filter(Boolean));
 const add=extra.split(/[,，\n]/).map(x=>x.trim()).filter(x=>x&&!have.has(x.toLowerCase()));
 return [String(negative||'').trim().replace(/[,，]\s*$/,''),...add].filter(Boolean).join(', ');
}
let qlCurSignal=null;
function qlNaiQualitySuffix(model,mode){
 const m=String(model||''),v5=/^nai-diffusion-5-/.test(m),v45=/^nai-diffusion-4-5-/.test(m),v4=/^nai-diffusion-4-/.test(m),furry=/furry-3$/i.test(m);
 if(mode==='off')return '';
 if(v5&&mode==='light')return 'very aesthetic, amazing quality, no text';
 if(v5)return 'very aesthetic, masterpiece, no text';
 if(v45&&m.endsWith('-curated'))return 'location, masterpiece, no text, -0.8::feet::, rating:general';
 if(v45)return 'location, very aesthetic, masterpiece, no text';
 if(v4&&m.endsWith('-curated'))return 'rating:general, amazing quality, very aesthetic, absurdres';
 if(v4)return 'no text, best quality, very aesthetic, absurdres';
 if(furry)return '{best quality}, {amazing quality}';
 if(/^nai-diffusion-3$/i.test(m))return 'best quality, amazing quality, very aesthetic, absurdres';
 return '';
}

function qlNaiAppendQualityTags(prompt,model,mode){
 // 官网「Add Quality Tags」由服务端在 qualityToggle=true 时自动追加；这里只在 V5 轻量模式（服务端无此档位）手动追加，避免重复注入。
 const base=String(prompt||'').trim();
 if(mode!=='light'||!/^nai-diffusion-5-/.test(String(model||'')))return base;
 const suffix=qlNaiQualitySuffix(model,'light');
 const present=new Set(base.toLowerCase().split(/[,，]/).map(x=>x.trim()));
 const missing=suffix.split(/,\s*/).filter(tag=>!present.has(tag.toLowerCase()));
 return missing.length?[base,missing.join(', ')].filter(Boolean).join(', '):base;
}

function qlNaiQualityToggle(model,mode){
 mode=mode||'standard';
 if(mode==='off')return false;
 if(mode==='light'&&/^nai-diffusion-5-/.test(String(model||'')))return false;
 return true;
}

function vibeModelKey(model){
 if(model.includes('nai-diffusion-5-curated'))return 'v5curated';
 if(model.includes('nai-diffusion-5-full'))return 'v5full';
 if(model.includes('4-5-curated'))return 'v4-5curated';
 if(model.includes('4-5-full'))return 'v4-5full';
 if(model.includes('4-curated'))return 'v4curated';
 if(model.includes('4-full'))return 'v4full';
 if(model.includes('diffusion-3'))return 'v3';
 return 'v4-5full';
}

function extractUsableVibe(raw,model='nai-diffusion-4-5-full'){
 const seen=new WeakSet();let found='',foundGroup=null;
 const clean=value=>String(value||'').trim().replace(/^data:(?:application\/octet-stream|image\/[^;]+);base64,/i,'').replace(/\s+/g,'').replace(/-/g,'+').replace(/_/g,'/');
 const key=vibeModelKey(model),normalizeKey=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const isPayload=value=>{const v=clean(value);return v.length>160&&/^[A-Za-z0-9+/]+={0,2}$/.test(v);};
 const walk=(value,keyName='',canonical=false)=>{
  if(found||value==null)return;
  if(typeof value==='string'){
   const v=clean(value);
   if((canonical||/^(?:encoding|encoded|encodedVibe|encoded_vibe|vibeEncoding|vibe_encoding|vibeData|vibe_data|payload|base64|imageBase64|image_base64|referenceImage|reference_image)$/i.test(keyName))&&isPayload(v)){found=v;return;}
   return;
  }
  if(typeof value!=='object'||seen.has(value))return;
  seen.add(value);
  if(Array.isArray(value)){for(const item of value)walk(item,keyName,canonical);return;}
  const isCanonical=value.identifier==='novelai-vibe-transfer';
  if(isCanonical&&key==='v3'&&typeof value.image==='string'&&isPayload(value.image)){found=clean(value.image);return;}
  if(value.encodings&&typeof value.encodings==='object'){
   const encodings=value.encodings;
   const matchingKey=Object.keys(encodings).find(k=>normalizeKey(k)===normalizeKey(key)||normalizeKey(k).replace(/^v/,'')===normalizeKey(key).replace(/^v/,''));
   let group=matchingKey?encodings[matchingKey]:null;
   const unwrap=entry=>{
    if(typeof entry==='string')return isPayload(entry)?{payload:clean(entry),group:entry}:null;
    if(!entry||typeof entry!=='object')return null;
    const direct=entry.encoding??entry.encoded??entry.data??entry.payload??entry.base64;
    if(typeof direct==='string'&&isPayload(direct))return {payload:clean(direct),group:entry};
    for(const child of Object.values(entry)){const result=child&&typeof child==='object'?unwrap(child):null;if(result)return result;}
    return null;
   };
   let result=group?unwrap(group):null;
   if(!result){
    // Some .naiv4vibe exports spell model keys differently or nest the encoding under another level.
    for(const candidate of Object.values(encodings)){result=unwrap(candidate);if(result)break;}
   }
   if(result){found=result.payload;foundGroup=result.group;return;}
   // Do not stop here: some bundle variants keep a usable payload beside the encodings map.
  }
  if(isCanonical&&typeof value.image==='string'&&isPayload(value.image)){found=clean(value.image);return;}
  for(const [k,v] of Object.entries(value)){if(k==='encodings'||(isCanonical&&k==='image'))continue;walk(v,k,false);}
 };
 walk(raw);
 if(!found)return null;
 const serialized=safeMigrationStringify(raw)||'';
 const readNumber=(re,fallback)=>{const m=serialized.match(re);return m?Number(m[1]):fallback;};
 const strength=Number.isFinite(Number(raw?.importInfo?.strength))?Number(raw.importInfo.strength):readNumber(/"(?:reference_strength|referenceStrength|strength)"\s*:\s*([0-9.]+)/i,0.6);
 let informationExtracted=readNumber(/"(?:reference_information_extracted|referenceInformationExtracted|information_extracted|informationExtracted|info_extracted|infoExtracted)"\s*:\s*([0-9.]+)/i,1);
 const group=foundGroup&&typeof foundGroup==='object'?foundGroup:raw?.encodings?.[key];
 if(group&&typeof group==='object'){
  const enc=('encoding' in group||'encoded' in group||'data' in group||'payload' in group)?group:Object.values(group).find(v=>v&&typeof v==='object'&&('encoding' in v||'encoded' in v||'data' in v||'payload' in v));
  const info=enc?.params?.information_extracted??enc?.params?.informationExtracted??enc?.infoExtracted;
  if(Number.isFinite(Number(info)))informationExtracted=Number(info);
 }
 return {image:found,strength,informationExtracted};
}

function qlAutoCoordX(i,n){
 const grid=[0.1,0.3,0.5,0.7,0.9];
 if(n<=1)return 0.5;
 if(n===2)return i===0?0.3:0.7;
 const raw=0.1+(0.8*i)/(n-1);
 return grid.reduce((a,b)=>Math.abs(b-raw)<Math.abs(a-raw)?b:a,0.5);
}

async function requestImageUnlocked(prompt, negativeOverride, vibeItem=null, naiPromptData=null, edit=null, sizeOv=''){
 const signal=qlCurSignal||undefined;
 const c=cfg();
 const ov=String(sizeOv||'').split('x').map(Number),ovOk=!edit&&ov.length===2&&ov.every(n=>Number.isFinite(n)&&n>0);
 let raw='',data=null,res;
 if(c.provider==='novelai'||c.provider==='novelai-thirdparty'){
  const naiModel=c.naiModel||'nai-diffusion-4-5-full';
  // 官网使用扩展内保存的 NovelAI Key；第三方使用服务商提供的 Key 与地址。
  const negative=qlWithExtraNeg(String(negativeOverride??c.negative??''),c);
  const isV4=/^nai-diffusion-(?:4(?:-|$)|5-)/i.test(naiModel);
  const isV5=/^nai-diffusion-5-/i.test(naiModel);
  const isV3=/^nai-diffusion-3(?:-|$)/i.test(naiModel);
  const width=edit?edit.width:(ovOk?ov[0]:(Number(c.naiWidth)||832));
  const height=edit?edit.height:(ovOk?ov[1]:(Number(c.naiHeight)||1216));
  // DDIM 只有 V3 模型支持；其它模型选了它就回退到 Euler Ancestral，避免接口报错。
  const sampler=(c.naiSampler==='ddim_v3'&&!isV3)?'k_euler_ancestral':(c.naiSampler||'k_euler_ancestral');
  const parameters={
   params_version:isV5?4:3,
   width,
   height,
   scale:Number(c.naiScale)||5,
   sampler,
   noise_schedule:c.naiScheduler||'karras',
   steps:Number(c.naiSteps)||28,
   n_samples:1,
   seed:Number(c.naiSeed)>=0?Math.min(2147483647,Math.floor(Number(c.naiSeed))):Math.floor(Math.random()*2147483647),
   negative_prompt:negative,
   ucPreset:Number.isInteger(Number(c.naiUcPreset))&&Number(c.naiUcPreset)>=0&&Number(c.naiUcPreset)<=4?Number(c.naiUcPreset):3,
   qualityToggle:qlNaiQualityToggle(naiModel,c.naiQualityMode),
   dynamic_thresholding:false,
   controlnet_strength:1,
   legacy:false,
   legacy_uc:false,
   add_original_image:true,
   cfg_rescale:0,
   skip_cfg_above_sigma:null,
   legacy_v3_extend:false,
   stream:'msgpack',
   reference_strength_multiple:[],
   normalize_reference_strength_multiple:c.naiNormalizeVibeStrengths!==false,
   use_coords:false
  };
  if(sampler==='k_euler_ancestral'){
   parameters.deliberate_euler_ancestral_bug=false;
   parameters.prefer_brownian=true;
  }
  if(isV3){
   parameters.sm=false;
   parameters.sm_dyn=false;
   parameters.reference_image_multiple=[];
   parameters.reference_information_extracted_multiple=[];
   parameters.prompt=qlNaiAppendQualityTags(prompt,naiModel,c.naiQualityMode||'standard');
  }else if(isV4){
   parameters.reference_image_multiple_cached=[];
   const structured= naiPromptData&&Array.isArray(naiPromptData.characters)&&naiPromptData.characters.length>0
    ?naiPromptData:null;
   const baseCaption=qlNaiAppendQualityTags(structured?String(structured.basePrompt||prompt):prompt,naiModel,c.naiQualityMode||'standard');
   // 自动站位（设置里可选，默认关）：两个及以上角色时，按出现顺序从左到右排开，坐标吸附到 NAI 的 5×5 网格（0.1/0.3/0.5/0.7/0.9）。
   const coordsOn=!!c.naiAutoCoords&&!!structured&&structured.characters.length>=2;
   const centerOf=i=>coordsOn?{x:qlAutoCoordX(i,structured.characters.length),y:0.5}:{x:0.5,y:0.5};
   if(coordsOn)parameters.use_coords=true;
   const characterCaptions=structured?structured.characters.map((character,i)=>({char_caption:String(character.prompt||''),centers:[centerOf(i)]})):[];
   parameters.characterPrompts=structured?structured.characters.map((character,i)=>({prompt:String(character.prompt||''),uc:'',center:centerOf(i),enabled:true})):[];
   parameters.v4_prompt={caption:{base_caption:baseCaption,char_captions:characterCaptions},use_coords:coordsOn,use_order:true};
   parameters.v4_negative_prompt={caption:{base_caption:negative,char_captions:characterCaptions.map((x,i)=>({char_caption:'',centers:[centerOf(i)]}))},legacy_uc:false};
  }else{
   parameters.prompt=qlNaiAppendQualityTags(prompt,naiModel,c.naiQualityMode||'standard');
  }
  if(vibeItem){
   if(/^nai-diffusion-5-full$/i.test(naiModel))throw new Error('NovelAI V5 Full（5F）不支持 Vibe；请切换到 V5 Curated、V4/V4.5 或 V3 模型，或先取消当前 Vibe。');
   const vibes=Array.isArray(vibeItem.entries)
    ?vibeItem.entries.map(item=>{const source=item.raw?{...item.raw,image:item.image||item.raw.image||''}:item;const extracted=extractUsableVibe(source,naiModel);const hasModelMap=JSON.stringify(source).includes('"encodings"');const image=extracted?.image||(!hasModelMap&&typeof item.image==='string'&&item.image.trim()?String(item.image).trim().replace(/^data:(?:application\/octet-stream|image\/[^;]+);base64,/i,'').replace(/\s+/g,''):'');return image?{image,strength:Number(item.strength??extracted?.strength??0.6),informationExtracted:Number(item.informationExtracted??extracted?.informationExtracted??1)}:null;}).filter(Boolean)
    :(()=>{const one=extractUsableVibe(vibeItem.raw||vibeItem,naiModel);return one?[one]:[];})();
   if(!vibes.length)throw new Error('这个 Vibe 组没有识别到可发送的编码。请重新导入包含 encoding 数据的 .naiv4vibe / bundle 或智绘姬导出 JSON；普通预览图不能替代编码。');
   if(vibes.length>16)throw new Error('NovelAI 单次最多使用 16 条 Vibe 参考，请先删除多余条目。');
   if(vibes.some(v=>!Number.isFinite(v.strength)||v.strength<0||v.strength>1||!Number.isFinite(v.informationExtracted)||v.informationExtracted<0||v.informationExtracted>1))throw new Error('Vibe 强度与 Information Extracted 必须在 0 到 1 之间。');
   parameters.reference_strength_multiple=vibes.map(v=>v.strength);
   parameters.normalize_reference_strength_multiple=c.naiNormalizeVibeStrengths!==false;
   if(isV3){
    parameters.reference_image_multiple=vibes.map(v=>v.image);
    parameters.reference_information_extracted_multiple=vibes.map(v=>v.informationExtracted);
   }else if(isV4){
    parameters.reference_image_multiple_cached=vibes.map(v=>({cache_secret_key:(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,ch=>{const n=Math.random()*16|0;return(ch==='x'?n:(n&3|8)).toString(16);})),data:v.image}));
   }else{
    throw new Error('当前 NovelAI 模型不支持 Vibe Transfer，请切换到 V3、V4/V4.5 或受支持的 V5 模型。');
   }
  }
  const third=c.provider==='novelai-thirdparty';
  const naiKey=third?(c.naiThirdKey||''):(c.naiApiKey||'');
  if(!naiKey)throw new Error(third?'请先填写 NAI 第三方 API Key。':'请先填写 NovelAI 官网 Key。');
  const base=third?String(c.naiThirdEndpoint||'').replace(/\/$/,''):'https://image.novelai.net';
  if(third&&!base)throw new Error('请先填写 NAI 第三方 API 地址。');
  const endpoint=/\/ai\/generate-image$/i.test(base)?base:base+'/ai/generate-image';
  const requestPrompt=qlNaiAppendQualityTags(isV4&&naiPromptData&&Array.isArray(naiPromptData.characters)&&naiPromptData.characters.length>0
   ?String(naiPromptData.basePrompt||prompt):prompt,naiModel,c.naiQualityMode||'standard');
  if(edit){
   parameters.image=edit.image;
   parameters.strength=Math.max(0.01,Math.min(0.99,Number(edit.strength)||0.7));
   parameters.noise=Math.max(0,Math.min(0.99,Number(edit.noise)||0));
   parameters.extra_noise_seed=Number.isFinite(edit.seed)?edit.seed:Math.floor(Math.random()*2147483647);
   if(Number.isFinite(edit.seed))parameters.seed=edit.seed;
   if(edit.mode==='inpaint'){parameters.mask=edit.mask;parameters.add_original_image=true;parameters.inpaintImg2ImgStrength=1;}
  }
  const editInpaint=!!edit&&edit.mode==='inpaint';
  const requestModel=editInpaint&&!/-inpainting$/i.test(naiModel)?naiModel+'-inpainting':naiModel;
  const requestBody={input:requestPrompt,model:requestModel,action:edit?(editInpaint?'infill':'img2img'):'generate',parameters,use_new_shared_trial:true};
  res=await fetch(endpoint,{method:'POST',signal,headers:{'Content-Type':'application/json','Authorization':'Bearer '+naiKey},body:JSON.stringify(requestBody)});
  if(!res.ok){raw=await res.text();throw new Error('NovelAI 请求失败（HTTP '+res.status+'）：'+raw.slice(0,240));}
  let buffer;
  try{
   buffer=await res.arrayBuffer();
  }catch(error){
   throw new Error('读取 NovelAI 图片响应失败：'+(error?.message||String(error))+'。请检查网络、跨域代理或接口是否提前关闭连接。');
  }
  let value='';
  try{
   const view=new DataView(buffer);
   const u8=new Uint8Array(buffer);
   let eocd=-1;
   const min=Math.max(0,view.byteLength-65557);
   for(let i=view.byteLength-22;i>=min;i--){
    if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}
   }
   if(eocd<0)throw new Error('响应不是有效 ZIP（未找到中央目录结束记录）');
   const entries=view.getUint16(eocd+10,true);
   let offset=view.getUint32(eocd+16,true);
   for(let n=0;n<entries && offset+46<=view.byteLength;n++){
    if(view.getUint32(offset,true)!==0x02014b50)throw new Error('ZIP 中央目录结构无效');
    const method=view.getUint16(offset+10,true);
    const compressed=view.getUint32(offset+20,true);
    const nameLen=view.getUint16(offset+28,true);
    const extraLen=view.getUint16(offset+30,true);
    const commentLen=view.getUint16(offset+32,true);
    const localOffset=view.getUint32(offset+42,true);
    if(offset+46+nameLen+extraLen+commentLen>view.byteLength)throw new Error('ZIP 中央目录长度越界');
    const name=new TextDecoder().decode(u8.subarray(offset+46,offset+46+nameLen));
    if(/\.(png|jpe?g|webp)$/i.test(name)){
     if(localOffset+30>view.byteLength||view.getUint32(localOffset,true)!==0x04034b50)throw new Error('图片文件头无效');
     const localNameLen=view.getUint16(localOffset+26,true);
     const localExtraLen=view.getUint16(localOffset+28,true);
     const dataStart=localOffset+30+localNameLen+localExtraLen;
     if(dataStart+compressed>view.byteLength)throw new Error('图片压缩数据不完整');
     let bytes=u8.slice(dataStart,dataStart+compressed);
     if(method===8){
      if(typeof DecompressionStream==='undefined')throw new Error('当前浏览器不支持 ZIP 的 DEFLATE 解压，请更新浏览器内核。');
      try{
       const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
       const chunks=[];let total=0;
       while(true){
        const part=await reader.read();
        if(part.done)break;
        chunks.push(part.value);total+=part.value.length;
       }
       bytes=new Uint8Array(total);
       let pos=0;
       for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}
      }catch(error){
       throw new Error('ZIP 图片 DEFLATE 解压失败：'+(error?.message||String(error))+'。压缩数据可能不完整，或当前浏览器内核不兼容 deflate-raw。');
      }
     }else if(method!==0){
      throw new Error('暂不支持 ZIP 压缩方式：'+method);
     }
     const mime=/\.jpe?g$/i.test(name)?'jpeg':/\.webp$/i.test(name)?'webp':'png';
     let binary='';
     for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
     value='data:image/'+mime+';base64,'+btoa(binary);
     break;
    }
    offset+=46+nameLen+extraLen+commentLen;
   }
  }catch(error){
   throw new Error('无法解包 NovelAI 返回的图片 ZIP：'+(error?.message||String(error)));
  }
  if(!value)throw new Error('NovelAI 响应的 ZIP 中未找到 PNG/JPG/WebP 图片文件。');
  return value;
 }
 if(!c.endpoint||!c.apiKey)throw new Error('请先在拾帧设置中填写 OpenAI 兼容 API 地址和 Key');
 const model=String(c.model||'').toLowerCase();
 const negative=qlWithExtraNeg(String(negativeOverride??c.negative??''),c).trim();
 const requestedSize=String(ovOk?ov[0]+'x'+ov[1]:(c.size||'1024x1024'));const body={model:c.model||'gpt-image-1',prompt,n:1,size:requestedSize==='auto'?'1024x1024':requestedSize};
 if(model.includes('gpt-image')){
  body.quality=c.quality;
  if(negative)body.prompt=prompt+'\n\nAvoid these visual elements: '+negative;
 }else if(negative){
  body.negative_prompt=negative;
 }
 res=await fetch(c.endpoint.replace(/\/$/, '')+'/images/generations',{method:'POST',signal,headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.apiKey},body:JSON.stringify(body)});
 raw=await res.text();
 try{data=JSON.parse(raw);}catch{throw new Error('接口返回非 JSON（HTTP '+res.status+'）');}
 if(!res.ok)throw new Error(data?.error?.message||'HTTP '+res.status);
 const item=data?.data?.[0];let url=item?.b64_json?'data:image/png;base64,'+item.b64_json:item?.url;
 const candidates=[data?.images?.[0],data?.output?.[0]];
 for(const v of candidates){
  if(url||v==null)continue;
  if(typeof v==='string')url=/^(data:|https?:)/.test(v)?v:'data:image/png;base64,'+v;
  else if(typeof v==='object')url=v.url||(v.b64_json?'data:image/png;base64,'+v.b64_json:null)||(v.image?'data:image/png;base64,'+v.image:null);
 }
 if(typeof url!=='string'||!url)throw new Error('响应中没有可识别的图片');
 return url;
}

/**
 * 统一所有入口的有效提示词：手动生图、聊天标记、状态栏和重绘都应使用同一组已启用预设。
 * 手动生图会自行组装参数；其他入口走此包装函数，避免自动触发漏掉画师串/Vibe。
 */
async function appRequestImage(prompt,negative,vibeItem,naiPromptData){
 const controller=new AbortController(),seconds=Math.max(10,Math.min(600,Number(cfg().requestTimeoutSec)||180));
 const timer=setTimeout(()=>controller.abort(),seconds*1000);qlCurSignal=controller.signal;
 try{return await requestImageUnlocked(prompt,negative,vibeItem,naiPromptData,null,'');}
 catch(error){if(controller.signal.aborted||error?.name==='AbortError')throw new Error('生图请求超时或已取消；请检查网络和接口地址后重试。');throw error;}
 finally{clearTimeout(timer);qlCurSignal=null;}
}
function readAppGenerationConfig(){
 saveImportedSettingsFromControls();
 const c=cfg();
 c.provider=$('#ql-fast-provider')?.value||c.provider||'novelai';
 c.naiModel=$('#ql-fast-nai-model')?.value||c.naiModel||'nai-diffusion-4-5-full';
 c.naiSteps=Number($('#ql-fast-nai-steps')?.value)||Number(c.naiSteps)||28;
 c.naiScale=Number($('#ql-fast-nai-scale')?.value)||Number(c.naiScale)||5;
 const dims=String($('#ql-fast-nai-size-preset')?.value||'').match(/^(\d+)x(\d+)$/);
 c.naiWidth=dims?Number(dims[1]):Number(c.naiWidth)||832;c.naiHeight=dims?Number(dims[2]):Number(c.naiHeight)||1216;
 c.naiSampler=$('#ql-fast-nai-sampler')?.value||c.naiSampler||'k_euler_ancestral';
 c.naiScheduler=$('#ql-fast-nai-scheduler')?.value||c.naiScheduler||'karras';
 c.naiQualityMode=$('#ql-fast-nai-quality')?.value||c.naiQualityMode||'standard';
 c.naiUcPreset=Number($('#ql-fast-nai-uc')?.value??c.naiUcPreset??3);
 c.naiSeed=$('#ql-fast-nai-seed')?.value===''?-1:Number($('#ql-fast-nai-seed')?.value??c.naiSeed??-1);
 c.naiNormalizeVibeStrengths=$('#ql-fast-nai-normalize')?.checked??c.naiNormalizeVibeStrengths!==false;
 c.endpoint=$('#ql-endpoint')?.value?.trim().replace(/\/$/,'')||c.endpoint||'';
 c.apiKey=$('#ql-key')?.value?.trim()||c.apiKey||'';
 c.naiApiKey=$('#ql-nai-key')?.value?.trim()||c.naiApiKey||'';
 c.naiThirdEndpoint=$('#ql-nai-third-endpoint')?.value?.trim().replace(/\/$/,'')||c.naiThirdEndpoint||'';
 c.naiThirdKey=$('#ql-nai-third-key')?.value?.trim()||c.naiThirdKey||'';
 c.model=$('#ql-fast-model')?.value?.trim()||c.model||'gpt-image-1';
 c.size=$('#ql-fast-size')?.value||c.size||'auto';
 c.quality=$('#ql-fast-quality')?.value||c.quality||'medium';
 c.negative=$('#ql-negative')?.value??c.negative??'';
 return c;
}
function materializeAppVibe(group,c){
 if(!group)return null;
 if(Array.isArray(group.entries))return group;
 const pool=Array.isArray(c.vibePool)?c.vibePool:[];
 const refs=Array.isArray(group.refs)?group.refs:[];
 const entries=refs.map(ref=>{
  const item=pool.find(x=>x&&x.id===ref.poolId);if(!item)return null;
  return {...item,poolId:item.id,strength:Number(ref.strength??item.strength??0.6),informationExtracted:Number(ref.informationExtracted??item.informationExtracted??1)};
 }).filter(Boolean);
 return {...group,entries};
}
function appCharacterKey(item){return String(item?.id||((item?.characterKey??'')+'::'+(item?.name||item?.characterName||'')));}
function selectedAppCharacters(c){
 const selected=new Set(Array.isArray(c.androidSelectedCharacterKeys)?c.androidSelectedCharacterKeys:[]);
 return (Array.isArray(c.characters)?c.characters:[]).filter(item=>item&&selected.has(appCharacterKey(item)));
}
function appCharacterPrompt(item,scene){
 const parts=[String(item?.appearance||'').trim()];
 const text=String(scene||'').toLowerCase();
 for(const outfit of (Array.isArray(item?.outfits)?item.outfits:[])){
  const triggers=String(outfit?.triggers||'').split(/[|,，、\n]/).map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(triggers.some(trigger=>text.includes(trigger)))parts.push(String(outfit?.text||'').trim());
 }
 return parts.filter(Boolean).join(', ');
}

function renderAppCharacterChoices(){
 const host=$('#sz-app-character-list');if(!host)return;
 host.replaceChildren();
 const items=Array.isArray(library.characters)?library.characters:[];
 const usable=items.filter(item=>item&&String(item.appearance||'').trim());
 if(!usable.length){const p=document.createElement('p');p.className='ql-muted';p.textContent='当前快照没有可用的角色外貌词条。请先在「数据」页导入或编辑角色词条。';host.append(p);return;}
 const selected=new Set(Array.isArray(library.androidSelectedCharacterKeys)?library.androidSelectedCharacterKeys:[]);
 usable.forEach(item=>{
  const key=appCharacterKey(item),label=document.createElement('label');label.className='ql-check';label.style.cssText='display:flex;align-items:flex-start;gap:10px;margin:8px 0';
  const input=document.createElement('input');input.type='checkbox';input.checked=selected.has(key);
  const textNode=document.createElement('span'),name=document.createElement('strong'),desc=document.createElement('small');
  name.textContent=item.name||item.characterName||'未命名角色';desc.textContent=String(item.appearance||'').slice(0,180);desc.style.cssText='display:block;opacity:.72;margin-top:3px;white-space:normal';
  textNode.append(name,desc);label.append(input,textNode);host.append(label);
  input.addEventListener('change',()=>{
   const next=new Set(Array.isArray(library.androidSelectedCharacterKeys)?library.androidSelectedCharacterKeys:[]);
   if(input.checked)next.add(key);else next.delete(key);
   library.androidSelectedCharacterKeys=[...next];
   const saved=parse(native.saveLibrary(JSON.stringify(library)));
   set('ql-status',saved?.ok?'角色选择已保存。':'角色选择保存失败：'+(saved?.error||'未知错误'));
  });
 });
}

function resolveAppActiveGeneration(prompt,c){
 const combo=c.activeConfigMode!=='separate'&&Number(c.activeComboIndex)>=0?c.combinations?.[Number(c.activeComboIndex)]:null;
 const presetIndex=combo?Number(combo.artistIndex??-1):Number(c.activePresetIndex??-1);
 const vibeIndex=combo?Number(combo.vibeIndex??-1):Number(c.activeVibeIndex??-1);
 const preset=presetIndex>=0?c.presets?.[presetIndex]:null;
 const vibeGroup=vibeIndex>=0?c.vibes?.[vibeIndex]:null;
 const vibe=materializeAppVibe(vibeGroup,c);
 const basePrompt=[preset?.positive,String(prompt||'').trim()].filter(Boolean).join(', ');
 const finalNegative=[String(c.negative||'').trim(),String(preset?.negative||'').trim()].filter(Boolean).join(', ');
 const characters=selectedAppCharacters(c).map(item=>({item,prompt:appCharacterPrompt(item,prompt)})).filter(x=>x.prompt);
 const structured=/^(?:novelai|novelai-thirdparty)$/.test(c.provider||'')&&/^nai-diffusion-(?:4(?:-|$)|5-)/i.test(String(c.naiModel||''));
 const naiPromptData=structured&&characters.length?{basePrompt,characters:characters.map(x=>({key:x.item.name||x.item.characterName||'角色',prompt:x.prompt}))}:null;
 const finalPrompt=structured?basePrompt:[basePrompt,...characters.map(x=>x.prompt)].filter(Boolean).join(', ');
 return {prompt:finalPrompt,negative:finalNegative,preset,vibe,naiPromptData,characters:characters.map(x=>x.item)};
}
async function saveGeneratedAsset(dataUrl){
 let blob;
 if(/^data:/i.test(dataUrl))blob=await (await fetch(dataUrl)).blob();
 else{const response=await fetch(dataUrl);if(!response.ok)throw new Error('读取生成图片失败（HTTP '+response.status+'）');blob=await response.blob();}
 const bytes=await blob.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);
 const id=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
 const info=parse(native.localServerInfo()),base=String(info.url||'').replace(/\/+$/,'');
 if(!base||!info.token)throw new Error('本机素材数据库尚未启动，无法保存生成图片。');
 const response=await fetch(base+'/v1/assets/'+id,{method:'PUT',headers:{
  Authorization:'Bearer '+info.token,'X-Asset-Id':id,'X-Asset-Mime':blob.type||'image/png','X-Asset-Name':'shizhen-'+Date.now()+'.png'
 },body:bytes});
 if(!response.ok)throw new Error('保存图片素材失败（HTTP '+response.status+'）');
 const result=await response.json();if(!result.ok)throw new Error(result.error||'素材保存失败');
 return 'shizhen-asset://'+id;
}
function openResultZoom(dataUrl){
 const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:12px';const full=document.createElement('img');full.src=dataUrl;full.alt='生成图片原图';full.style.cssText='max-width:100%;max-height:100%;object-fit:contain';overlay.append(full);overlay.addEventListener('click',()=>overlay.remove());document.body.append(overlay);
}
// 生成结果对应的 library.records 条目，用 assetRef(shizhen-asset://<hash>) 兜住——而不是记对象引用，
// 因为 refresh() 会整个替换 library(从原生侧重新取一份)，旧对象引用会失效，但这个字符串引用始终有效。
let lastGeneratedAssetRef=null;
function showGeneratedImage(dataUrl,assetRef){
 lastGeneratedAssetRef=assetRef||null;
 const host=$('#ql-result');if(!host)return;
 host.replaceChildren();const image=document.createElement('img');image.alt='拾帧生成结果';image.src=dataUrl;image.style.cssText='display:block;max-width:100%;max-height:70vh;object-fit:contain;margin:auto;border-radius:12px;cursor:zoom-in';
 image.addEventListener('click',()=>openResultZoom(dataUrl));
 host.append(image);
 const favorite=$('#ql-result-favorite'),enlarge=$('#ql-result-enlarge');
 if(favorite)favorite.disabled=false;if(enlarge)enlarge.disabled=false;
 syncResultFavoriteButton();
}
let appGenerationBusy=false;
async function runStandaloneGeneration(){
 if(appGenerationBusy)return;
 const button=$('#ql-generate'),indicator=$('#ql-gen-indicator');
 const prompt=String($('#ql-prompt')?.value||'').trim();
 if(!prompt){set('ql-status','请先填写画面提示词，或选择包含正向画师串的配置。');return;}
 appGenerationBusy=true;if(button)button.disabled=true;if(indicator)indicator.hidden=false;set('ql-status','正在准备独立生图请求…');
 try{
  const c=readAppGenerationConfig(),resolved=resolveAppActiveGeneration(prompt,c);
  if(!resolved.prompt.trim())throw new Error('最终提示词为空，请填写画面提示词或画师串。');
  if(c.provider==='novelai'&&!c.naiApiKey)throw new Error('请先在偏好设置中导入或填写 NovelAI 官网 Key。');
  if(c.provider==='novelai-thirdparty'&&(!c.naiThirdEndpoint||!c.naiThirdKey))throw new Error('请先填写 NovelAI 第三方 API 地址和 Key。');
  if(c.provider==='openai'&&(!c.endpoint||!c.apiKey))throw new Error('请先填写 OpenAI 兼容 API 地址和 Key。');
  set('ql-status','正在连接 '+(c.provider==='openai'?'OpenAI 兼容服务':'NovelAI')+'…');
  const image=await appRequestImage(resolved.prompt,resolved.negative,resolved.vibe,resolved.naiPromptData);
  set('ql-status','图片已生成，正在写入本机素材库…');
  const assetRef=await saveGeneratedAsset(image);
  const record={at:Date.now(),source:'app-viewfinder',collection:'cache',prompt:resolved.prompt,basePrompt:prompt,negative:resolved.negative,
   provider:c.provider,model:c.provider==='openai'?c.model:c.naiModel,size:c.provider==='openai'?c.size:(c.naiWidth+'x'+c.naiHeight),quality:c.quality,
   dataUrl:assetRef,thumb:assetRef,preset:resolved.preset?{id:resolved.preset.id||'',name:resolved.preset.name||'',positive:resolved.preset.positive||'',negative:resolved.preset.negative||''}:null,
   characters:resolved.characters.map(x=>({name:x.name||x.characterName||'',characterKey:x.characterKey||''})),
   vibe:resolved.vibe?{name:resolved.vibe.name||'',entries:(resolved.vibe.entries||[]).map(x=>({strength:x.strength??0.6,informationExtracted:x.informationExtracted??1,identifier:x.identifier||x.raw?.identifier||'',type:x.type||x.raw?.type||'encoding'}))}:null};
  if(!Array.isArray(library.records))library.records=[];
  const before=library.records.slice();
  library.records.unshift(record);
  const limit=Math.max(0,Number(c.recordLimit??800));if(limit)library.records=library.records.slice(0,limit);
  const saved=parse(native.saveLibrary(JSON.stringify(library)));
  if(!saved?.ok){
   // 原生那边拒绝落盘时不能让这条记录继续赖在内存里的 library.records 上——
   // 之前这里没回滚，下一次任何无关操作触发 persist() 都会把这条"素材没登记"的坏记录
   // 当真的存进去，表现为底片/相册里突然冒出一张读不出来的死图。
   library.records=before;
   throw new Error('图片已生成并存入素材文件，但保存拾帧记录失败：'+(saved?.error||'未知错误'));
  }
  showGeneratedImage(image,assetRef);refresh();
  set('ql-status','独立生图完成，结果已保存到本机底片。');
 }catch(error){set('ql-status','生图失败：'+(error?.message||String(error)));}
 finally{appGenerationBusy=false;if(button)button.disabled=false;if(indicator)indicator.hidden=true;}
}
function wireStandaloneGeneration(){
 $('#ql-generate')?.addEventListener('click',runStandaloneGeneration);
 wireViewfinderResultActions();
 wirePresetsEditor();
 wireVibeEditor();
 renderAppCharacterChoices();
 $('#ql-fast-provider')?.addEventListener('change',()=>{
  const openai=$('#ql-fast-provider').value==='openai';
  if($('#ql-fast-openai'))$('#ql-fast-openai').hidden=!openai;
  if($('#ql-fast-nai'))$('#ql-fast-nai').hidden=openai;
  saveImportedSettingsFromControls();
 });
}

function wireDataWorkspace(){
 wireStandaloneGeneration();
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

const QL_JELLY_MW=48,QL_JELLY_MH=48;
function qlJellyCfg(){
 const c=library;
 if(typeof c.jellyOn!=='boolean'){
  const m=c.jellyMode;
  c.jellyOn=['squish','pull','both','wobble'].includes(m);
  c.jellyTap=m!=='pull';c.jellyDrag=m!=='squish';
 }
 if(typeof c.jellyTap!=='boolean')c.jellyTap=true;
 if(typeof c.jellyDrag!=='boolean')c.jellyDrag=true;
 if(typeof c.jellyShake!=='boolean')c.jellyShake=false;
 return {burst:c.jellyBurst===true,on:c.jellyOn,scope:['smudge','whole'].includes(c.jellyScope)?c.jellyScope:'local',tap:false,drag:c.jellyDrag,shake:c.jellyShake,amp:{soft:.35,mid:.5,bouncy:.65}[c.jellyStrength]||.5};
}
// 点一下连晃：两种模式——“摇晃”（随机方向推几下）/“按压反馈”（按压回弹，重复几次）。
function qlBurstCfg(){const c=library;return{mode:c.jellyBurstMode==='press'?'press':'wobble',n:Math.max(1,Math.min(10,Math.round(Number(c.jellyBurstN)||3))),decay:c.jellyBurstDecay!==false,power:Math.max(.2,Math.min(2,Number(c.jellyBurstPower)||1))};}
function qlBurst(img,pt){
 const b=qlBurstCfg();let i=0;
 const go=()=>{
  if(!img.isConnected)return;
  const fac=b.decay?(b.n>1?1-i/b.n*.82:1):1,k=b.power*fac;
  if(b.mode==='press')img._qlPress?.(k,pt);else img._qlKick?.(k*.55);
  if(++i<b.n)setTimeout(go,b.mode==='press'?420:230);
 };
 go();
}
function qlJellyReach(){const r=Number(library.jellyReach);return Number.isFinite(r)&&r>0?Math.max(.4,Math.min(2.2,r)):1;}
function qlJellyBrush(){const b=Number(library.jellyBrush);return Number.isFinite(b)&&b>0?Math.max(.02,Math.min(.2,b)):.075;}
function qlJellyState(img){
 if(!img._qlJ)img._qlJ={mask:new Float32Array(QL_JELLY_MW*QL_JELLY_MH),has:false,selecting:false};
 return img._qlJ;
}
function qlJellyClearSelection(img){
 if(!img)return;const S=qlJellyState(img);S.mask.fill(0);S.has=false;S.selecting=false;
}
async function qlJellyEnableMotion(setMsg){
 const say=t=>{try{setMsg&&setMsg(t);}catch{}};
 if(typeof DeviceMotionEvent==='undefined'){say('此浏览器不支持摇晃感应');return false;}
 if(typeof DeviceMotionEvent.requestPermission==='function'){
  try{const r=await DeviceMotionEvent.requestPermission();if(r!=='granted'){say('没有拿到动作传感器权限');return false;}}
  catch{say('请求动作传感器权限失败');return false;}
 }
 let got=false;const h=()=>{got=true;};window.addEventListener('devicemotion',h);
 setTimeout(()=>{window.removeEventListener('devicemotion',h);say(got?'摇晃已就绪：晃一晃手机试试':'没收到传感器数据：请确认是用 http://127.0.0.1 或 https 打开的酒馆，并且系统没有关闭动作传感器');},1500);
 return true;
}
function qlAttachJelly(img){
 if(!img)return;
 const S=qlJellyState(img),conf=qlJellyCfg(),amp=conf.amp,scope=conf.scope;
 img._qlJellyAbort?.abort();img._qlJellyAbort=null;
 img.style.transform='';img.style.touchAction='';img.style.willChange='';
 if(!conf.on){S.selecting=false;return;}
 if(scope==='whole'&&!S.has&&!conf.shake&&!S.selecting)return qlAttachJellyWhole(img,conf);
 let probeOk=false;
 try{const pc=document.createElement('canvas');probeOk=!!(pc.getContext('webgl')||pc.getContext('experimental-webgl'));}catch{}
 if(!probeOk)return qlAttachJellyWhole(img,conf);
 const ac=new AbortController();img._qlJellyAbort=ac;const sig={signal:ac.signal};
 const wantPointer=conf.tap||conf.drag||conf.burst||S.selecting;
 if(wantPointer){img.draggable=false;img.style.touchAction='none';img.style.webkitUserDrag='none';}
 const MW=QL_JELLY_MW,MH=QL_JELLY_MH;
 let canvas=null,selCv=null,gl=null,prog=null,posBuf=null,idxCount=0,tex=null,texSrc='',cols=0,rows=0,pos=null,locPos=0,boxW=0,boxH=0,failed=false;
 let raf=0,press=null,cx=0,cy=0,lx=0,ly=0,ofx=null,ofy=null,ovx=null,ovy=null,mv=null,shw=null,shown=false;
 const dep={x:0,v:0,t:0,k:.3,d:.6},ox={x:0,v:0,t:0,k:.3,d:.7},oy={x:0,v:0,t:0,k:.3,d:.7};
 const aff={x:[0,0,1,1,0],v:[0,0,0,0,0],t:[0,0,1,1,0]};
 const shk={x:0,y:0,vx:0,vy:0};
 const destroy=()=>{cancelAnimationFrame(raf);raf=0;try{canvas?.remove();}catch{}try{selCv?.remove();}catch{}canvas=null;selCv=null;gl=null;};
 ac.signal.addEventListener('abort',destroy);
 const box=()=>{
  const r=img.getBoundingClientRect(),cs=getComputedStyle(img);
  const f=n=>parseFloat(cs[n])||0;
  const l=f('paddingLeft')+f('borderLeftWidth'),t=f('paddingTop')+f('borderTopWidth'),rr=f('paddingRight')+f('borderRightWidth'),b=f('paddingBottom')+f('borderBottomWidth');
  return {left:l,top:t,w:Math.max(10,r.width-l-rr),h:Math.max(10,r.height-t-b)};
 };
 const compile=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error('shader');return sh;};
 // 选区采样（双线性），返回 0~1
 const maskAt=(u,v)=>{
  const gx=Math.max(0,Math.min(MW-1,u*(MW-1))),gy=Math.max(0,Math.min(MH-1,v*(MH-1)));
  const x0=Math.floor(gx),y0=Math.floor(gy),x1=Math.min(MW-1,x0+1),y1=Math.min(MH-1,y0+1),fx=gx-x0,fy=gy-y0,m=S.mask;
  return (m[y0*MW+x0]*(1-fx)+m[y0*MW+x1]*fx)*(1-fy)+(m[y1*MW+x0]*(1-fx)+m[y1*MW+x1]*fx)*fy;
 };
 const rebuildWeights=()=>{
  if(!mv)return;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const k=j*(cols+1)+i,u=i/cols,v=j/rows;
   mv[k]=S.has?maskAt(u,v):1;
   shw[k]=S.has?mv[k]:Math.pow(Math.sin(Math.PI*u),.6)*Math.pow(Math.sin(Math.PI*v),.6);
  }
 };
 // 选区显示层：低分辨率画布放大，边缘自带柔化
 const accentRgb=()=>[255,64,129]; // 选区固定用醒目的玫红，不随主题变化
 const paintSel=()=>{
  if(!selCv)return;
  const x=selCv.getContext('2d'),id=x.createImageData(MW,MH),[r,g,b]=accentRgb();
  for(let k=0;k<MW*MH;k++){id.data[k*4]=r;id.data[k*4+1]=g;id.data[k*4+2]=b;id.data[k*4+3]=Math.round(Math.min(1,S.mask[k])*175);}
  x.putImageData(id,0,0);
 };
 const placeOverlays=bx=>{
  const l=(img.offsetLeft+bx.left)+'px',t=(img.offsetTop+bx.top)+'px',w=bx.w+'px',h=bx.h+'px';
  for(const c of [canvas,selCv]){if(!c)continue;c.style.left=l;c.style.top=t;c.style.width=w;c.style.height=h;}
 };
 const ensure=()=>{
  if(failed)return false;
  try{
   const bx=box();
   if(!canvas){
    const host=img.offsetParent||img.parentElement;if(!host)throw new Error('no host');
    canvas=document.createElement('canvas');canvas.className='ql-jelly-canvas';canvas.style.cssText='position:absolute;pointer-events:none;display:none;z-index:2;';
    host.appendChild(canvas);
    selCv=document.createElement('canvas');selCv.className='ql-jelly-sel';selCv.width=MW;selCv.height=MH;selCv.style.cssText='position:absolute;pointer-events:none;z-index:3;display:none;';
    host.appendChild(selCv);
    gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true})||canvas.getContext('experimental-webgl');
    if(!gl)throw new Error('no gl');
    prog=gl.createProgram();
    gl.attachShader(prog,compile(gl.VERTEX_SHADER,'attribute vec2 aPos;attribute vec2 aUv;uniform vec2 uSize;varying vec2 vUv;void main(){vUv=aUv;gl_Position=vec4(aPos.x/uSize.x*2.0-1.0,1.0-aPos.y/uSize.y*2.0,0.0,1.0);}'));
    gl.attachShader(prog,compile(gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D uTex;varying vec2 vUv;void main(){gl_FragColor=texture2D(uTex,vUv);}'));
    gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error('link');
    gl.useProgram(prog);
    tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    posBuf=gl.createBuffer();
    locPos=gl.getAttribLocation(prog,'aPos');
   }
   const dpr=Math.min(2,window.devicePixelRatio||1);
   if(Math.abs(bx.w-boxW)>.5||Math.abs(bx.h-boxH)>.5||!pos){
    boxW=bx.w;boxH=bx.h;canvas.width=Math.round(bx.w*dpr);canvas.height=Math.round(bx.h*dpr);
    cols=32;rows=Math.max(16,Math.min(56,Math.round(cols*bx.h/bx.w)));
    const n=(cols+1)*(rows+1);pos=new Float32Array(n*2);const uvs=new Float32Array(n*2);
    ofx=new Float32Array(n);ofy=new Float32Array(n);ovx=new Float32Array(n);ovy=new Float32Array(n);mv=new Float32Array(n);shw=new Float32Array(n);
    const idx=[];
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const k=j*(cols+1)+i;uvs[k*2]=i/cols;uvs[k*2+1]=j/rows;}
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;idx.push(a,b,c,b,d,c);}
    idxCount=idx.length;
    const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);
    const ub=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,ub);gl.bufferData(gl.ARRAY_BUFFER,uvs,gl.STATIC_DRAW);
    const locUv=gl.getAttribLocation(prog,'aUv');gl.enableVertexAttribArray(locUv);gl.vertexAttribPointer(locUv,2,gl.FLOAT,false,0,0);
    gl.viewport(0,0,canvas.width,canvas.height);
    rebuildWeights();paintSel();
   }
   placeOverlays(bx);
   if(texSrc!==(img.currentSrc||img.src)){
    gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    texSrc=img.currentSrc||img.src;
   }
   return true;
  }catch(e){failed=true;destroy();console.warn('[拾帧] 局部果冻不可用，改用整图弹动',e);return false;}
 };
 const draw=()=>{
  const m=Math.min(boxW,boxH),R=.17*m*qlJellyReach(),R2=.22*m*qlJellyReach(),RR=R*R,RR2=R2*R2,shAmp=.05*m*amp;
  const useLocal=scope!=='whole',useAff=scope==='whole';
  const [tx,ty,sx,sy,rot]=aff.x,cr=Math.cos(rot*Math.PI/180),sr=Math.sin(rot*Math.PI/180),mx0=boxW/2,my0=boxH/2;
  const shOn=Math.abs(shk.x)>.0005||Math.abs(shk.y)>.0005;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const k=j*(cols+1)+i,px=i/cols*boxW,py=j/rows*boxH,m1=mv[k];
   let x=px,y=py;
   if(useLocal){
    const dx=px-cx,dy=py-cy,d2=dx*dx+dy*dy;
    const w=Math.exp(-d2/RR)*m1,w2=Math.exp(-d2/RR2)*m1;
    const f=1-dep.x*w;
    x=cx+dx*f+ox.x*w2+ofx[k];y=cy+dy*f+oy.x*w2+ofy[k];
   }
   if(useAff){
    const dxc=px-mx0,dyc=py-my0;
    const X=mx0+tx+(dxc*cr-dyc*sr)*sx,Y=my0+ty+(dxc*sr+dyc*cr)*sy;
    x=px+(X-px)*m1;y=py+(Y-py)*m1;
   }
   if(shOn){const w=shw[k];x+=shk.x*shAmp*w*(1+.6*(py/boxH-.5));y+=shk.y*shAmp*w*(1+.4*(px/boxW-.5));}
   pos[k*2]=Math.max(0,Math.min(boxW,x));pos[k*2+1]=Math.max(0,Math.min(boxH,y));
  }
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindBuffer(gl.ARRAY_BUFFER,posBuf);gl.bufferData(gl.ARRAY_BUFFER,pos,gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(locPos);gl.vertexAttribPointer(locPos,2,gl.FLOAT,false,0,0);
  gl.uniform2f(gl.getUniformLocation(prog,'uSize'),boxW,boxH);
  gl.drawElements(gl.TRIANGLES,idxCount,gl.UNSIGNED_SHORT,0);
 };
 const step=s=>{s.v+=(s.t-s.x)*s.k;s.v*=s.d;s.x+=s.v;return Math.abs(s.v)>.002||Math.abs(s.t-s.x)>.002;};
 const resetAll=()=>{
  dep.x=dep.v=ox.x=ox.v=oy.x=oy.v=0;aff.x=[0,0,1,1,0];aff.v=[0,0,0,0,0];aff.t=[0,0,1,1,0];shk.x=shk.y=shk.vx=shk.vy=0;
  if(ofx){ofx.fill(0);ofy.fill(0);ovx.fill(0);ovy.fill(0);}
 };
 const K=.16,D=.80;
 const tick=()=>{
  if(!canvas||!gl){raf=0;return;}
  let live=false;
  live=step(dep)||live;live=step(ox)||live;live=step(oy)||live;
  for(let i=0;i<5;i++){
   if(press&&!press.paint&&i<4&&scope==='whole'){aff.x[i]=aff.t[i];aff.v[i]=0;}
   else{aff.v[i]+=(aff.t[i]-aff.x[i])*K;aff.v[i]*=D;aff.x[i]+=aff.v[i];}
   if(Math.abs(aff.v[i])>.002||Math.abs(aff.t[i]-aff.x[i])>.002)live=true;
  }
  shk.vx+=-shk.x*.1;shk.vx*=.9;shk.x+=shk.vx;shk.vy+=-shk.y*.1;shk.vy*=.9;shk.y+=shk.vy;
  if(Math.abs(shk.x)>.002||Math.abs(shk.vx)>.002||Math.abs(shk.y)>.002||Math.abs(shk.vy)>.002)live=true;
  if(ofx){for(let k=0;k<ofx.length;k++){if(!press||!press.smudging){ovx[k]+=(0-ofx[k])*.12;ovy[k]+=(0-ofy[k])*.12;ovx[k]*=.8;ovy[k]*=.8;ofx[k]+=ovx[k];ofy[k]+=ovy[k];}if(Math.abs(ofx[k])>.02||Math.abs(ofy[k])>.02||Math.abs(ovx[k])>.01||Math.abs(ovy[k])>.01)live=true;}}
  draw();
  if(live||(press&&!press.paint))raf=requestAnimationFrame(tick);
  else{raf=0;canvas.style.display='none';shown=false;resetAll();}
 };
 const show=()=>{if(canvas&&!shown){canvas.style.display='block';shown=true;}};
 const kick=()=>{if(!raf)raf=requestAnimationFrame(tick);};
 const local=e=>{const r=img.getBoundingClientRect(),bx=box();return [Math.max(0,Math.min(boxW,e.clientX-r.left-bx.left)),Math.max(0,Math.min(boxH,e.clientY-r.top-bx.top))];};
 // 涂选区：自由手绘，高斯笔刷取最大值，边缘柔和
 const paintAt=(x,y)=>{
  const erase=S.tool==='erase',u=x/boxW,v=y/boxH,rad=qlJellyBrush()*Math.min(boxW,boxH),rr=rad*rad*1.3;
  for(let j=0;j<MH;j++){const dy=(j/(MH-1)-v)*boxH;if(Math.abs(dy)>rad*2.2)continue;
   for(let i=0;i<MW;i++){const dx=(i/(MW-1)-u)*boxW;if(Math.abs(dx)>rad*2.2)continue;
    const w=Math.exp(-(dx*dx+dy*dy)/rr);{const q=j*MW+i;if(erase)S.mask[q]=Math.max(0,S.mask[q]-w*1.3);else if(w>S.mask[q])S.mask[q]=Math.min(1,w*1.15);}}}
  if(erase){let any=false;for(let q=0;q<S.mask.length;q++){if(S.mask[q]<.04)S.mask[q]=0;else any=true;}S.has=any;}else S.has=true;
  paintSel();rebuildWeights();
 };
 img.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(!S.selecting&&!conf.tap&&!conf.drag&&!conf.burst)return;
  if(!ensure()){if(failed)qlAttachJellyWhole(img,conf);return;}
  const [px,py]=local(e);
  try{img.setPointerCapture(e.pointerId);}catch{}
  e.preventDefault();
  if(S.selecting){
   press={id:e.pointerId,paint:true};selCv.style.display='block';paintAt(px,py);return;
  }
  cx=px;cy=py;lx=px;ly=py;
  press={id:e.pointerId,x:e.clientX,y:e.clientY,t:Date.now(),moved:false,smudging:false};
  show();
  Object.assign(dep,{k:.3,d:.6});Object.assign(ox,{k:.3,d:.7});Object.assign(oy,{k:.3,d:.7});
  ox.t=ox.x=0;oy.t=oy.x=0;ox.v=oy.v=0;
  if(scope!=='whole'&&conf.tap)dep.t=Math.min(.5,.3*amp);
  kick();
 },sig);
 img.addEventListener('pointermove',e=>{
  if(!press||e.pointerId!==press.id||!canvas)return;
  if(press.paint){const [px,py]=local(e);paintAt(px,py);return;}
  const dx=e.clientX-press.x,dy=e.clientY-press.y;
  if(!press.moved&&Math.hypot(dx,dy)<6)return;
  press.moved=true;press.dx=dx;
  if(!conf.drag)return;
  if(scope==='whole'){
   const damp=v=>Math.sign(v)*Math.pow(Math.abs(v),.82)*.55;
   const w=boxW,h=boxH,ax=Math.abs(dx)/w,ay=Math.abs(dy)/h;
   const stX=Math.min(.38,ax*.9*amp),stY=Math.min(.38,ay*.9*amp);
   aff.t[0]=damp(dx);aff.t[1]=damp(dy);aff.t[2]=(1+stX)*(1-stY*.45);aff.t[3]=(1+stY)*(1-stX*.45);aff.t[4]=Math.max(-6,Math.min(6,dx/w*5*amp));
   kick();return;
  }
  dep.t=0;
  if(scope==='smudge'){
   // 抹开：手指划过的地方（笔刷半径内）的像素被带着走，松手后各点自己弹回原位。
   const [nx,ny]=local(e);
   const mx=nx-lx,my=ny-ly;lx=nx;ly=ny;cx=nx;cy=ny;press.smudging=true;
   const Rb=.12*Math.min(boxW,boxH),RRb=Rb*Rb,lim=.12*Math.min(boxW,boxH)*amp;
   for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const k=j*(cols+1)+i,ddx=i/cols*boxW-nx,ddy=j/rows*boxH-ny,w=Math.exp(-(ddx*ddx+ddy*ddy)/RRb)*mv[k];
    if(w<.02)continue;
    ofx[k]=Math.max(-lim,Math.min(lim,ofx[k]+mx*w*.9));ofy[k]=Math.max(-lim,Math.min(lim,ofy[k]+my*w*.9));ovx[k]=0;ovy[k]=0;
   }
   kick();return;
  }
  const damp=v=>Math.sign(v)*Math.pow(Math.abs(v),.8)*.7*amp;
  ox.t=damp(dx);oy.t=damp(dy);kick();
 },sig);
 const end=e=>{
  if(!press||(e&&e.pointerId!==press.id))return;
  const p=press;press=null;p.smudging=false;try{img.releasePointerCapture(p.id);}catch{}
  if(p.paint){return;}
  Object.assign(dep,{k:.15,d:.78});Object.assign(ox,{k:.13,d:.8});Object.assign(oy,{k:.13,d:.8});
  dep.t=0;ox.t=0;oy.t=0;
  if(scope==='whole'){
   const quick=Date.now()-p.t<450&&!p.moved;
   if(quick&&conf.tap){aff.x[2]=1+.11*amp;aff.x[3]=1-.14*amp;aff.v[2]=0;aff.v[3]=0;}
   else if(p.moved&&conf.drag){aff.v[2]-=(aff.x[2]-1)*.35;aff.v[3]-=(aff.x[3]-1)*.35;}
   aff.t=[0,0,1,1,0];
  }
  kick();
  if(conf.burst&&!S.selecting&&!p.moved&&Date.now()-p.t<450)qlBurst(img,[cx,cy]);
 };
 img.addEventListener('pointerup',end,sig);img.addEventListener('pointercancel',end,sig);
 img.addEventListener('contextmenu',e=>{if(press)e.preventDefault();},sig);
 if(S.selecting&&ensure()){selCv.style.display='block';paintSel();}
 img._qlPress=(k,pt)=>{if(S.selecting||press)return;if(!ensure())return;show();k=Math.max(.15,Number(k)||1);
  if(scope==='whole'){aff.x[2]=1+.11*amp*k;aff.x[3]=1-.14*amp*k;aff.v[2]=0;aff.v[3]=0;aff.t=[0,0,1,1,0];kick();return;}
  if(pt){cx=pt[0];cy=pt[1];}else if(!cx&&!cy){cx=boxW/2;cy=boxH/2;}
  Object.assign(dep,{k:.3,d:.6});Object.assign(ox,{k:.3,d:.7});Object.assign(oy,{k:.3,d:.7});ox.t=ox.x=0;oy.t=oy.x=0;ox.v=oy.v=0;
  dep.t=Math.min(.6,.7*amp*k);kick();
  setTimeout(()=>{Object.assign(dep,{k:.15,d:.78});dep.t=0;kick();},200);};
 img._qlKick=(k)=>{if(S.selecting||press)return;if(!ensure())return;show();const s=Math.max(.15,Number(k)||1)*(amp/.5),r=()=>(Math.random()<.5?-1:1)*(.55+Math.random()*.45);shk.vx+=Math.max(-1.2,Math.min(1.2,r()*.5*s));shk.vy+=Math.max(-1.2,Math.min(1.2,r()*.5*s));shk.x=Math.max(-1.6,Math.min(1.6,shk.x));shk.y=Math.max(-1.6,Math.min(1.6,shk.y));kick();};
 // 摇晃手机：加速度推着选区（没选区时是整张图、边缘不动）晃，停了弹簧自己回来。
 if(conf.shake&&!S.selecting){
  let gx=0,gy=0,primed=false;
  window.addEventListener('devicemotion',e=>{
   if(press)return;
   let ax=0,ay=0;const a=e.acceleration;
   if(a&&(a.x!=null||a.y!=null)){ax=a.x||0;ay=a.y||0;}
   else{const g=e.accelerationIncludingGravity||{};const vx=g.x||0,vy=g.y||0;if(!primed){gx=vx;gy=vy;primed=true;}gx=gx*.9+vx*.1;gy=gy*.9+vy*.1;ax=vx-gx;ay=vy-gy;}
   if(Math.abs(ax)+Math.abs(ay)<1.2)return;
   if(!ensure())return;
   show();
   shk.vx+=Math.max(-1.2,Math.min(1.2,-ax*.025*amp));shk.vy+=Math.max(-1.2,Math.min(1.2,ay*.025*amp));
   shk.x=Math.max(-1.6,Math.min(1.6,shk.x));shk.y=Math.max(-1.6,Math.min(1.6,shk.y));
   kick();
  },sig);
 }
}
function qlAttachJellyWhole(img,conf){
 if(!img)return;
 conf=conf||qlJellyCfg();const amp=conf.amp;
 // 每次打开都按当前设置重新决定是否启用；上一次绑的监听用 AbortController 统一撤掉。
 img._qlJellyAbort?.abort();img._qlJellyAbort=null;
 img.style.transform='';img.style.touchAction='';img.style.transformOrigin='';
 if(!conf.on||(!conf.tap&&!conf.drag&&!conf.burst))return;
 const ac=new AbortController();img._qlJellyAbort=ac;const sig={signal:ac.signal};
 img.draggable=false;img.style.touchAction='none';img.style.willChange='transform';img.style.webkitUserDrag='none';
 // 状态：x=[tx,ty,sx,sy,rot]，v=速度，t=目标
 const st={x:[0,0,1,1,0],v:[0,0,0,0,0],t:[0,0,1,1,0]};
 let raf=0,drag=null;
 const K=.16,D=.80;
 const apply=()=>{img.style.transform='translate('+st.x[0].toFixed(2)+'px,'+st.x[1].toFixed(2)+'px) rotate('+st.x[4].toFixed(3)+'deg) scale('+st.x[2].toFixed(4)+','+st.x[3].toFixed(4)+')';};
 const tick=()=>{
  let moving=false;
  for(let i=0;i<5;i++){
   if(drag&&i<4){st.x[i]=st.t[i];st.v[i]=0;}
   else{st.v[i]+=(st.t[i]-st.x[i])*K;st.v[i]*=D;st.x[i]+=st.v[i];}
   if(Math.abs(st.v[i])>.0008||Math.abs(st.t[i]-st.x[i])>.0008)moving=true;
  }
  apply();
  if(moving||drag)raf=requestAnimationFrame(tick);
  else{raf=0;st.x=[0,0,1,1,0];st.v=[0,0,0,0,0];img.style.transform='';}
 };
 const kick=()=>{if(!raf)raf=requestAnimationFrame(tick);};
 const rest=()=>{st.t=[0,0,1,1,0];};
 const squish=()=>{st.x[2]=1+.11*amp;st.x[3]=1-.14*amp;st.v[2]=0;st.v[3]=0;rest();kick();};
 img._qlPress=(k)=>{if(drag)return;k=Math.max(.15,Number(k)||1);st.x[2]=1+.11*amp*k;st.x[3]=1-.14*amp*k;st.v[2]=0;st.v[3]=0;rest();kick();};
 img._qlKick=(k)=>{if(drag)return;const s=Math.max(.15,Number(k)||1)*(amp/.5),sg=Math.random()<.5?-1:1;st.v[4]+=sg*2.4*s;st.v[2]+=sg*.03*s;st.v[3]-=sg*.04*s;st.v[0]+=-sg*1.6*s;rest();kick();};
 img.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,t:Date.now(),moved:false};
  try{img.setPointerCapture(e.pointerId);}catch{}
  e.preventDefault();
 },sig);
 img.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.moved&&Math.hypot(dx,dy)<6)return;
  drag.moved=true;
  if(!conf.drag)return;
  const w=img.clientWidth||300,h=img.clientHeight||300;
  // 沿拖动方向拉伸、垂直方向收窄，图片中心跟着手指走一小段（橡皮筋式阻尼）。
  const damp=v=>Math.sign(v)*Math.pow(Math.abs(v),.82)*.55;
  const ax=Math.abs(dx)/w,ay=Math.abs(dy)/h;
  const stretchX=Math.min(.38,ax*.9*amp),stretchY=Math.min(.38,ay*.9*amp);
  st.t[0]=damp(dx);st.t[1]=damp(dy);
  st.t[2]=(1+stretchX)*(1-stretchY*.45);st.t[3]=(1+stretchY)*(1-stretchX*.45);
  st.t[4]=Math.max(-6,Math.min(6,dx/w*5*amp));
  kick();
 },sig);
 const end=e=>{
  if(!drag||(e&&e.pointerId!==drag.id))return;
  const d=drag;drag=null;try{img.releasePointerCapture(d.id);}catch{}
  const quick=Date.now()-d.t<450&&!d.moved;
  if(quick&&conf.burst){qlBurst(img);rest();return;}
  if(quick&&conf.tap){squish();return;}
  if(d.moved&&conf.drag){
   // 松手：保留当前拉伸状态，并给一点反向速度，弹簧会带来 Q 弹的过冲。
   st.v[2]-=(st.x[2]-1)*.35;st.v[3]-=(st.x[3]-1)*.35;rest();kick();return;
  }
  rest();kick();
 };
 img.addEventListener('pointerup',end,sig);img.addEventListener('pointercancel',end,sig);
 img.addEventListener('contextmenu',e=>{if(drag)e.preventDefault();},sig);
}
function openJellyViewer(url){
 if(!url)return;
 let overlay=document.querySelector('.ql-viewfinder-lightbox');
 if(!overlay){
  overlay=document.createElement('dialog');overlay.className='ql-viewfinder-lightbox';overlay.setAttribute('aria-label','放大查看图片');
  overlay.innerHTML='<div class="ql-album-paper is-flip"><div class="ql-album-single-page"><button type="button" class="ql-viewfinder-lightbox-close" aria-label="关闭图片" title="关闭"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div class="ql-album-single-photo"><img alt="放大查看的生成图片"></div></div></div>';
  {
   // 放大图下方的果冻面板：范围 / 选区 / 交互，不用回设置页。
   const bar=document.createElement('div');bar.className='ql-jelly-bar';bar.setAttribute('role','group');bar.setAttribute('aria-label','果冻互动');
   bar.innerHTML='<div class="ql-jb-head"><button type="button" data-jb="power"></button><button type="button" data-jb="more">设置 ▴</button><button type="button" data-jb-tool="add" aria-label="增加选区（画笔）" title="增加选区" hidden><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/><path d="M14 7l3 3"/></svg></button><button type="button" data-jb-tool="erase" aria-label="擦除选区（橡皮）" title="擦除选区" hidden><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 20h12"/><path d="M5 15l8-8a2 2 0 0 1 3 0l3 3a2 2 0 0 1 0 3l-6 6H9z"/><path d="M9 11l6 6"/></svg></button><button type="button" data-jb="clr" aria-label="清除全部选区" title="清除全部选区" hidden><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/></svg></button><button type="button" data-jb="done" aria-label="完成选区" title="完成" hidden><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg></button><label class="ql-jb-brush" hidden title="画笔粗细"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/></svg><input type="range" min="2" max="20" step="1" data-jb-brush aria-label="画笔粗细"></label></div>'
    +'<div class="ql-jb-panel" hidden><div class="ql-jb-row"><b>范围</b><button type="button" data-jb-scope="local">局部</button><button type="button" data-jb-scope="smudge">抹开</button><button type="button" data-jb-scope="whole">全屏</button></div>'
    +'<div class="ql-jb-row"><b>选区</b><button type="button" data-jb="sel">✎ 涂选区</button><button type="button" data-jb="clr2">清除</button><em class="ql-jb-hint"></em></div>'
    +'<div class="ql-jb-row"><b>交互</b><button type="button" data-jb-in="drag">拖动</button><button type="button" data-jb-in="shake">摇晃</button><button type="button" data-jb-in="burst" title="点一下图，自己连晃几下">点一下连晃</button>'
    +'<span class="ql-jb-dd"><button type="button" class="ql-jb-dd-btn" data-jb-dd aria-haspopup="listbox" aria-expanded="false"><span data-jb-dd-label>Q弹</span> ▾</button><span class="ql-jb-dd-list" role="listbox" hidden><button type="button" role="option" data-jb-strength="soft">软糯</button><button type="button" role="option" data-jb-strength="mid">Q弹</button><button type="button" role="option" data-jb-strength="bouncy">DUANG</button></span></span></div>'
    +'<div class="ql-jb-row"><b>反馈</b><span class="ql-jb-brush ql-jb-reach"><small>小</small><input type="range" min="40" max="220" step="5" data-jb-reach aria-label="反馈范围"><small>大</small></span><em class="ql-jb-hint">手指按下去影响多大一块</em></div>'
    +'<div class="ql-jb-msg" role="status"></div></div>';
   const $b=sel=>bar.querySelector(sel);
   const setMsg=t=>{$b('.ql-jb-msg').textContent=t||'';};
   const paintBar=()=>{
    const c=qlJellyCfg(),img=overlay.querySelector('img'),S=img?qlJellyState(img):{has:false,selecting:false};
    $b('[data-jb=power]').textContent=c.on?'果冻：开':'果冻：关';$b('[data-jb=power]').classList.toggle('is-active',c.on);
    bar.classList.toggle('is-off',!c.on);bar.classList.toggle('is-selecting',!!S.selecting);
    bar.querySelectorAll('[data-jb-scope]').forEach(b=>b.classList.toggle('is-active',b.dataset.jbScope===c.scope));
    const ins={tap:c.tap,drag:c.drag,shake:c.shake,burst:c.burst};const stv=['soft','bouncy'].includes(library.jellyStrength)?library.jellyStrength:'mid';bar.querySelectorAll('[data-jb-strength]').forEach(b=>b.classList.toggle('is-active',b.dataset.jbStrength===stv));{const lab=$b('[data-jb-dd-label]');if(lab)lab.textContent={soft:'软糯',mid:'Q弹',bouncy:'DUANG'}[stv];}bar.querySelectorAll('[data-jb-in]').forEach(b=>b.classList.toggle('is-active',!!ins[b.dataset.jbIn]));
    {const ri=$b('[data-jb-reach]');if(ri&&document.activeElement!==ri)ri.value=Math.round(qlJellyReach()*100);}
    $b('[data-jb=sel]').classList.toggle('is-active',!!S.selecting);
    $b('.ql-jb-hint').textContent=S.has?'已选区（只有选中的地方会动）':'未选区（整张图都会动）';
    $b('.ql-jb-brush').hidden=!S.selecting;bar.querySelectorAll('[data-jb-tool]').forEach(t=>{t.hidden=!S.selecting;t.classList.toggle('is-active',(S.tool||'add')===t.dataset.jbTool);});$b('[data-jb=power]').hidden=!!S.selecting;{const bi=$b('[data-jb-brush]');if(bi&&document.activeElement!==bi)bi.value=String(Math.round(qlJellyBrush()*100));}
    $b('[data-jb=done]').hidden=!S.selecting;$b('[data-jb=clr]').hidden=!S.selecting;$b('[data-jb=more]').hidden=!!S.selecting;
    if(S.selecting)$b('.ql-jb-panel').hidden=true;
    $b('[data-jb=more]').textContent=$b('.ql-jb-panel').hidden?'设置 ▴':'收起 ▾';
    overlay._qlPaintComicBar?.();
   };
   const syncSettings=()=>{
    const c=qlJellyCfg(),set=(id,fn)=>{const el=document.querySelector(id);if(el)fn(el);};
    set('#ql-jelly-on',el=>{el.value=c.on?'on':'off';});set('#ql-jelly-scope',el=>{el.value=c.scope;});
    set('#ql-jelly-strength',el=>{el.value=['soft','bouncy'].includes(library.jellyStrength)?library.jellyStrength:'mid';});set('#ql-jelly-drag',el=>{el.checked=c.drag;});set('#ql-jelly-shake',el=>{el.checked=c.shake;});
   };
   const rebind=()=>{qlAttachJelly(overlay.querySelector('img'));paintBar();syncSettings();};
   bar.addEventListener('input',e=>{
    const rr=e.target.closest('[data-jb-reach]');
    if(rr){e.stopPropagation();library.jellyReach=Number(rr.value)/100;persist();
     const img=overlay.querySelector('img'),host=img&&(img.offsetParent||img.parentElement);if(!host)return;
     let ring=host.querySelector('.ql-jb-ring');if(!ring){ring=document.createElement('div');ring.className='ql-jb-ring';host.appendChild(ring);}
     const d=2*.19*qlJellyReach()*Math.min(img.clientWidth,img.clientHeight);
     ring.style.cssText='position:absolute;pointer-events:none;z-index:4;border-radius:50%;border:2px dashed #ff4081;background:rgba(255,64,129,.18);width:'+d+'px;height:'+d+'px;left:'+(img.offsetLeft+img.clientWidth/2-d/2)+'px;top:'+(img.offsetTop+img.clientHeight/2-d/2)+'px';
     clearTimeout(ring._t);ring._t=setTimeout(()=>ring.remove(),800);return;}
    const bi=e.target.closest('[data-jb-brush]');if(!bi)return;e.stopPropagation();
    library.jellyBrush=Number(bi.value)/100;persist();
    // 临时画一个圈让你看到当前粗细
    const img=overlay.querySelector('img'),host=img.offsetParent||img.parentElement;if(!host)return;
    let ring=host.querySelector('.ql-jb-ring');if(!ring){ring=document.createElement('div');ring.className='ql-jb-ring';host.appendChild(ring);}
    const d=2.2*qlJellyBrush()*Math.min(img.clientWidth,img.clientHeight);
    ring.style.cssText='position:absolute;pointer-events:none;z-index:4;border-radius:50%;border:2px solid #ff4081;background:rgba(255,64,129,.25);width:'+d+'px;height:'+d+'px;left:'+(img.offsetLeft+img.clientWidth/2-d/2)+'px;top:'+(img.offsetTop+img.clientHeight/2-d/2)+'px';
    clearTimeout(ring._t);ring._t=setTimeout(()=>ring.remove(),800);
   });
   bar.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;e.preventDefault();e.stopPropagation();
    const c=library,img=overlay.querySelector('img'),S=qlJellyState(img),d=b.dataset;
    if(d.jb==='power'){qlJellyCfg();c.jellyOn=!c.jellyOn;if(!c.jellyOn)S.selecting=false;persist();rebind();return;}
    if(d.jb==='more'){const p=$b('.ql-jb-panel');p.hidden=!p.hidden;paintBar();return;}
    if(d.jb==='sel'){qlJellyCfg();if(!c.jellyOn){c.jellyOn=true;persist();}S.selecting=true;S.tool='add';rebind();return;}
    if(d.jbTool){S.tool=d.jbTool;paintBar();return;}
    if(d.jb==='done'){S.selecting=false;rebind();return;}
    if(d.jb==='clr'||d.jb==='clr2'){qlJellyClearSelection(img);if(d.jb==='clr')S.selecting=true;rebind();return;}
    if(d.jbScope){qlJellyCfg();c.jellyScope=d.jbScope;c.jellyOn=true;persist();rebind();return;}
    if(d.jbDd!==undefined){const l=$b('.ql-jb-dd-list'),p=$b('.ql-jb-panel');l.hidden=!l.hidden;p.classList.toggle('is-dd-open',!l.hidden);b.setAttribute('aria-expanded',String(!l.hidden));return;}
    if(d.jbStrength){c.jellyStrength=d.jbStrength;persist();{const l=$b('.ql-jb-dd-list'),p=$b('.ql-jb-panel');l.hidden=true;p.classList.remove('is-dd-open');$b('[data-jb-dd]').setAttribute('aria-expanded','false');}rebind();return;}
    if(d.jbIn){
     qlJellyCfg();const key={tap:'jellyTap',drag:'jellyDrag',shake:'jellyShake',burst:'jellyBurst'}[d.jbIn];c[key]=!c[key];if(c[key])c.jellyOn=true;persist();
     if(d.jbIn==='shake'&&c.jellyShake){setMsg('');await qlJellyEnableMotion(setMsg);}
     else if(d.jbIn==='shake')setMsg('');
     rebind();
    }
   });
   overlay._qlPaintJellyBar=paintBar;overlay._qlJellyMsg=setMsg;overlay.append(bar);
  }
  overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('.ql-viewfinder-lightbox-close')){if(overlay.open)overlay.close();else overlay.removeAttribute('open');}});
  overlay.addEventListener('close',()=>{overlay.querySelector('img')?.removeAttribute('src');});
  document.body.append(overlay);
 }
 overlay.querySelector('img').src=url;
 qlJellyClearSelection(overlay.querySelector('img'));{const jp=overlay.querySelector('.ql-jb-panel');if(jp)jp.hidden=true;}overlay._qlJellyMsg?.('');
 qlAttachJelly(overlay.querySelector('img'));overlay._qlPaintJellyBar?.();
 if(!overlay.open){
  if(typeof overlay.showModal==='function')overlay.showModal();
  else{overlay.setAttribute('open','');overlay.style.position='fixed';}
 }
}

function bindJellySettings(){
 {const c0=qlJellyCfg(),on=$('#ql-jelly-on'),sc=$('#ql-jelly-scope'),dr=$('#ql-jelly-drag'),sk=$('#ql-jelly-shake'),js=$('#ql-jelly-strength'),msg=$('#ql-jelly-shake-msg');
  if(on){on.value=c0.on?'on':'off';on.onchange=()=>{qlJellyCfg();library.jellyOn=on.value==='on';persist();};}
  if(sc){sc.value=c0.scope;sc.onchange=()=>{qlJellyCfg();library.jellyScope=sc.value;persist();};}
  if(dr){dr.checked=c0.drag;dr.onchange=()=>{qlJellyCfg();library.jellyDrag=dr.checked;persist();};}
  if(sk){sk.checked=c0.shake;sk.onchange=async()=>{qlJellyCfg();library.jellyShake=sk.checked;persist();if(sk.checked){if(msg)msg.textContent='';await qlJellyEnableMotion(t=>{if(msg)msg.textContent=t;});}else if(msg)msg.textContent='';};}
  if(js){js.value=['soft','bouncy'].includes(library.jellyStrength)?library.jellyStrength:'mid';js.onchange=()=>{library.jellyStrength=js.value;persist();};}}
 {const q=id=>$(id),bx=q('#ql-jelly-burst'),box=q('#ql-burst-box'),mode=q('#ql-burst-mode'),n=q('#ql-burst-n'),pw=q('#ql-burst-power'),dc=q('#ql-burst-decay');
  if(bx&&mode&&n&&pw&&dc){const paint=()=>{const b=qlBurstCfg();bx.checked=library.jellyBurst===true;box.style.display=bx.checked?'':'none';mode.value=b.mode;n.value=b.n;pw.value=Math.round(b.power*100);dc.checked=b.decay;q('#ql-burst-n-v').textContent=b.n+' 次';q('#ql-burst-power-v').textContent=Math.round(b.power*100)+'%';};
   const set=()=>{qlJellyCfg();const c=library;c.jellyBurst=bx.checked;if(bx.checked)c.jellyOn=true;c.jellyBurstMode=mode.value;c.jellyBurstN=Number(n.value);c.jellyBurstPower=Number(pw.value)/100;c.jellyBurstDecay=dc.checked;persist();paint();};
   [bx,mode,n,pw,dc].forEach(el=>el.addEventListener('input',set));paint();}}
}
// 果冻取景：从底片/相册里选一张，或直接从手机相册上传一张，不绑定酒馆正文，随时可以玩。
async function renderJellyPicker(){
 const host=$('#ql-jelly-picker-grid');if(!host)return;
 host.replaceChildren();
 paintGridColumns(host,4);
 const records=(Array.isArray(library.records)?library.records:[])
  .filter(record=>record?.dataUrl&&record.collection!=='deleted'&&record.collection!=='prompt-gallery')
  .sort((a,b)=>Number(b.at||0)-Number(a.at||0))
  .slice(0,60);
 if(!records.length){host.textContent='本地底片/相册暂无影像记录，可以先从手机相册上传一张玩。';return;}
 for(const record of records){
  const tile=document.createElement('article');tile.className='ql-cache-tile';
  const button=document.createElement('button');button.type='button';button.className='ql-cache-image';button.setAttribute('aria-label',record.albumCharacterName?'相册照片':'底片影像');
  const image=document.createElement('img');image.loading='lazy';image.alt='点一下打开果冻互动';button.append(image);tile.append(button);host.append(tile);
  button.addEventListener('click',async()=>{
   try{openJellyViewer(await resolveLibraryImage(record.dataUrl||record.thumb));}
   catch(error){console.warn('[拾帧] 果冻取图失败',error);}
  });
  try{image.src=await resolveLibraryImage(record.thumb||record.dataUrl);}catch(error){console.warn('[拾帧] 果冻选图缩略图读取失败，已跳过',error);tile.remove();}
 }
}
function wireJellyUpload(){
 $('#ql-jelly-upload-btn')?.addEventListener('click',()=>$('#ql-jelly-upload')?.click());
 $('#ql-jelly-upload')?.addEventListener('change',e=>{
  const file=(e.target.files||[])[0];e.target.value='';
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{openJellyViewer(reader.result);};
  reader.onerror=()=>{console.warn('[拾帧] 读取相册图片失败',reader.error);};
  reader.readAsDataURL(file);
 });
 $('#ql-jelly-picker-refresh')?.addEventListener('click',()=>{renderJellyPicker().catch(()=>{});});
}
bindJellySettings();wireJellyUpload();
wireDataWorkspace();
})();