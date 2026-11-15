// Read-only production check. No registration, login, form submission or writes.
import {chromium,webkit,expect as pwExpect} from '@playwright/test';
import {mkdir,writeFile,readdir} from 'node:fs/promises';
import {observeBrowserErrors} from '../tests/e2e/browser-errors.ts';
const expect=pwExpect.configure({timeout:30000});
const engine=process.env.CUMBRE20_BROWSER||'chromium';
if(!['chromium','webkit'].includes(engine))throw Error('Unknown browser engine');
const origin='https://rol-mendoza-2026.vercel.app',out='mobile-results/'+engine+'/production';
await mkdir(out,{recursive:true});const checks=[];
let expectedBootstrap,expectedStyles=[];
if(process.env.CUMBRE20_REQUIRE_PUBLISHED==='1'){
 const assets=await readdir('dist/rol-mendoza/browser');
 expectedBootstrap=assets.find(name=>/^main-[\w-]+\.js$/.test(name));
 expectedStyles=assets.filter(name=>/^styles-[\w-]+\.css$/.test(name));
 if(!expectedBootstrap||!expectedStyles.length)throw Error('Production assets were not built');
 let matched=false;
 for(let i=0;i<24;i++){
  const response=await fetch(origin+'/',{cache:'no-store',signal:AbortSignal.timeout(15000)});const html=await response.text();
  if(response.ok&&html.includes('src="'+expectedBootstrap+'"')&&expectedStyles.every(name=>html.includes('href="'+name+'"'))){matched=true;break;}
  await new Promise(r=>setTimeout(r,5000));
 }
 if(!matched)throw Error('Production does not serve the exact expected bootstrap: '+expectedBootstrap);
}
const browser=await({chromium,webkit}[engine]).launch();
try{
 for(const [width,height]of [[320,568],[390,844],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,colorScheme:'dark'});
  const page=await context.newPage();const errors=await observeBrowserErrors(page,{attach:async(name,value)=>writeFile(`${out}/${width}-${name}`,value.body)},'browser-errors.json');
  try{
   for(const [path,slug]of [['/','home'],['/partidas','partidas'],['/ingresar','login'],['/registrarme','registro'],['/comunidades','comunidades']]){
    const response=await page.goto(origin+path);expect(response.status()).toBe(200);await expect(page.locator('h1').first()).toBeVisible();await page.evaluate(()=>document.fonts.ready);
    if(path==='/partidas')await expect(page.locator('.game-results-skeleton')).toHaveCount(0);
    const layout=await page.evaluate(expected=>{
      const client=document.documentElement.clientWidth,y=scrollY;scrollTo(10000,y);const horizontal=scrollX;scrollTo(0,y);
      const offscreen=[...document.querySelectorAll('main a,main button,main input,main select,main textarea,app-header a,app-header button,app-footer a,app-footer button')].filter(el=>{const r=el.getBoundingClientRect(),c=getComputedStyle(el);return c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0&&(r.left< -2||r.right>client+2);}).map(el=>({tag:el.tagName,className:String(el.className).slice(0,80)}));
      return {body:document.body.scrollWidth,viewport:client,inner:innerWidth,visual:visualViewport?.width,scale:visualViewport?.scale,mediaWidth:matchMedia(`(width: ${expected}px)`).matches,horizontal,offscreen,version:document.querySelector('[ng-version]')?.getAttribute('ng-version'),styles:[...document.querySelectorAll('link[rel=stylesheet]')].map(el=>({href:el.getAttribute('href'),media:el.getAttribute('media')}))};
    },width);
    // Persist diagnostics even if a real layout failure is found.
    checks.push({width,path,status:response.status(),layout});
    await page.screenshot({path:`${out}/${width}-${slug}.jpg`,type:'jpeg',quality:85,fullPage:false,animations:'disabled'});
    expect(layout.body).toBeLessThanOrEqual(layout.viewport+1);
    if(width<768)expect(layout.viewport).toBe(width);else{expect(layout.viewport).toBeLessThanOrEqual(width);expect(layout.viewport).toBeGreaterThanOrEqual(width-11);}
    expect(layout.offscreen).toEqual([]);expect(layout.horizontal).toBe(0);
    expect(layout.version).toBe('22.2.5');expect(layout.styles.some(s=>!s.media||s.media==='all')).toBe(true);
    if(path==='/'&&width<768){await page.getByRole('button',{name:'Abrir menú',exact:true}).click();await expect(page.getByRole('navigation',{name:'Navegación móvil'})).toBeVisible();await page.screenshot({path:`${out}/${width}-menu.jpg`,type:'jpeg',quality:85});await page.getByRole('button',{name:'Cerrar menú',exact:true}).click();await expect(page.getByRole('navigation',{name:'Navegación móvil'})).toBeHidden();}
   }
   await page.goto(origin+'/partidas');await expect(page.locator('.game-results-skeleton')).toHaveCount(0);
   const detail=await page.locator('.game-card-action').first().getAttribute('href');
   if(detail){const response=await page.goto(origin+detail);expect(response.status()).toBe(200);await expect(page.locator('h1')).toBeVisible();await page.getByRole('button',{name:'Compartir partida',exact:true}).click();await expect(page.getByRole('menu',{name:'Opciones para compartir'})).toBeVisible();await page.screenshot({path:`${out}/${width}-compartir.jpg`,type:'jpeg',quality:85});await page.keyboard.press('Escape');checks.push({width,path:detail,status:response.status(),share:true});}
   await errors.assertClean();
  }finally{await context.close();}
 }
}finally{await writeFile(out+'/summary.json',JSON.stringify({engine,checkedAt:new Date().toISOString(),origin,readOnly:true,sourceHead:process.env.GITHUB_SHA,expectedBootstrap,expectedStyles,checks},null,2));await browser.close();}
console.log('PRODUCTION_READ_ONLY',JSON.stringify({engine,checks:checks.length}));
