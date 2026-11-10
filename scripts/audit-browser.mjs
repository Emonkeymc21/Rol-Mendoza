import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
const directory='audit-results/'+(process.env.CUMBRE20_AUDIT_LABEL||'after');await mkdir(directory,{recursive:true});
const children=['tests/isolated-server.cjs','scripts/serve-audit.cjs'].map(file=>spawn(process.execPath,[file],{stdio:'inherit',env:{...process.env,CUMBRE20_TEST_MODE:'1'}}));
if(process.env.CUMBRE20_AUDIT_LABEL!=='baseline')children.push(spawn(process.execPath,['dist/audit/server/server.mjs'],{stdio:'inherit',env:{...process.env,PORT:'4300',CUMBRE20_TEST_MODE:'1'}}));
async function ready(url){for(let n=0;n<100;n++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error('Server did not start: '+url);}
try{
 if(process.env.CUMBRE20_AUDIT_LABEL!=='baseline')await ready('http://127.0.0.1:4300');
 await ready('http://127.0.0.1:4401/health');await ready('http://127.0.0.1:4200');
 if(!(await fetch('http://127.0.0.1:4401/reset',{method:'POST'})).ok)throw Error('Unable to seed demo audit');
 const metrics=[];
 for(let run=1;run<=3;run++){
  const chrome=await chromeLauncher.launch({chromePath:chromium.executablePath(),chromeFlags:['--headless','--no-sandbox']});
  try{
   const result=await lighthouse('http://127.0.0.1:4200/',{port:chrome.port,output:['html','json'],onlyCategories:['performance','accessibility','best-practices','seo'],logLevel:'error'});
   await writeFile(`${directory}/lighthouse-${run}.html`,result.report[0]);await writeFile(`${directory}/lighthouse-${run}.json`,result.report[1]);
   const a=result.lhr.audits;metrics.push({run,categories:Object.fromEntries(Object.entries(result.lhr.categories).map(([k,v])=>[k,v.score*100])),LCP:a['largest-contentful-paint'].numericValue,CLS:a['cumulative-layout-shift'].numericValue,FCP:a['first-contentful-paint'].numericValue,TBT:a['total-blocking-time'].numericValue,TTFB:a['server-response-time']?.numericValue,bytes:a['total-byte-weight'].numericValue});
  }finally{await chrome.kill();}
 }
 const browser=await chromium.launch();const checks=[];
 try{
  for(const [name,width,height]of[['compact',320,568],['android',393,851],['large',430,932],['iphone',390,844],['landscape-android',800,360],['landscape-iphone',844,390],['landscape-large',932,430],['tablet',768,1024],['desktop',1440,900]]){
   for(const theme of ['dark','light']) {
   const landscape=name.startsWith('landscape-');const context=await browser.newContext({viewport:{width,height},colorScheme:theme,isMobile:landscape,hasTouch:landscape});const page=await context.newPage();
   const requests=[];page.on('request',r=>requests.push(r.url()));
   for(const route of ['/','/partidas','/partidas/PRT-DEMO-BASE','/comunidades','/ingresar','/registrarme']){
    await page.goto('http://127.0.0.1:4200'+route);await page.locator('h1').first().waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1200);
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']).analyze();
    const fits=await page.evaluate(()=>{
      const startX=scrollX, startY=scrollY;
      scrollTo(10000,startY);
      const actualHorizontal=scrollX;
      scrollTo(startX,startY);
      // Firebase's emulator warning lives in an out-of-tree shadow root and
      // can inflate html.scrollWidth without making page content scrollable.
      return document.body.scrollWidth<=innerWidth+1 && actualHorizontal===0;
    });
    const key=route==='/'?'home':route.replaceAll('/','_');
    await page.screenshot({path:`${directory}/${name}-${key}-${theme}.png`,fullPage:true,animations:'disabled'});
    checks.push({name,theme,route,fits,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
   }
   await context.close();
   }
  }
 }finally{await browser.close();}
 await writeFile(`${directory}/summary.json`,JSON.stringify({metrics,checks},null,2));console.log('AUDIT_SUMMARY',JSON.stringify({metrics,checks:checks.map(c=>({name:c.name,theme:c.theme,route:c.route,fits:c.fits,violations:c.violations.map(v=>v.id)}))}));
 if(process.env.CUMBRE20_AUDIT_LABEL!=='baseline' && checks.some(c=>c.fits===false || c.violations.length))throw Error('Accessibility or overflow regression: inspect summary.json');
}finally{children.forEach(c=>c.kill('SIGTERM'));}
