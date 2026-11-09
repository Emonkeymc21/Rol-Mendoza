import { test, expect, type Page } from '@playwright/test';
import { observeBrowserErrors } from './browser-errors';

const landscapeSizes: ReadonlyArray<readonly [number,number,string]> = [
  [800,360,'android-landscape'], [844,390,'iphone-landscape'], [932,430,'iphone-large-landscape']
];
const mobileLandscapeQuery =
  '(min-width: 768px) and (max-width: 1023px) and (max-height: 500px) and (orientation: landscape) and (hover: none) and (pointer: coarse)';

async function assertInteractiveLayout(page: Page, width: number) {
  const result = await page.evaluate((expected) => {
    const bodyWidth = document.body.scrollWidth;
    const viewportWidth = document.documentElement.clientWidth;
    const prevY = scrollY;
    scrollTo(9000, prevY);
    const horizontalScroll = scrollX;
    scrollTo(0, prevY);
    const offscreen = Array.from(document.querySelectorAll('a,button,input,textarea,select'))
      .filter(el => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none' ||
            rect.width === 0 || rect.height === 0) return false;
        // Ignore elements inside deliberately closed/hidden dialogs.
        return rect.left < -2 || rect.right > expected + 2;
      }).slice(0,10).map(el => ({tag:el.tagName,selector:String(el.className).slice(0,70)}));
    return {bodyWidth,viewportWidth,horizontalScroll,offscreen};
  }, width);
  expect(result.viewportWidth).toBe(width);
  expect(result.bodyWidth).toBeLessThanOrEqual(width+1);
  expect(result.horizontalScroll).toBe(0);
  expect(result.offscreen).toEqual([]);
}

for (const [width,height,slug] of landscapeSizes) {
  test('Mobile horizontal '+slug+' ('+width+'x'+height+')',async ({browser,request},info)=>{
    test.skip(!['android-chromium','iphone-webkit'].includes(info.project.name),'Touch engines only');
    await expect.poll(async()=> (await request.post('http://127.0.0.1:4401/reset')).ok()).toBe(true);
    const context=await browser.newContext({
      viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1,
      colorScheme:'dark',reducedMotion:'reduce'
    });
    const page=await context.newPage();
    const errors=await observeBrowserErrors(page,info,'landscape-errors-'+slug);
    try{
      await page.goto('/');
      await expect(page.locator('app-home h1')).toBeVisible();
      await page.evaluate(()=>document.fonts.ready);
      expect(await page.evaluate(query=>matchMedia(query).matches,mobileLandscapeQuery)).toBe(true);
      const hero=await page.locator('app-home .hero-stage').evaluate(el=>({
        display:getComputedStyle(el).display,
        titleSize:parseFloat(getComputedStyle(el.querySelector('h1')!).fontSize)
      }));
      expect(hero.display).toBe('grid');
      expect(hero.titleSize).toBeLessThan(42);
      await assertInteractiveLayout(page,width);
      const head=page.locator('app-header .header-row');
      expect((await head.boundingBox())!.height).toBeLessThanOrEqual(70);
      await page.screenshot({path:info.outputPath(slug+'-home.png'),animations:'disabled'});

      await page.getByRole('button',{name:'Abrir menú',exact:true}).click();
      const nav=page.getByRole('navigation',{name:'Navegación móvil'});
      await expect(nav).toBeVisible();
      await expect(page.locator('body')).toHaveClass(/c20-mobile-menu-open/);
      const drawer=await page.locator('#mobile-navigation').boundingBox();
      expect(drawer).not.toBeNull();
      expect(drawer!.y+drawer!.height).toBeLessThanOrEqual(height+2);
      await page.screenshot({path:info.outputPath(slug+'-menu.png'),animations:'disabled'});
      await page.keyboard.press('Escape');
      await expect(nav).toBeHidden();
      await expect(page.locator('body')).not.toHaveClass(/c20-mobile-menu-open/);

      await page.goto('/partidas');
      const card=page.locator('app-game-card').first();
      await expect(card).toBeVisible();
      const art=await card.locator('.card-art').boundingBox();
      const infoBox=await card.locator('.game-card-body').boundingBox();
      expect(art).not.toBeNull();
      expect(infoBox).not.toBeNull();
      expect(art!.x+art!.width).toBeLessThanOrEqual(infoBox!.x+2);
      await assertInteractiveLayout(page,width);
      await page.screenshot({path:info.outputPath(slug+'-partidas.png'),fullPage:true,animations:'disabled'});

      await page.goto('/partidas/PRT-DEMO-BASE');
      await expect(page.locator('h1').first()).toBeVisible();
      await page.getByRole('button',{name:'Compartir partida',exact:true}).click();
      const sheet=page.getByRole('menu',{name:'Opciones para compartir'});
      await expect(sheet).toBeVisible();
      const bounds=await sheet.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(-1);
      expect(bounds!.y).toBeGreaterThanOrEqual(-1);
      expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width+2);
      expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(height+2);
      await page.screenshot({path:info.outputPath(slug+'-compartir.png'),animations:'disabled'});
      await page.getByRole('menuitem',{name:'Cerrar opciones para compartir'}).click();
      await expect(sheet).toBeHidden();

      await page.goto('/registrarme');
      await expect(page.locator('h1').first()).toBeVisible();
      await assertInteractiveLayout(page,width);
      await page.screenshot({path:info.outputPath(slug+'-registro.png'),fullPage:true,animations:'disabled'});
      await errors.assertClean();
    }finally{await context.close();}
  });
}

test('Touch rotation portrait → landscape → portrait keeps drawer and CSS usable',async({browser},info)=>{
  test.skip(!['android-chromium','iphone-webkit'].includes(info.project.name),'Touch engines only');
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,colorScheme:'dark'});
  const page=await context.newPage();
  try{
    await page.goto('/');
    await expect(page.locator('app-home h1')).toBeVisible();
    await page.getByRole('button',{name:'Abrir menú',exact:true}).click();
    await expect(page.locator('body')).toHaveClass(/c20-mobile-menu-open/);
    await page.setViewportSize({width:844,height:390});
    expect(await page.evaluate(query=>matchMedia(query).matches,mobileLandscapeQuery)).toBe(true);
    await expect(page.locator('body')).toHaveClass(/c20-mobile-menu-open/);
    await page.getByRole('button',{name:'Cerrar menú',exact:true}).click();
    await expect(page.locator('body')).not.toHaveClass(/c20-mobile-menu-open/);
    await assertInteractiveLayout(page,844);
    await page.setViewportSize({width:390,height:844});
    await assertInteractiveLayout(page,390);
    expect(await page.locator('app-home .hero-stage').evaluate(el=>getComputedStyle(el).display)).toBe('flex');
  }finally{await context.close();}
});

test('Desktop at 932x430 stays on original non-touch layout',async({browser},info)=>{
  test.skip(info.project.name!=='desktop-chromium','Desktop only');
  const context=await browser.newContext({viewport:{width:932,height:430},isMobile:false,hasTouch:false});
  const page=await context.newPage();
  try{
    await page.goto('/');
    await expect(page.locator('app-home h1')).toBeVisible();
    expect(await page.evaluate(query=>matchMedia(query).matches,mobileLandscapeQuery)).toBe(false);
    expect(await page.locator('app-home .hero-stage').evaluate(el=>getComputedStyle(el).display)).toBe('flex');
    await page.screenshot({path:info.outputPath('desktop-932-horizontal-unchanged.png'),animations:'disabled'});
  }finally{await context.close();}
});
