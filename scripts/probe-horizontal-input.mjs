import {chromium,webkit} from '@playwright/test';
const engine=process.env.CUMBRE20_BROWSER;const browser=await({chromium,webkit}[engine]).launch();
try{for(const mobile of [true,false])for(const mode of ['root','nested-auto','nested-hidden']){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
 try{const page=await context.newPage();await page.bringToFront();
 const nested=mode!=='root';const markup=nested?`<div id="box" tabindex="0" style="width:350px;height:200px;overflow-x:${mode==='nested-auto'?'auto':'hidden'}"><div style="width:900px;height:100px">Control</div></div>`:'<div style="width:900px;height:1800px">Control</div>';
 await page.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{overflow-x:auto;scroll-behavior:auto}body{margin:0}</style><body tabindex="0">'+markup+'</body>');
 const target=page.locator(nested?'#box':'body');await target.click({position:{x:10,y:10}});await target.focus();
 const state=()=>page.evaluate(nested=>({x:scrollX,inner:innerWidth,client:document.documentElement.clientWidth,rootWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,target:document.querySelector('#box')?.scrollLeft,active:document.activeElement?.tagName,visual:visualViewport&&{width:visualViewport.width,scale:visualViewport.scale,left:visualViewport.pageLeft,offset:visualViewport.offsetLeft}}),nested);
 const before=await state();await page.keyboard.press('ArrowRight');await page.waitForTimeout(250);const arrow=await state();let wheel;
 try{await page.mouse.move(50,50);await page.mouse.wheel(450,0);await page.waitForTimeout(250);wheel=await state();}catch(e){wheel={unsupported:String(e.message).split('\n')[0]};}
 await page.evaluate(nested=>{if(nested)document.querySelector('#box').scrollTo({left:500,top:0,behavior:'instant'});else scrollTo({left:500,top:0,behavior:'instant'});},nested);const programmatic=await state();
 console.log('INPUT_PROBE',JSON.stringify({engine,platform:process.platform,mobile,mode,before,arrow,wheel,programmatic}));
 }finally{await context.close();}
}}finally{await browser.close();}
