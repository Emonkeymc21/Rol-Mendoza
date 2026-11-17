import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import sharp from 'sharp';

test.use({ reducedMotion: 'reduce' });

const longTitle = 'Jujutsu Kaisen: Bajo el Velo - Primer arco · Marea de nombres';
const gamesUrl = /\/apps-script\?action=games$/;
const homeCards = (page: Page) => page.locator('.home-game-layout > app-game-card');

async function fixture(page: Page, request: APIRequestContext) {
  const response = await request.get('http://127.0.0.1:4401/apps-script?action=game&gameId=PRT-DEMO-BASE');
  expect(response.ok()).toBe(true);
  const { ok, data } = await response.json();
  expect(ok).toBe(true);
  const cover = await sharp({
    create: { width: 480, height: 240, channels: 3, background: '#622630' }
  }).webp().toBuffer();
  const games = [
    { ...data, titulo: longTitle, descripcion: 'Una aventura entre montañas.', portada_version: '1'.repeat(32) },
    { ...data, partida_id: 'PRT-HOME-SECOND', titulo: 'Mesa breve', descripcion: 'Una sesión de rol.' },
    { ...data, partida_id: 'PRT-HOME-THIRD', titulo: 'La tercera aventura', descripcion: 'Otra sesión de rol.' }
  ];
  const state = { count: 2, pause: false, resume: () => {} };
  await page.route(/\/api\/game-cover\?gameId=PRT-DEMO-BASE&.*variant=card$/, route =>
    route.fulfill({ body: cover, contentType: 'image/webp' }));
  await page.route(gamesUrl, async route => {
    if (state.pause) await new Promise<void>(resolve => { state.resume = resolve; });
    await route.fulfill({ json: { ok: true, data: games.slice(0, state.count) } });
  });
  return state;
}

for (const width of [1024, 1440, 1920]) {
  test('Two featured adventures keep their natural height at ' + width + ' px', async ({ page, request }, info) => {
    test.skip(!info.project.name.startsWith('desktop-'), 'Desktop grid');
    await fixture(page, request);
    const cards = homeCards(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(cards).toHaveCount(2);
    const fits = () => page.evaluate(value => matchMedia(`(min-width:${value}px)`).matches, width);
    if (!(await fits())) {
      // A classic scrollbar can reduce the CSS media width in WebKit.
      const gutter = await page.evaluate(() => innerWidth - document.documentElement.clientWidth);
      await page.goto('about:blank');
      await page.setViewportSize({ width: width + gutter, height: 900 });
      await page.goto('/');
      await expect(cards).toHaveCount(2);
    }
    await expect.poll(fits).toBe(true);
    await expect(cards.first()).toHaveCSS('grid-row-start', 'auto');
    const [a, b] = await cards.evaluateAll(elements => elements.map(element => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    }));
    expect(a.y).toBe(b.y);
    expect(b.x).toBeGreaterThanOrEqual(a.x + a.width);
    expect(a.height).toBeGreaterThan(b.height);
    for (const card of [cards.first(), cards.last()]) {
      const growth = () => card.locator('.game-card-summary').evaluate(element =>
        element.getBoundingClientRect().height - 3 * parseFloat(getComputedStyle(element).lineHeight));
      await expect.poll(growth).toBeLessThanOrEqual(1);
      await expect(card.getByRole('link', { name: 'Ver aventura' })).toBeVisible();
      await expect(card.getByRole('button', { name: /^Compartir / })).toBeVisible();
    }
  });
}

test('Home shows covers and actions and preserves loading, one and three adventures', async ({ page, request }, info) => {
  const state = await fixture(page, request);
  const desktop = info.project.name.startsWith('desktop-');
  if (desktop) await page.setViewportSize({ width: 1440, height: 900 });
  const portrait = page.viewportSize()!;
  await page.goto('/');

  const cards = homeCards(page);
  const first = cards.first();
  const art = first.locator('.card-art');
  const open = first.getByRole('link', { name: 'Ver aventura' });
  const share = first.getByRole('button', { name: 'Compartir ' + longTitle });
  const checkTwo = async (label: string) => {
    await expect(cards).toHaveCount(2);
    await expect(first.getByRole('heading', { name: longTitle })).toBeVisible();
    await expect(cards.last().getByRole('heading', { name: 'Mesa breve' })).toBeVisible();
    await art.scrollIntoViewIfNeeded();
    await expect(art.locator('img')).not.toHaveJSProperty('naturalWidth', 0);
    await expect(cards.last().locator('.card-art')).toHaveCSS('background-image', /tabletop-detail\.webp/);
    await expect(open).toBeVisible();
    await expect(share).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: info.outputPath('home-two-' + label + '.png'), animations: 'disabled' });
  };
  await checkTwo(desktop ? '1440' : 'portrait');
  if (!desktop) {
    await page.setViewportSize({ width: portrait.height, height: portrait.width });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await checkTwo('landscape');
    await page.setViewportSize(portrait);
  }

  await share.click();
  const menu = page.getByRole('menu', { name: 'Opciones para compartir' });
  await expect(menu.getByRole('menuitem', { name: /WhatsApp/ })).toHaveAttribute('href', /wa\.me/);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await open.click();
  await expect(page).toHaveURL(/\/partidas\/PRT-DEMO-BASE$/);

  await page.evaluate(() => sessionStorage.removeItem('cumbre20-public-games'));
  state.pause = true;
  state.count = 1;
  await page.goto('/');
  try {
    await expect(page.locator('.game-skeleton-grid[aria-busy="true"]')).toBeVisible();
    await expect(page.locator('.game-skeleton-grid .game-skeleton')).toHaveCount(3);
  } finally {
    state.pause = false;
    state.resume();
  }
  await expect(cards).toHaveCount(1);
  const originalRow = await page.evaluate(() => matchMedia('(min-width: 768px)').matches) ? '1' : 'auto';
  await expect(first).toHaveCSS('grid-row-start', originalRow);
  state.count = 3;
  await page.goto('/');
  await expect(cards).toHaveCount(3);
  await expect(first).toHaveCSS('grid-row-start', originalRow);
});
