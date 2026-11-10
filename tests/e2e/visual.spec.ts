import {test,expect} from '@playwright/test';
import {observeBrowserErrors} from './browser-errors';
// Reference: unchanged application c733dd6, Chromium 158 / Playwright 1.65, Ubuntu 24.04.
// Same fonts, fixture, viewport, theme, animations and waiting conditions as the audit harness.
test('Home desktop and tablet visual regression: unchanged baseline at 768px and 1440px',async({browser},info)=>{
 test.skip(info.project.name!=='desktop-chromium','Reference pixels are specific to Chromium on Ubuntu');
 for(const [name,width,height]of[['tablet',768,1024],['desktop',1440,900]] as const){
  for(const theme of ['dark','light'] as const){
   const context=await browser.newContext({viewport:{width,height},colorScheme:theme});const page=await context.newPage();
   const errors=await observeBrowserErrors(page,info);
   try{
    await page.goto('/');await expect(page.locator('app-home h1')).toBeVisible();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1200);
    await expect(page).toHaveScreenshot(`${name}-${theme}.png`,{animations:'disabled',maxDiffPixelRatio:0.01});await errors.assertClean();
   }finally{await context.close();}
  }
 }
});
