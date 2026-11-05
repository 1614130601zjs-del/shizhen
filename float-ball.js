// 拾帧悬浮球：一个可拖动的小萌物，点一下打开拾帧；手机摇晃时它会摇头晃脑（底部固定、上面摇）。
// 图标可以换成自己上传的透明底 PNG（原图不压缩，存在酒馆用户文件里）。
import { getRequestHeaders } from '/script.js';

let A=null;
const QFB_DEFAULTS={ballOn:false,ballX:1,ballY:.62,ballShake:true,ballIcon:'jelly.png',ballIconPicked:false,ballFixed:26,ballSize:56};
function qfbCfg(){
 const c=A.cfg();
 for(const k of Object.keys(QFB_DEFAULTS))if(c[k]===undefined)c[k]=QFB_DEFAULTS[k];
 if(!Array.isArray(c.ballCustoms))c.ballCustoms=[];
 return c;
}
const qfbSave=()=>{try{A.save();}catch{}};
const qfbJellyCfg=()=>({amp:A.amp()});
async function qfbJellyEnableMotion(setMsg){
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

// ===== 悬浮球 =====
const QFB_BALL_SVG='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 5c10 0 19 7 19 18 0 11-8 20-19 20S5 34 5 23C5 12 14 5 24 5z" fill="currentColor"/><circle cx="17" cy="22" r="2.6" fill="#fff"/><circle cx="31" cy="22" r="2.6" fill="#fff"/><path d="M18 30q6 5 12 0" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>';
// 内置悬浮球图标：把 png 放进 icons/ 文件夹，再把文件名加进这个列表就会出现在设置里
const QFB_BUILTIN_ICONS=['jelly.png'];
function qfbIconUrl(name){try{return new URL('./icons/'+name,import.meta.url).href;}catch{return 'icons/'+name;}}
function qfbCustomUrl(id){if(typeof id!=='string'||!id.startsWith('custom:'))return '';const it=qfbCfg().ballCustoms.find(x=>'custom:'+x.id===id);return it?it.url:'';}
function qfbBallOneHtml(){
 const c=qfbCfg();
 {const u=qfbCustomUrl(c.ballIcon);if(u)return '<img alt="" draggable="false" src="'+u+'">';}
 if(QFB_BUILTIN_ICONS.includes(c.ballIcon))return '<img alt="" draggable="false" src="'+qfbIconUrl(c.ballIcon)+'">';
 return QFB_BALL_SVG;
}
function qfbIconSrc(){const c=qfbCfg();{const u=qfbCustomUrl(c.ballIcon);if(u)return u;}if(QFB_BUILTIN_ICONS.includes(c.ballIcon))return qfbIconUrl(c.ballIcon);return '';}
// 悬浮球用一张画布画：把图标切成很多细条，越靠上的条被摇得越远，固定线上就是连着的，像一整块果冻被拉扯，而不是上下两块分开
function qfbBallHtml(){return '<canvas class="ql-fb-bl ql-fb-cv"></canvas>';}
const qfbDimCache={};
let qfbCv=null;
function qfbSvgSrc(){return 'data:image/svg+xml;utf8,'+encodeURIComponent(QFB_BALL_SVG.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" '));}
function qfbIsGif(u){return /^data:image\/gif/i.test(u||'')||/\.gif(\?|#|$)/i.test(u||'');}
function qfbSetupCanvas(ball){
 const cv=ball.querySelector('canvas.ql-fb-cv');if(!cv)return;
 const src0=qfbIconSrc();
 // 动图（gif）画布只能画第一帧，所以改用原图直接显示，摇晃时整张以底边为轴歪
 if(src0&&qfbIsGif(src0)){
  const im=document.createElement('img');im.className='ql-fb-bl ql-fb-gif';im.alt='';im.draggable=false;im.src=src0;
  cv.replaceWith(im);qfbCv={gif:im};return;
 }
 const bw=parseFloat(ball.style.getPropertyValue('--ql-fb-ball-w'))||ball.offsetWidth||56,bh=parseFloat(ball.style.getPropertyValue('--ql-fb-ball-h'))||ball.offsetHeight||56,dpr=Math.min(2,window.devicePixelRatio||1);
 const padX=bw*.4,padT=bh*.4,padB=bh*.05;
 cv.width=Math.round((bw+padX*2)*dpr);cv.height=Math.round((bh+padT+padB)*dpr);
 cv.style.cssText='left:'+(-padX)+'px;top:'+(-padT)+'px;width:'+(bw+padX*2)+'px;height:'+(bh+padT+padB)+'px';
 const st={cv,bw,bh,dpr,padX,padT,img:null};qfbCv=st;
 const im=new Image();im.onload=()=>{if(qfbCv===st){st.img=im;qfbDraw(0,0);}};im.src=qfbIconSrc()||qfbSvgSrc();
}
function qfbDraw(r,s){
 const st=qfbCv;
 if(st&&st.gif){st.gif.style.transformOrigin='50% 100%';st.gif.style.transform=(r||s)?'skewX('+(-r).toFixed(2)+'deg) scale('+(1-s*.5).toFixed(3)+','+(1+s).toFixed(3)+')':'';return;}
 if(!st||!st.img||!document.body.contains(st.cv))return;
 const {cv,dpr,padX,padT,img}=st,ctx=cv.getContext('2d');
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
 // 图永远按自己的比例画（contain，贴底居中），不管外框被主题样式改成什么形状
 const iw0=img.naturalWidth||1,ih0=img.naturalHeight||1,kf=Math.min(st.bw/iw0,st.bh/ih0),bw=iw0*kf,bh=ih0*kf;
 ctx.setTransform(dpr,0,0,dpr,(padX+(st.bw-bw)/2)*dpr,(padT+(st.bh-bh))*dpr);
 const fixed=Math.max(0,Math.min(70,Number(qfbCfg().ballFixed)||0)),pinY=bh*(1-fixed/100);
 if(!r&&!s){ctx.drawImage(img,0,0,bw,bh);return;}
 const N=40,ih=img.naturalHeight||1,iw=img.naturalWidth||1,tr=Math.tan(r*Math.PI/180),sxTop=1-s*.5,cx=bw/2;
 // 固定线以下原样画
 const bot=Math.max(0,Math.min(1,pinY/bh));
 if(bot<1)ctx.drawImage(img,0,bot*ih,iw,ih*(1-bot),0,pinY,bw,bh-pinY);
 for(let i=0;i<N;i++){
  const y0=pinY*i/N,y1=pinY*(i+1)/N;               // 盒子里这一条的上下边（未变形）
  const d0=pinY-y0,d1=pinY-y1;                    // 离固定线的距离
  const Y0=pinY-d0*(1+s),Y1=pinY-d1*(1+s);        // 变形后的位置：越靠上拉得越开
  const xo0=tr*d0,xo1=tr*d1;                      // 越靠上，横向偏得越多
  const um=((d0+d1)/2)/pinY,a=1+(sxTop-1)*um;
  const hs=y1-y0,hd=Y1-Y0;if(Math.abs(hd)<1e-3)continue;
  const sy=(y0/bh)*ih,sh=Math.min(ih-sy,(hs/bh)*ih+1);
  ctx.save();
  ctx.transform(a,0,(xo1-xo0)/hs,hd/hs,cx*(1-a)+xo0,Y0);
  ctx.drawImage(img,0,sy,iw,sh,0,0,bw,sh/ih*bh);
  ctx.restore();
 }
}
function qfbMeasure(src){
 return new Promise(res=>{
  if(!src){res([1,1]);return;}
  if(qfbDimCache[src]){res(qfbDimCache[src]);return;}
  const im=new Image();im.onload=()=>{qfbDimCache[src]=[im.naturalWidth||1,im.naturalHeight||1];res(qfbDimCache[src]);};im.onerror=()=>res([1,1]);im.src=src;
 });
}
let qfbRefreshTick=0;
async function qfbRefreshBall(){
 const ball=document.querySelector('.ql-fb-ball');if(!ball)return;
 const my=++qfbRefreshTick;
 const size=Math.max(28,Math.min(400,Number(qfbCfg().ballSize)||56));
 const [w,h]=await qfbMeasure(qfbIconSrc());
 if(my!==qfbRefreshTick||!document.body.contains(ball))return;
 const k=size/Math.max(w,h);
 ball.style.setProperty('--ql-fb-ball-w',Math.round(w*k)+'px');ball.style.setProperty('--ql-fb-ball-h',Math.round(h*k)+'px');
 for(const [p,v] of [['width',Math.round(w*k)+'px'],['height',Math.round(h*k)+'px'],['min-width','0'],['min-height','0'],['max-width','none'],['max-height','none'],['padding','0'],['box-sizing','border-box']])ball.style.setProperty(p,v,'important');
 ball.innerHTML=qfbBallHtml();qfbPlaceBall(ball);qfbSetupCanvas(ball);
}
// 上传：优先把原图原样传到酒馆的用户文件目录（不压缩、不撑大设置文件，动图也保留）；传不上去时才退回存进设置里。
function qfbFileToDataUrl(file){
 return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=()=>rej(new Error('读取失败'));fr.onload=()=>res(String(fr.result));fr.readAsDataURL(file);});
}
async function qfbUploadIcon(file){
 const dataUrl=await qfbFileToDataUrl(file);
 const m=/^data:([^;,]+)[^,]*;base64,(.*)$/s.exec(dataUrl);
 if(!m||!/^image\//.test(m[1]))throw new Error('这不是图片文件');
 const ext=({'image/png':'png','image/gif':'gif','image/webp':'webp','image/jpeg':'jpg','image/svg+xml':'svg','image/apng':'png','image/avif':'avif'})[m[1]]||'png';
 const name='duang_icon_'+Date.now().toString(36)+'.'+ext;
 try{
  const r=await fetch('/api/files/upload',{method:'POST',headers:getRequestHeaders(),body:JSON.stringify({name,data:m[2]})});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const j=await r.json();const path=String(j.path||'').replace(/^\/+/,'');
  if(!path)throw new Error('没有返回路径');
  return {url:'/'+path.split('/').map(encodeURIComponent).join('/'),path,server:true,fallback:false};
 }catch(err){
  console.warn('[duangduang] 上传到酒馆文件目录失败，改存进设置',err);
  if(file.size<=1.5*1024*1024)return {url:dataUrl,server:false,fallback:'orig'};
  return {url:await qfbReadIcon(file,512),server:false,fallback:'small'};
 }
}
async function qfbDeleteIconFile(it){
 if(!it||!it.server||!it.path)return;
 try{await fetch('/api/files/delete',{method:'POST',headers:getRequestHeaders(),body:JSON.stringify({path:it.path})});}catch{}
}
// 退路：缩小后存进设置

function qfbReadIcon(file,max=128){
 return new Promise((res,rej)=>{
  const fr=new FileReader();
  fr.onerror=()=>rej(new Error('读取失败'));
  fr.onload=()=>{
   const im=new Image();
   im.onerror=()=>rej(new Error('这不是能显示的图片'));
   im.onload=()=>{
    const k=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight,1)),w=Math.max(1,Math.round(im.naturalWidth*k)),h=Math.max(1,Math.round(im.naturalHeight*k));
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(im,0,0,w,h);
    res(cv.toDataURL('image/png'));
   };
   im.src=String(fr.result);
  };
  fr.readAsDataURL(file);
 });
}
function qfbPlaceBall(ball){
 const c=qfbCfg(),w=ball.offsetWidth||46,h=ball.offsetHeight||46;
 const x=Math.max(0,Math.min(window.innerWidth-w,c.ballX*(window.innerWidth-w))),y=Math.max(0,Math.min(window.innerHeight-h,c.ballY*(window.innerHeight-h)));
 ball.style.left=x+'px';ball.style.top=y+'px';
}
// ===== 手机摇晃时，悬浮球（不管用哪张图标）也整体 duang 地晃一晃 =====
let qfbBallMotion=false;
function qfbStartBallShake(){
 if(qfbBallMotion)return;qfbBallMotion=true;
 // 底部固定在原位：只以图标底边中点为轴左右摇摆、上下压扁拉长，像不倒翁 / 果冻
 const st={r:0,vr:0,s:0,vs:0};let raf=0,gx=0,gy=0,primed=false;
 const tick=()=>{
  st.vr+=-st.r*.1;st.vr*=.9;st.r+=st.vr;
  st.vs+=-st.s*.14;st.vs*=.86;st.s+=st.vs;
  const live=Math.abs(st.r)+Math.abs(st.vr)+Math.abs(st.s*30)+Math.abs(st.vs*30)>.08;
  if(live)qfbDraw(st.r,st.s);else{qfbDraw(0,0);st.r=st.vr=st.s=st.vs=0;}
  raf=live?requestAnimationFrame(tick):0;
 };
 window.addEventListener('devicemotion',e=>{
  if(!qfbCfg().ballShake||!document.querySelector('.ql-fb-ball'))return;
  let ax=0,ay=0;const a=e.acceleration;
  if(a&&(a.x!=null||a.y!=null)){ax=a.x||0;ay=a.y||0;}
  else{const g=e.accelerationIncludingGravity||{};const vx=g.x||0,vy=g.y||0;if(!primed){gx=vx;gy=vy;primed=true;}gx=gx*.9+vx*.1;gy=gy*.9+vy*.1;ax=vx-gx;ay=vy-gy;}
  if(Math.abs(ax)+Math.abs(ay)<1.2)return;
  const k=qfbJellyCfg().amp/.5,cl=(v,m)=>Math.max(-m,Math.min(m,v));
  st.vr+=cl(-ax*.16*k,1.8*k);st.vs+=cl(ay*.005*k,.02*k);
  st.r=cl(st.r,7);st.s=cl(st.s,.08);
  if(!raf)raf=requestAnimationFrame(tick);
 });
}
function qfbMountBall(){
 let ball=document.querySelector('.ql-fb-ball');
 if(!qfbCfg().ballOn){ball?.remove();return;}
 if(ball)return;
 ball=document.createElement('button');ball.type='button';ball.className='ql-fb-ball';ball.setAttribute('aria-label','打开拾帧');ball.title='打开拾帧（拖动可挪位置）';ball.innerHTML=qfbBallHtml();
 document.body.append(ball);qfbPlaceBall(ball);qfbRefreshBall();qfbStartBallShake();
 let drag=null;
 ball.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  const r=ball.getBoundingClientRect();drag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top,sx:e.clientX,sy:e.clientY,moved:false};
  try{ball.setPointerCapture(e.pointerId);}catch{}
 });
 ball.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<6)return;
  drag.moved=true;ball.classList.add('is-dragging');
  const w=ball.offsetWidth,h=ball.offsetHeight;
  ball.style.left=Math.max(0,Math.min(window.innerWidth-w,e.clientX-drag.dx))+'px';ball.style.top=Math.max(0,Math.min(window.innerHeight-h,e.clientY-drag.dy))+'px';
 });
 const end=e=>{
  if(!drag||e.pointerId!==drag.id)return;
  const d=drag;drag=null;ball.classList.remove('is-dragging');try{ball.releasePointerCapture(d.id);}catch{}
  if(d.moved){
   // 松手后吸附到左右边缘，位置按比例记住
   const w=ball.offsetWidth,h=ball.offsetHeight,r=ball.getBoundingClientRect();
   const toRight=r.left+w/2>window.innerWidth/2;
   const c=qfbCfg();c.ballX=toRight?1:0;c.ballY=Math.max(0,Math.min(1,r.top/Math.max(1,window.innerHeight-h)));qfbSave();qfbPlaceBall(ball);
  }else{
   try{A.onClick();}catch(err){console.warn('[拾帧] 悬浮球点击失败',err);}
  }
 };
 ball.addEventListener('pointerup',end);ball.addEventListener('pointercancel',end);
 window.addEventListener('resize',()=>qfbPlaceBall(ball));
}

// ===== 设置页里的悬浮球栏 =====
function qfbRenderSettings(container){
 if(!container)return;
 const c=qfbCfg();
 const box=container;
 box.innerHTML=''
  +'<label class="ql-check"><input id="ql-fb-ball-on" type="checkbox"><span>显示悬浮球（点它打开拾帧，可拖动）</span></label>'
  +'<label class="ql-check"><input id="ql-fb-ball-shake" type="checkbox"><span>手机摇晃时悬浮球也跟着晃（强度跟下面的「弹性」走）</span></label>'
  +'<div class="ql-fb-set-row"><label>悬浮球图标</label></div><div id="ql-fb-icons" class="ql-fb-icons"></div>'
  +'<p class="ql-muted">换图标建议用<b>透明底的 PNG</b>，不然悬浮球会带着一块底色。上传的是<b>原图，不压缩</b>（保存在酒馆的用户文件里），GIF / 动图 WebP 也能动。</p>'
  +'<div class="ql-row"><button id="ql-fb-icon-upload" type="button" class="menu_button">上传图片</button><button id="ql-fb-icon-reset" type="button" class="menu_button">恢复默认图标</button><input id="ql-fb-icon-file" type="file" accept="image/*" hidden></div>'
  +'<div class="ql-fb-set-row"><label for="ql-fb-size">大小</label><input id="ql-fb-size" type="range" min="28" max="400" step="2"><span id="ql-fb-size-v"></span></div>'
  +'<div class="ql-fb-set-row"><label for="ql-fb-fixed">底部固定</label><input id="ql-fb-fixed" type="range" min="0" max="70" step="2"><span id="ql-fb-fixed-v"></span></div>'
  +'<p class="ql-muted">摇晃手机时，图标下面这一段不动，只有上面摇，更像果冻。0 = 只固定最底边。</p>'
  +'<div class="ql-row"><button id="ql-fb-ball-reset" type="button" class="menu_button">重置悬浮球位置</button></div><p id="ql-fb-icon-msg" class="ql-muted" role="status"></p>';
 const on=box.querySelector('#ql-fb-ball-on');
 on.checked=!!c.ballOn;on.onchange=()=>{qfbCfg().ballOn=on.checked;qfbSave();qfbMountBall();};

 {const bs=box.querySelector('#ql-fb-ball-shake'),m0=box.querySelector('#ql-fb-icon-msg');bs.checked=c.ballShake!==false;bs.onchange=async()=>{qfbCfg().ballShake=bs.checked;qfbSave();if(bs.checked)await qfbJellyEnableMotion(t=>{m0.textContent=t;});else m0.textContent='';};}
 const icons=box.querySelector('#ql-fb-icons'),msg=box.querySelector('#ql-fb-icon-msg');
 const paintIcons=()=>{
  const cur=qfbCfg();
  const items=[{id:'default',html:QFB_BALL_SVG,title:'默认'}];
  for(const n of QFB_BUILTIN_ICONS)items.push({id:n,html:'<img alt="" draggable="false" src="'+qfbIconUrl(n)+'">',title:n});
  for(const it of cur.ballCustoms)items.push({id:'custom:'+it.id,custom:it.id,html:'<img alt="" draggable="false" src="'+it.url+'">',title:'我上传的'});
  icons.innerHTML=items.map(it=>{
   const btn='<button type="button" class="ql-fb-icon-opt'+(cur.ballIcon===it.id?' is-on':'')+'" data-id="'+it.id+'" title="'+it.title+'" aria-label="'+it.title+'">'+it.html+'</button>';
   return it.custom?'<span class="ql-fb-icon-wrap">'+btn+'<button type="button" class="ql-fb-icon-del" data-del="'+it.custom+'" title="删除这张" aria-label="删除这张">×</button></span>':btn;
  }).join('');
 };
 paintIcons();
 icons.onclick=e=>{
  const del=e.target.closest('.ql-fb-icon-del');
  if(del){
   // 两次点击才删：第一次变红提示，第二次真的删掉
   if(del.dataset.armed!=='1'){del.dataset.armed='1';del.classList.add('is-armed');del.textContent='删?';setTimeout(()=>{if(del.isConnected){del.dataset.armed='';del.classList.remove('is-armed');del.textContent='×';}},2600);return;}
   const k=qfbCfg();qfbDeleteIconFile(k.ballCustoms.find(x=>x.id===del.dataset.del));k.ballCustoms=k.ballCustoms.filter(x=>x.id!==del.dataset.del);
   if(k.ballIcon==='custom:'+del.dataset.del){k.ballIcon=QFB_BUILTIN_ICONS[0]||'default';k.ballIconPicked=true;}
   qfbSave();paintIcons();qfbRefreshBall();msg.textContent='已删除';return;
  }
  const b=e.target.closest('.ql-fb-icon-opt');if(!b)return;{const k=qfbCfg();k.ballIcon=b.dataset.id;k.ballIconPicked=true;}qfbSave();paintIcons();qfbRefreshBall();msg.textContent='已选择这个图标（关掉面板就能在悬浮球上看到）';};
 const file=box.querySelector('#ql-fb-icon-file');
 box.querySelector('#ql-fb-icon-upload').onclick=()=>file.click();
 file.onchange=async()=>{
  const f=file.files&&file.files[0];file.value='';if(!f)return;
  try{
   const k=qfbCfg();
   if(k.ballCustoms.length>=8){msg.textContent='最多存 8 张，请先删掉不用的（图标右上角的 ×）';return;}
   if(f.size>10*1024*1024){msg.textContent='图片太大了（超过 10MB），请换一张小一点的';return;}
   msg.textContent='上传中…';
   const up=await qfbUploadIcon(f);const id='u'+Date.now().toString(36);
   k.ballCustoms.push({id,url:up.url,path:up.path||'',server:!!up.server});k.ballIcon='custom:'+id;k.ballIconPicked=true;qfbSave();paintIcons();qfbRefreshBall();msg.textContent=up.server?'已换成你上传的图片（原图，未压缩）':(up.fallback==='orig'?'酒馆文件目录用不了，已把原图存进设置里':'酒馆文件目录用不了，图片较大，已缩小到 512px 存进设置里');
  }
  catch(err){msg.textContent='上传失败：'+((err&&err.message)||err);}
 };
 box.querySelector('#ql-fb-icon-reset').onclick=()=>{const k=qfbCfg();k.ballIcon='default';k.ballIconPicked=true;qfbSave();paintIcons();qfbRefreshBall();msg.textContent='';};
 const sz=box.querySelector('#ql-fb-size'),szv=box.querySelector('#ql-fb-size-v');
 sz.value=String(Math.max(28,Math.min(400,Number(c.ballSize)||56)));szv.textContent=sz.value+'px';
 {const fx=box.querySelector('#ql-fb-fixed'),fv=box.querySelector('#ql-fb-fixed-v');fx.value=String(Math.max(0,Math.min(70,Number(c.ballFixed)||0)));fv.textContent=fx.value+'%';fx.oninput=()=>{fv.textContent=fx.value+'%';qfbCfg().ballFixed=Number(fx.value);qfbSave();qfbRefreshBall();};}
 sz.oninput=()=>{szv.textContent=sz.value+'px';qfbCfg().ballSize=Number(sz.value);qfbSave();qfbRefreshBall();};
 box.querySelector('#ql-fb-ball-reset').onclick=()=>{const k=qfbCfg();k.ballX=1;k.ballY=.62;qfbSave();const b=document.querySelector('.ql-fb-ball');if(b)qfbPlaceBall(b);};
 return true;
}


export function initFloatBall(api){A=api;qfbMountBall();}
export function renderFloatBallSettings(container){if(A)qfbRenderSettings(container);}
