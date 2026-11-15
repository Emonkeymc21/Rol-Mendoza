// Behaviour/visual QA only: two real builds, one origin, unchanged demo data.
import {spawn,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdir,writeFile,readFile,appendFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {chromium,webkit,expect as playwrightExpect} from '@playwright/test';
const expect=playwrightExpect.configure({timeout:20000});
import AxeBuilder from '@axe-core/playwright';
import {publicProfile,privateProfile} from '../tests/helpers/fixtures.mjs';
import {observeBrowserErrors} from '../tests/e2e/browser-errors.ts';
const require=createRequire(import.meta.url);
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback demo emulators are mandatory');
const engine=process.env.CUMBRE20_BROWSER||'chromium';
if(!['chromium','webkit'].includes(engine))throw Error('Unknown engine');
const out='mobile-results/'+engine;await mkdir(out,{recursive:true});
const original=require('../vercel.json').headers.find(x=>x.source==='/(.*)').headers.find(x=>x.key==='Content-Security-Policy').value;
const csp=original.replace("connect-src 'self'","connect-src 'self' http://127.0.0.1:9099 http://127.0.0.1:8080").replace("frame-src 'self'","frame-src 'self' http://127.0.0.1:9099").replace('; upgrade-insecure-requests','');
const children=[];let variant='before',laboratory=false,browser,proxy;
const records=[],failures=[],refs=new Map(),geometries=new Map(),metrics=[],targets=new WeakMap();
const start=(file,extra={})=>{const p=spawn(process.execPath,[file],{env:{...process.env,CUMBRE20_TEST_MODE:'1',CUMBRE20_TEST_CSP:csp,...extra},stdio:'inherit'});children.push(p);return p;};
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error('Not ready: '+url);}
async function json(url,options={}){const r=await fetch(url,options),data=await r.json();if(!r.ok||data.error)throw Error(JSON.stringify({url,status:r.status,data}));return data;}
const post=(url,data,headers={})=>json(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
const fixedDate='2026-11-09T12:00:00.000Z';
function fields(value){return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(s=>({stringValue:s}))}}:{mapValue:{fields:fields(v)}}]));}
async function profile(name,role,complete=true){
 const email=name+'@example.test',password='Emulator-only-123!';
 const account=await post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only-key',{email,password,returnSecureToken:true});
 const uid=account.localId;
 for(const [collection,data]of[['users',publicProfile(uid,role,complete)],['userPrivate',privateProfile(uid)]]){
  for(const key of ['createdAt','updatedAt','privacyConsentAt'])delete data[key];
  if(collection==='users'){data.firstName=name==='master'?'Máster':'Luna';data.lastName='de prueba';data.displayName=data.firstName+' '+data.lastName;}
  const f=fields(data);for(const key of collection==='users'?['createdAt','updatedAt']:['createdAt','updatedAt','privacyConsentAt'])f[key]={timestampValue:fixedDate};
  await json(`http://127.0.0.1:8080/v1/projects/demo-cumbre20/databases/(default)/documents/${collection}/${uid}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:f})});
 }
 return {...account,email,password,uid};
}
async function api(actor,action,payload){const r=await post('http://127.0.0.1:4401/apps-script',{apiVersion:'8.0.0',idToken:actor.idToken,action,payload});if(!r.ok)throw Error(JSON.stringify(r));return r.data;}
// Desktop dimensions target the CSS media-query viewport. WebKit macOS
// subtracts its native scrollbar from that width. Calibrate the outer viewport
// to the same requested CSS width, retaining the native gutter in screenshots.
// No styles, screenshots or comparisons are masked/changed.
async function navigate(page,url){
 const target=targets.get(page);let response;
 for(let attempt=0;attempt<4;attempt++){
  response=await page.goto(url);
  if(!target||target.width<768)return response;
  await settle(page);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const state=await page.evaluate(expected=>{
   const client=document.documentElement.clientWidth,bodyHeight=document.body.scrollHeight,rootOverflow=getComputedStyle(document.documentElement).overflow;
   let lo=0,hi=4096;while(lo+1<hi){const mid=Math.floor((lo+hi)/2);if(matchMedia(`(min-width: ${mid}px)`).matches)lo=mid;else hi=mid;}
   return {css:lo,inner:innerWidth,client,bodyHeight,rootOverflow,expected,matches:matchMedia(`(width: ${expected}px)`).matches};
  },target.width);
  await appendFile(out+'/viewports.jsonl',JSON.stringify({variant,url:new URL(url).pathname,attempt,...target,...state,screenshotWidth:page.viewportSize().width})+'\n');
  if(state.matches)return response;
  const current=page.viewportSize();
  if(engine!=='webkit'||Math.abs(current.width-target.width)>11||Math.abs(state.css-target.width)>11)throw Error('Unexpected CSS viewport: '+JSON.stringify(state));
  // Start a fresh document at the final size. Never resize live app images:
  // WebKit may retain a differently resampled bitmap after mobile -> desktop.
  await page.goto('about:blank');
  await page.setViewportSize({width:current.width+target.width-state.css,height:target.height});
 }
 throw Error('CSS viewport calibration did not settle: '+url);
}
async function login(page,actor,destination='/perfil'){
 await navigate(page,'http://127.0.0.1:4200/ingresar?returnUrl='+encodeURIComponent(destination));
 await page.locator('[formcontrolname=email]').fill(actor.email);await page.locator('[formcontrolname=password]').fill(actor.password);
 await page.locator('button[type=submit]').click();
 if(destination==='/completar-perfil')await expect(page).toHaveURL('http://127.0.0.1:4200/completar-perfil?returnUrl=%2Fcompletar-perfil');
 else await expect(page).toHaveURL('http://127.0.0.1:4200'+destination);
}
async function settle(page){
 await page.locator('h1').first().waitFor();
 await expect.poll(()=>page.locator('link[rel="stylesheet"]').evaluateAll(list=>list.every(el=>el.sheet&&(!el.media||el.media==='all')))).toBe(true);
 await page.evaluate(async()=>{await Promise.all([document.fonts.load('400 14px Inter'),document.fonts.load('700 14px Inter'),document.fonts.load('750 32px Cinzel')]);await document.fonts.ready;});
 await page.locator('.auth-loading,.loading-panel').first().waitFor({state:'hidden'});
 await page.locator('.firebase-emulator-warning').evaluateAll(list=>list.forEach(el=>el.style.display='none'));
 await page.waitForTimeout(180);
}
async function reveal(page){await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=Math.max(300,innerHeight*.8)){scrollTo(0,y);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}scrollTo(0,0);});await page.waitForTimeout(100);}
async function diff(page,before,after){return page.evaluate(async([a,b])=>{
 const image=async src=>{const i=new Image();i.src=src;await i.decode();return i;};const [x,y]=await Promise.all([image(a),image(b)]);
 if(x.width!==y.width||x.height!==y.height)return {pixels:null,before:[x.width,x.height],after:[y.width,y.height]};
 const c=document.createElement('canvas');c.width=x.width;c.height=x.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(x,0,0);const ax=ctx.getImageData(0,0,c.width,c.height).data;ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(y,0,0);const ay=ctx.getImageData(0,0,c.width,c.height).data;let pixels=0;for(let i=0;i<ax.length;i+=4)if(ax[i]!==ay[i]||ax[i+1]!==ay[i+1]||ax[i+2]!==ay[i+2]||ax[i+3]!==ay[i+3])pixels++;return {pixels,width:c.width,height:c.height};
 },['data:image/png;base64,'+before.toString('base64'),'data:image/png;base64,'+after.toString('base64')]);}
async function capture(page,comparator,width,theme,slug,{full=true,axe=false,prepared=false,segment=0}={}){
 if(!prepared)await settle(page);
 const baseSlug=slug.split('--view-')[0];
 if(full){
  await reveal(page);
  // WebKit fullPage temporarily changes the layout viewport to clientWidth,
  // crossing 768px when its 11px native scrollbar is present. Capture genuine
  // fixed-viewport screens while scrolling instead. No stitching or CSS masks.
  const geometry=await page.evaluate(()=>({height:document.documentElement.scrollHeight,viewport:innerHeight}));
  const max=Math.max(0,geometry.height-geometry.viewport),offsets=[];
  for(let y=0;y<max;y+=geometry.viewport)offsets.push(y);offsets.push(max);
  const geometryKey=`${width}-${theme}-${slug}`;
  if(variant==='before')geometries.set(geometryKey,geometry);
  else if(width>=768&&JSON.stringify(geometry)!==JSON.stringify(geometries.get(geometryKey))){
   failures.push({key:geometryKey,type:'desktop-geometry',before:geometries.get(geometryKey),after:geometry});
  }
  for(let i=0;i<offsets.length;i++){
   await page.evaluate(y=>scrollTo(0,y),offsets[i]);await page.waitForTimeout(120);
   await capture(page,comparator,width,theme,slug+'--view-'+i,{full:false,axe:axe&&i===0,prepared:true,segment:i});
  }
  await page.evaluate(()=>scrollTo(0,0));return;
 }
 const layout=await page.evaluate(width=>{const y=scrollY;scrollTo(10000,y);const x=scrollX;scrollTo(0,y);return {body:document.body.scrollWidth,client:document.documentElement.clientWidth,inner:innerWidth,horizontal:x,expected:width,y:scrollY,mediaWidth:matchMedia(`(width: ${width}px)`).matches,mobileMedia:matchMedia('(max-width: 767px)').matches};},width);
 const key=`${width}-${theme}-${slug}`,path=`${out}/${variant}-${key}`;
 let png=await page.screenshot({fullPage:false,animations:'disabled'}),stable=false;
 for(let frame=0;frame<4;frame++){
  await page.waitForTimeout(80);const next=await page.screenshot({fullPage:false,animations:'disabled'});
  if(png.equals(next)||(await diff(comparator,png,next)).pixels===0){stable=true;png=next;break;}png=next;
 }
 if(!stable)throw Error('Unstable screenshot: '+key);
 const nativeSelect=baseSlug==='home'?await page.locator('app-home select').evaluate(el=>{const c=getComputedStyle(el),r=el.getBoundingClientRect();return {value:el.value,font:c.font,lineHeight:c.lineHeight,padding:c.padding,appearance:c.appearance,x:r.x,y:r.y,width:r.width,height:r.height,fonts:document.fonts.status};}):undefined;
 const logo=baseSlug==='home'?await page.locator('.brand-mark').evaluate(el=>{const r=el.getBoundingClientRect(),c=getComputedStyle(el);return {src:el.getAttribute('src'),naturalWidth:el.naturalWidth,x:r.x,y:r.y,width:r.width,height:r.height,objectFit:c.objectFit,filter:c.filter,imageRendering:c.imageRendering,transform:c.transform,opacity:c.opacity,mixBlendMode:c.mixBlendMode};}):undefined;
 let comparison;
 if(width>=768&&variant==='before')refs.set(key,png);
 if(width>=768&&variant==='after'){
  if(!refs.has(key))throw Error('Missing baseline viewport: '+key);
  comparison=await diff(comparator,refs.get(key),png);
  if(comparison.pixels!==0){
   failures.push({key,type:'desktop-pixels',comparison});await writeFile(path+'-before.png',refs.get(key));await writeFile(path+'-after.png',png);
   await writeFile(path+'-state.json',JSON.stringify({layout,nativeSelect,logo},null,2));
   if(baseSlug==='home'){
    // A failing comparison keeps an independent fresh-baseline control. This
    // diagnoses renderer/cache variation; it NEVER replaces the original gate.
    const selected=variant;let controlContext;
    try{variant='before';controlContext=await page.context().browser().newContext({viewport:page.viewportSize(),deviceScaleFactor:1,colorScheme:theme,reducedMotion:'reduce',timezoneId:'America/Argentina/Buenos_Aires',locale:'es-AR'});const control=await controlContext.newPage();targets.set(control,{width,height:page.viewportSize().height});await navigate(control,page.url());await settle(control);await reveal(control);await control.evaluate(y=>scrollTo(0,y),layout.y);const controlPng=await control.screenshot({fullPage:false,animations:'disabled'});await writeFile(path+'-baseline-control.png',controlPng);await writeFile(path+'-control.json',JSON.stringify({baselineRepeat:await diff(comparator,refs.get(key),controlPng),candidateVsFreshBaseline:await diff(comparator,controlPng,png)},null,2));}finally{variant=selected;await controlContext?.close();}
    throw Error('Desktop Home pixel difference: '+JSON.stringify({key,comparison,layout,nativeSelect,logo}));
   }
  }
 }
 if(segment===0&&(width===390||width===1440&&['home','partidas','perfil'].includes(baseSlug)))await writeFile(path+'.png',png);
 else await page.screenshot({path:path+'.jpg',type:'jpeg',quality:72,fullPage:false,animations:'disabled'});
 let violations=[];
 if(axe){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']).analyze();violations=result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));if(violations.length)failures.push({key,type:'axe',violations});}
 if(variant==='after'&&(layout.body>layout.client+1||!layout.mediaWidth||layout.horizontal>11))failures.push({key,type:'overflow',layout});
 const record={variant,width,theme,slug,nativeSelect,logo,url:new URL(page.url()).pathname,layout,comparison,violations};records.push(record);await appendFile(out+'/checks.jsonl',JSON.stringify(record)+'\n');
}
try{
 start('tests/isolated-server.cjs');start('dist/mobile-baseline/server/server.mjs',{PORT:'4310'});start('dist/ssr-test/server/server.mjs',{PORT:'4320'});
 await Promise.all(['http://127.0.0.1:4401/health','http://127.0.0.1:4310','http://127.0.0.1:4320'].map(ready));
 proxy=createServer(async(req,res)=>{try{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const target=(req.url.startsWith('/apps-script')||req.url.startsWith('/compartir/'))?'http://127.0.0.1:4401':`http://127.0.0.1:${variant==='before'?4310:4320}`;
  const response=await fetch(target+req.url,{method:req.method,body:chunks.length?Buffer.concat(chunks):undefined,headers:{'user-agent':req.headers['user-agent']||'','content-type':req.headers['content-type']||'','x-forwarded-host':'127.0.0.1:4200'},redirect:'manual'});
  let data=Buffer.from(await response.arrayBuffer());res.statusCode=response.status;
  // Diagnostic overlay exists only in Auth Emulator, never in production.
  // Omit it identically from both lab variants, retaining console/error gates.
  if(laboratory&&response.headers.get('content-type')?.includes('text/html'))data=Buffer.from(data.toString().replace('</head>','<style>.firebase-emulator-warning{display:none!important}</style></head>'));
  for(const [key,value]of response.headers)if(!['content-encoding','content-length','transfer-encoding'].includes(key))res.setHeader(key,value);
  res.setHeader('Content-Security-Policy',csp);
  if(req.headers['accept-encoding']?.includes('gzip')){res.setHeader('Content-Encoding','gzip');res.end(gzipSync(data));}else res.end(data);
 }catch(e){res.statusCode=500;res.end(String(e));}});await new Promise(r=>proxy.listen(4200,'127.0.0.1',r));
 await post('http://127.0.0.1:4401/reset',{});
 const dm=await profile('master','DM'),player=await profile('luna','PLAYER'),draft=await profile('draft','PLAYER',false);
 const game=await api(dm,'createGame',{title:'Aventura de prueba visual',system:'Fate',location:'A coordinar',mode:'Presencial',city:'Guaymallén',schedule:'Sábado 18:00',frequency:'One-shot',totalSeats:4,currentPlayers:0,level:'Principiantes bienvenidos',tone:'Aventura',summary:'Una aventura ficticia y aislada para verificar la presentación sin tocar datos de producción.',safety:'Acuerdos previos de mesa'});
 await api(player,'joinGame',{gameId:game.id,message:'Quiero sumarme a esta prueba aislada.'});
 // Freeze display timestamps of real test-created business records, never prod.
 for(const collection of ['gameJoinRequests',`users/${dm.uid}/notifications`]){
  const data=await json(`http://127.0.0.1:8080/v1/projects/demo-cumbre20/databases/(default)/documents/${collection}`,{headers:{Authorization:'Bearer owner'}});
  for(const doc of data.documents||[]){for(const k of ['createdAt','updatedAt'])if(doc.fields[k])doc.fields[k]={timestampValue:fixedDate};await json('http://127.0.0.1:8080/v1/'+doc.name,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:doc.fields})});}
 }
 browser=await({chromium,webkit}[engine]).launch();const compareContext=await browser.newContext();const comparator=await compareContext.newPage();
 const publicRoutes=[['/','home'],['/partidas','partidas'],['/partidas/PRT-DEMO-BASE','detalle'],['/comunidades','comunidades'],['/ingresar','login'],['/registrarme','registro'],['/como-funciona','como-funciona'],['/nosotros','nosotros'],['/terminos','terminos'],['/privacidad','privacidad']];
 const privateRoutes=[['/perfil','perfil'],['/perfil/editar','editar-perfil'],['/jugadores','jugadores'],['/jugadores/'+player.uid,'perfil-jugador'],['/partidas/nueva','publicar'],['/mis-partidas','mis-partidas'],['/mis-partidas/'+game.id+'/editar','editar-partida'],['/solicitudes','solicitudes'],['/mis-solicitudes','mis-solicitudes'],['/notificaciones','notificaciones'],['/comunidades/solicitar','solicitar-comunidad']];
 for(const [width,height]of [[768,1024],[1024,900],[1440,900],[1920,1080],[390,844]]){
  for(const theme of ['dark','light'])for(const selected of ['before','after']){
   variant=selected;const context=await browser.newContext({viewport:{width:engine==='webkit'&&width>=768?width+11:width,height},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,colorScheme:theme,reducedMotion:'reduce',timezoneId:'America/Argentina/Buenos_Aires',locale:'es-AR'});const page=await context.newPage();targets.set(page,{width,height});
   const observer=await observeBrowserErrors(page,{attach:async(name,attachment)=>{await writeFile(`${out}/${selected}-${width}-${theme}-${name}.json`,attachment.body);}},'errors');
   try{
    for(const [route,slug]of publicRoutes){await navigate(page,'http://127.0.0.1:4200'+route);if(route==='/'||route==='/partidas')await expect(page.locator('app-game-card')).toHaveCount(2);if(route==='/comunidades')await expect(page.locator('main')).toContainText('Espacio de rol de prueba');await capture(page,comparator,width,theme,slug,{axe:selected==='after'&&width===390});}
    await navigate(page,'http://127.0.0.1:4200/partidas/PRT-DEMO-BASE');await page.getByRole('button',{name:'Compartir partida',exact:true}).click();await expect(page.getByRole('menu',{name:'Opciones para compartir'})).toBeVisible();await capture(page,comparator,width,theme,'compartir',{full:false});await page.keyboard.press('Escape');
    if(width<1280){await navigate(page,'http://127.0.0.1:4200/');await expect(page.locator('app-game-card')).toHaveCount(2);await page.getByRole('button',{name:'Abrir menú',exact:true}).click();await expect(page.getByRole('navigation',{name:'Navegación móvil'})).toBeVisible();await capture(page,comparator,width,theme,'menu',{full:false});await page.keyboard.press('Escape');}
    await login(page,dm);
    for(const [route,slug]of privateRoutes){await navigate(page,'http://127.0.0.1:4200'+route);await expect(page.locator('app-header')).toContainText('Máster');if(slug==='mis-partidas')await expect(page.locator('.my-game-entry')).toContainText('Aventura de prueba visual');if(slug==='editar-partida')await expect(page.locator('[formcontrolname=title]')).toHaveValue('Aventura de prueba visual');if(slug==='solicitudes')await expect(page.locator('.inbox-item')).toContainText('luna');if(slug==='notificaciones')await expect(page.locator('.notification-card')).toHaveCount(1);if(slug==='perfil-jugador')await expect(page.locator('h1')).toHaveText('Luna de prueba');await capture(page,comparator,width,theme,slug,{axe:selected==='after'&&width===390});}
    await observer.assertClean();
   }finally{await context.close();}
   const onboarding=await browser.newContext({viewport:{width:engine==='webkit'&&width>=768?width+11:width,height},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,colorScheme:theme,reducedMotion:'reduce',timezoneId:'America/Argentina/Buenos_Aires',locale:'es-AR'});try{const p=await onboarding.newPage();targets.set(p,{width,height});await login(p,draft,'/completar-perfil');await expect(p.locator('[formcontrolname=firstName]')).toBeVisible();await capture(p,comparator,width,theme,'completar-perfil',{axe:selected==='after'&&width===390});}finally{await onboarding.close();}
   console.log('VISUAL_PROGRESS',JSON.stringify({engine,variant,width,theme,checks:records.length,failures:failures.length}));
  }
 }
 await compareContext.close();await browser.close();browser=null;
 if(engine==='chromium'){
  laboratory=true;
  const {default:lighthouse}=await import('lighthouse');const launcher=await import('chrome-launcher');
  for(const selected of ['before','after']){variant=selected;for(let run=1;run<=3;run++){const chrome=await launcher.launch({chromePath:chromium.executablePath(),chromeFlags:['--headless','--no-sandbox']});try{const result=await lighthouse('http://127.0.0.1:4200/',{port:chrome.port,output:['html','json'],onlyCategories:['performance','accessibility','best-practices','seo'],logLevel:'error'});await writeFile(`${out}/${selected}-lighthouse-${run}.html`,result.report[0]);await writeFile(`${out}/${selected}-lighthouse-${run}.json`,result.report[1]);const a=result.lhr.audits;metrics.push({variant:selected,run,categories:Object.fromEntries(Object.entries(result.lhr.categories).map(([k,v])=>[k,v.score*100])),LCP:a['largest-contentful-paint'].numericValue,CLS:a['cumulative-layout-shift'].numericValue,FCP:a['first-contentful-paint'].numericValue,TBT:a['total-blocking-time'].numericValue,bytes:a['total-byte-weight'].numericValue});}finally{await chrome.kill();}}}
 }
} catch(error){failures.push({type:'execution',message:error.stack});throw error;}
finally{
 await writeFile(out+'/summary.json',JSON.stringify({engine,baseline:'780ebf445a24dd8d557abcf8baeceb14c994b248',candidate:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHead:process.env.CUMBRE20_SOURCE_SHA,checks:records.length,comparisons:records.filter(r=>r.comparison).length,metrics,failures},null,2));
 await browser?.close();proxy?.close();children.forEach(p=>p.kill('SIGTERM'));
}
expect(failures).toEqual([]);
