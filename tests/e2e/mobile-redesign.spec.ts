import { test, expect, type Page } from '@playwright/test';
import { observeBrowserErrors } from './browser-errors';

const widths: ReadonlyArray<readonly [number, number]> = [
  [320, 568], [360, 800], [375, 812], [390, 844], [393, 851],
  [412, 915], [430, 932]
];
const extendedRoutes = [
  ['/como-funciona', 'como-funciona'], ['/nosotros', 'nosotros'],
  ['/privacidad', 'privacidad'], ['/terminos', 'terminos'],
  ['/registrarme', 'registro'], ['/ingresar', 'login']
] as const;


async function hideEmulatorOnlyBanner(page: Page) {
  // Firebase Auth emulator injects a fixed test warning that does not exist
  // in production. Omit this diagnostic overlay from visual evidence only.
  await page.locator('.firebase-emulator-warning').evaluateAll(elements => {
    for (const element of elements) (element as HTMLElement).style.display = 'none';
  });
}

async function captureRealPage(page: Page, path: string) {
  await hideEmulatorOnlyBanner(page);
  // Home sections use IntersectionObserver; reveal them by actual scrolling before
  // taking a full-page image. A full-page capture alone never triggers observers.
  await page.evaluate(async () => {
    const step = Math.max(240, Math.round(innerHeight * .75));
    const maxY = document.documentElement.scrollHeight;
    for (let y = 0; y < maxY; y += step) {
      scrollTo(0, y);
      await new Promise<void>(resolve => setTimeout(resolve, 65));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
}

async function assertFits(page: Page, width: number) {
  // Firebase emulator injects an out-of-tree, fixed warning in a shadow root.
  // It can increase documentElement.scrollWidth at 320px even when body fits
  // and horizontal scrollX is impossible. Exclude it, never app content.
  await hideEmulatorOnlyBanner(page);
  const state = await page.evaluate((expectedWidth) => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    overflowElements: [...document.querySelectorAll('main a,main button,main input,main select,main textarea,app-header a,app-header button,app-footer a,app-footer button')]
      .filter(element => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        // Artistic background images intentionally extend outside clipped
        // panels. Only overflowing usable actions are regressions.
        return style.display !== 'none' && style.visibility !== 'hidden' &&
          box.width > 0 && box.height > 0 &&
          (box.right > expectedWidth + 2 || box.left < -2);
      })
      .slice(0, 12)
      .map(element => ({ tag: element.tagName, className: String(element.className).slice(0, 100) })),
    scrollableChildren: [...document.querySelectorAll('body *')]
      .filter(element => element.scrollWidth > element.clientWidth + 3)
      .slice(0, 12)
      .map(element => ({ tag: element.tagName, className: String(element.className).slice(0, 80), scroll: element.scrollWidth, client: element.clientWidth })),
    root: { scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, bodyScroll: document.body.scrollWidth, bodyClient: document.body.clientWidth },
    scrollBy: (() => {const y = scrollY; scrollTo(500, y); const x = scrollX; scrollTo(0, y); return x;})(),
    outsideExpected: [...document.querySelectorAll('body *')].map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName,
        className: String(element.className).slice(0, 70),
        x: Math.round(rect.x), right: Math.round(rect.right),
        width: Math.round(rect.width),
        scroll: element.scrollWidth,
        client: element.clientWidth,
        position: style.position,
        overflow: style.overflowX
      };
    }).filter(x => x.right > expectedWidth + 2 && x.width > 0).slice(0, 32)
  }), width);
  // A shadow-root browser/emulator overlay may increase html.scrollWidth while
  // body is exactly viewport-wide and scrollX cannot move. Test usable layout,
  // not merely a root bookkeeping measurement.
  expect(state.root.bodyScroll, 'Body content stays within the viewport').toBeLessThanOrEqual(width + 1);
  expect(state.overflowElements, 'Visible elements must not overflow horizontally').toEqual([]);
  expect(state.scrollBy, 'Horizontal scrolling must be impossible').toBe(0);
  expect(state.root.client, JSON.stringify({width, outsideExpected:state.outsideExpected, root:state.root})).toBe(width);
}

for (const [width, height] of widths) {
  test('Mobile redesign at ' + width + 'px: home, partidas, detalle, share, menus, communities', async ({ browser, request }, info) => {
    const engine = info.project.name;
    test.skip(engine !== 'android-chromium' && engine !== 'iphone-webkit', 'Mobile engine only');
    test.skip(engine === 'iphone-webkit' && ![320, 390, 430].includes(width), 'WebKit sample widths');

    const seeded = await request.post('http://127.0.0.1:4401/reset');
    expect(seeded.ok()).toBeTruthy();
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: 'dark' });
    const page = await context.newPage();
    const errors = await observeBrowserErrors(page, info, 'browser-errors-' + width);
    try {
      await page.goto('/');
      await expect(page.locator('app-home h1')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await assertFits(page, width);
      await captureRealPage(page, info.outputPath('home-' + width + '.png'));

      const toggle = page.getByRole('button', { name: 'Abrir menú', exact: true });
      await toggle.click();
      await expect(page.getByRole('navigation', { name: 'Navegación móvil' })).toBeVisible();
      await expect(page.locator('body')).toHaveClass(/c20-mobile-menu-open/);
      await hideEmulatorOnlyBanner(page);
      await page.screenshot({ path: info.outputPath('drawer-' + width + '.png'), animations: 'disabled' });
      await page.getByRole('button', { name: 'Cerrar menú tocando fuera' }).click({ position: { x: width > 360 ? width - 12 : width - 7, y: 40 } });
      await expect(page.getByRole('navigation', { name: 'Navegación móvil' })).toBeHidden();
      await expect(page.locator('body')).not.toHaveClass(/c20-mobile-menu-open/);

      await page.goto('/partidas');
      const card = page.locator('app-game-card').first();
      await expect(card).toBeVisible();
      await expect(page.locator('h1').first()).toBeVisible();
      await assertFits(page, width);
      const art = await card.locator('.card-art').boundingBox();
      const content = await card.locator('.game-card .mobile-system-label').boundingBox();
      expect(art).not.toBeNull();
      expect(content).not.toBeNull();
      // The grid item boxes may touch; actual text must remain clearly
      // separated from the illustration on Safari and Chromium.
      expect(art!.x + art!.width).toBeLessThanOrEqual(content!.x + 2);
      await captureRealPage(page, info.outputPath('partidas-' + width + '.png'));

      await page.goto('/partidas/PRT-DEMO-BASE');
      await expect(page.locator('h1').first()).toBeVisible();
      await assertFits(page, width);
      await captureRealPage(page, info.outputPath('detalle-' + width + '.png'));
      await page.getByRole('button', { name: 'Compartir partida', exact: true }).click();
      const sheet = page.getByRole('menu', { name: 'Opciones para compartir' });
      await expect(sheet).toBeVisible();
      const sheetBox = await sheet.boundingBox();
      expect(sheetBox).not.toBeNull();
      expect(Math.abs(sheetBox!.y + sheetBox!.height - height)).toBeLessThanOrEqual(2);
      await hideEmulatorOnlyBanner(page);
      await page.screenshot({ path: info.outputPath('compartir-' + width + '.png'), animations: 'disabled' });
      await page.getByRole('menuitem', { name: 'Cerrar opciones para compartir' }).click();
      await expect(sheet).toBeHidden();

      await page.goto('/comunidades');
      await expect(page.locator('h1').first()).toBeVisible();
      await assertFits(page, width);
      await captureRealPage(page, info.outputPath('comunidades-' + width + '.png'));

      if (width === 393) {
        for (const [route, slug] of extendedRoutes) {
          await page.goto(route);
          await expect(page.locator('h1').first()).toBeVisible();
          await assertFits(page, width);
          await captureRealPage(page, info.outputPath(slug + '-' + width + '.png'));
        }
      }
      await errors.assertClean();
    } finally {
      await context.close();
    }
  });
}

test('Viewport isolation: tablet and desktop retain original CSS and no mobile navigation lock', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'Desktop Chromium only');
  for (const width of [768, 1024, 1440, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    try {
      await page.goto('/');
      await expect(page.locator('app-home h1')).toBeVisible();
      await assertFits(page, width);
      await captureRealPage(page, info.outputPath('home-unmodified-' + width + '.png'));
      expect(await page.evaluate(() => matchMedia('(max-width: 767px)').matches)).toBe(false);
      expect(await page.evaluate(() => document.body.classList.contains('c20-mobile-menu-open'))).toBe(false);
    } finally {
      await context.close();
    }
  }
});
