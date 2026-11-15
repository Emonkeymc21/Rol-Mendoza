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
const children=[];let variant='before',browser,proxy;
const records=[],failures=[],refs=new Map(),metrics=[];
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
async function login(page,actor,destination='/perfil'){
 await page.goto('http://127.0.0.1:4200/ingresar?returnUrl='+encodeURIComponent(destination));
 await page.locator('[formcontrolname=email]').fill(actor.email);await page.locator('[formcontrolname=password]').fill(actor.password);
 await page.locator('button[type=submit]').click();
 if(destination==='/completar-perfil')await expect(page).toHaveURL('http://127.0.0.1:4200/completar-perfil?returnUrl=%2Fcompletar-perfil');
 else await expect(page).toHaveURL('http://127.0.0.1:4200'+destination);
}
async function settle(page){
 await page.locator('h1').first().waitFor();await page.evaluate(()=>document.fonts.ready);
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
async function capture(page,comparator,width,theme,slug,{full=true,axe=false}={}){
 await settle(page);if(full)await reveal(page);
 const layout=await page.evaluate(width=>{const y=scrollY;scrollTo(10000,y);const x=scrollX;scrollTo(0,y);return {body:document.body.scrollWidth,client:document.documentElement.clientWidth,horizontal:x,expected:width};},width);
 const key=`${width}-${theme}-${slug}`,path=`${out}/${variant}-${key}`;
 const png=await page.screenshot({fullPage:full,animations:'disabled'});
 // The exact comparator never masks pixels or ignores antialiasing.
 let comparison;
 if(width>=768&&variant==='before')refs.set(key,png);
 if(width>=768&&variant==='after'){
  comparison=await diff(comparator,refs.get(key),png);
  if(comparison.pixels!==0){failures.push({key,type:'desktop-pixels',comparison});await writeFile(path+'-before.png',refs.get(key));await writeFile(path+'-after.png',png);}
 }
 if(width===390||width===1440&&['home','partidas','perfil'].includes(slug))await writeFile(path+'.png',png);
 else await page.screenshot({path:path+'.jpg',type:'jpeg',quality:72,fullPage:full,animations:'disabled'});
 let violations=[];
 if(axe){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']).analyze();violations=result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));if(violations.length)failures.push({key,type:'axe',violations});}
 if(variant==='after'&&(layout.body>width+1||layout.client!==width||layout.horizontal>11))failures.push({key,type:'overflow',layout});
 const record={variant,width,theme,slug,url:new URL(page.url()).pathname,layout,comparison,violations};records.push(record);await appendFile(out+'/checks.jsonl',JSON.stringify(record)+'\n');
}
try{
 start('tests/isolated-server.cjs');start('dist/mobile-baseline/server/server.mjs',{PORT:'4310'});start('dist/ssr-test/server/server.mjs',{PORT:'4320'});
 await Promise.all(['http://127.0.0.1:4401/health','http://127.0.0.1:4310','http://127.0.0.1:4320'].map(ready));
 proxy=createServer(async(req,res)=>{try{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const target=(req.url.startsWith('/apps-script')||req.url.startsWith('/compartir/'))?'http://127.0.0.1:4401':`http://127.0.0.1:${variant==='before'?4310:4320}`;
  const response=await fetch(target+req.url,{method:req.method,body:chunks.length?Buffer.concat(chunks):undefined,headers:{'user-agent':req.headers['user-agent']||'','content-type':req.headers['content-type']||'','x-forwarded-host':'127.0.0.1:4200'},redirect:'manual'});
  const data=Buffer.from(await response.arrayBuffer());res.statusCode=response.status;
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
   variant=selected;const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,colorScheme:theme,reducedMotion:'reduce',timezoneId:'America/Argentina/Buenos_Aires',locale:'es-AR'});const page=await context.newPage();
   const observer=await observeBrowserErrors(page,{attach:async(name,attachment)=>{await writeFile(`${out}/${selected}-${width}-${theme}-${name}.json`,attachment.body);}},'errors');
   try{
    for(const [route,slug]of publicRoutes){await page.goto('http://127.0.0.1:4200'+route);if(route==='/'||route==='/partidas')await expect(page.locator('app-game-card')).toHaveCount(2);if(route==='/comunidades')await expect(page.locator('main')).toContainText('Espacio de rol de prueba');await capture(page,comparator,width,theme,slug,{axe:selected==='after'&&width===390});}
    await page.goto('http://127.0.0.1:4200/partidas/PRT-DEMO-BASE');await page.getByRole('button',{name:'Compartir partida',exact:true}).click();await expect(page.getByRole('menu',{name:'Opciones para compartir'})).toBeVisible();await capture(page,comparator,width,theme,'compartir',{full:false});await page.keyboard.press('Escape');
    if(width<1280){await page.goto('http://127.0.0.1:4200/');await expect(page.locator('app-game-card')).toHaveCount(2);await page.getByRole('button',{name:'Abrir menú',exact:true}).click();await expect(page.getByRole('navigation',{name:'Navegación móvil'})).toBeVisible();await capture(page,comparator,width,theme,'menu',{full:false});await page.keyboard.press('Escape');}
    await login(page,dm);
    for(const [route,slug]of privateRoutes){await page.goto('http://127.0.0.1:4200'+route);await expect(page.locator('app-header')).toContainText('Máster');if(slug==='mis-partidas')await expect(page.locator('.my-game-entry')).toContainText('Aventura de prueba visual');if(slug==='editar-partida')await expect(page.locator('[formcontrolname=title]')).toHaveValue('Aventura de prueba visual');if(slug==='solicitudes')await expect(page.locator('.inbox-item')).toContainText('luna');if(slug==='notificaciones')await expect(page.locator('.notification-card')).toHaveCount(1);if(slug==='perfil-jugador')await expect(page.locator('h1')).toHaveText('Luna de prueba');await capture(page,comparator,width,theme,slug,{axe:selected==='after'&&width===390});}
    await observer.assertClean();
   }finally{await context.close();}
   const onboarding=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,colorScheme:theme,reducedMotion:'reduce',timezoneId:'America/Argentina/Buenos_Aires',locale:'es-AR'});try{const p=await onboarding.newPage();await login(p,draft,'/completar-perfil');await expect(p.locator('[formcontrolname=firstName]')).toBeVisible();await capture(p,comparator,width,theme,'completar-perfil',{axe:selected==='after'&&width===390});}finally{await onboarding.close();}
   console.log('VISUAL_PROGRESS',JSON.stringify({engine,variant,width,theme,checks:records.length,failures:failures.length}));
  }
 }
 await compareContext.close();await browser.close();browser=null;
 if(engine==='chromium'){
  const {default:lighthouse}=await import('lighthouse');const launcher=await import('chrome-launcher');
  for(const selected of ['before','after']){variant=selected;for(let run=1;run<=3;run++){const chrome=await launcher.launch({chromePath:chromium.executablePath(),chromeFlags:['--headless','--no-sandbox']});try{const result=await lighthouse('http://127.0.0.1:4200/',{port:chrome.port,output:['html','json'],onlyCategories:['performance','accessibility','best-practices','seo'],logLevel:'error'});await writeFile(`${out}/${selected}-lighthouse-${run}.html`,result.report[0]);await writeFile(`${out}/${selected}-lighthouse-${run}.json`,result.report[1]);const a=result.lhr.audits;metrics.push({variant:selected,run,categories:Object.fromEntries(Object.entries(result.lhr.categories).map(([k,v])=>[k,v.score*100])),LCP:a['largest-contentful-paint'].numericValue,CLS:a['cumulative-layout-shift'].numericValue,FCP:a['first-contentful-paint'].numericValue,TBT:a['total-blocking-time'].numericValue,bytes:a['total-byte-weight'].numericValue});}finally{await chrome.kill();}}}
 }
} catch(error){failures.push({type:'execution',message:error.stack});throw error;}
finally{
 await writeFile(out+'/summary.json',JSON.stringify({engine,baseline:'780ebf445a24dd8d557abcf8baeceb14c994b248',candidate:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHead:process.env.CUMBRE20_SOURCE_SHA,checks:records.length,comparisons:records.filter(r=>r.comparison).length,metrics,failures},null,2));
 await browser?.close();proxy?.close();children.forEach(p=>p.kill('SIGTERM'));
}
expect(failures).toEqual([]);
