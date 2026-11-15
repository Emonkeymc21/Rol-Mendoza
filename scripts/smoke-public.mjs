// Read-only production check. No registration, login, form submission or writes.
import {chromium,webkit,expect as pwExpect} from '@playwright/test';
import {mkdir,writeFile,readdir} from 'node:fs/promises';
import {observeBrowserErrors} from '../tests/e2e/browser-errors.ts';
const expect=pwExpect.configure({timeout:30000});
const engine=process.env.CUMBRE20_BROWSER||'chromium';
if(!['chromium','webkit'].includes(engine))throw Error('Unknown browser engine');
const origin='https://rol-mendoza-2026.vercel.app',out='mobile-results/'+engine+'/production';
await mkdir(out,{recursive:true});const checks=[];
let expectedBootstrap;
if(process.env.CUMBRE20_REQUIRE_PUBLISHED==='1'){
 expectedBootstrap=(await readdir('dist/rol-mendoza/browser')).find(name=>/^main-[\w-]+\.js$/.test(name));
 if(!expectedBootstrap)throw Error('Production bootstrap was not built');
 let matched=false;
 for(let i=0;i<24;i++){
  const response=await fetch(origin+'/',{cache:'no-store',signal:AbortSignal.timeout(15000)});const html=await response.text();
  if(response.ok&&html.includes('src="'+expectedBootstrap+'"')){matched=true;break;}
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
    const layout=await page.evaluate(()=>({body:document.body.scrollWidth,viewport:document.documentElement.clientWidth,inner:innerWidth,mediaWidth:matchMedia(`(width: ${innerWidth}px)`).matches,version:document.querySelector('[ng-version]')?.getAttribute('ng-version'),styles:[...document.querySelectorAll('link[rel=stylesheet]')].map(el=>({href:el.getAttribute('href'),media:el.getAttribute('media')}))}));
    expect(layout.body).toBeLessThanOrEqual(layout.viewport+1);expect(layout.inner).toBe(width);expect(layout.mediaWidth).toBe(true);expect(layout.version).toBe('22.2.5');expect(layout.styles.some(s=>!s.media||s.media==='all')).toBe(true);
    await page.screenshot({path:`${out}/${width}-${slug}.jpg`,type:'jpeg',quality:85,fullPage:false,animations:'disabled'});checks.push({width,path,status:response.status(),layout});
    if(path==='/'&&width<768){await page.getByRole('button',{name:'Abrir menú',exact:true}).click();await expect(page.getByRole('navigation',{name:'Navegación móvil'})).toBeVisible();await page.screenshot({path:`${out}/${width}-menu.jpg`,type:'jpeg',quality:85});await page.getByRole('button',{name:'Cerrar menú',exact:true}).click();await expect(page.getByRole('navigation',{name:'Navegación móvil'})).toBeHidden();}
   }
   await page.goto(origin+'/partidas');await expect(page.locator('.game-results-skeleton')).toHaveCount(0);
   const detail=await page.locator('.game-card-action').first().getAttribute('href');
   if(detail){const response=await page.goto(origin+detail);expect(response.status()).toBe(200);await expect(page.locator('h1')).toBeVisible();await page.getByRole('button',{name:'Compartir partida',exact:true}).click();await expect(page.getByRole('menu',{name:'Opciones para compartir'})).toBeVisible();await page.screenshot({path:`${out}/${width}-compartir.jpg`,type:'jpeg',quality:85});await page.keyboard.press('Escape');checks.push({width,path:detail,status:response.status(),share:true});}
   await errors.assertClean();
  }finally{await context.close();}
 }
}finally{await writeFile(out+'/summary.json',JSON.stringify({engine,checkedAt:new Date().toISOString(),origin,readOnly:true,sourceHead:process.env.GITHUB_SHA,expectedBootstrap,checks},null,2));await browser.close();}
console.log('PRODUCTION_READ_ONLY',JSON.stringify({engine,checks:checks.length}));
