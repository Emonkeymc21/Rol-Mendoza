import { expect, test } from '@playwright/test';
import sharp from 'sharp';

const longTitle = 'Jujutsu Kaisen: Bajo el Velo - Primer arco · Marea de nombres';
const gamesUrl = /\/apps-script\?action=games$/;

test('Home keeps the intended layout for one, two and three adventures', async ({ page, request }, info) => {
  const response = await request.get('http://127.0.0.1:4401/apps-script?action=game&gameId=PRT-DEMO-BASE');
  expect(response.ok()).toBe(true);
  const fixture = await response.json();
  expect(fixture.ok).toBe(true);
  const cover = await sharp({
    create: { width: 480, height: 240, channels: 3, background: '#622630' }
  }).webp().toBuffer();
  const games = [
    { ...fixture.data, titulo: longTitle, descripcion: 'Una aventura entre montañas.', portada_version: '1'.repeat(32) },
    { ...fixture.data, partida_id: 'PRT-HOME-SECOND', titulo: 'Mesa breve', descripcion: 'Una sesión de rol.' },
    { ...fixture.data, partida_id: 'PRT-HOME-THIRD', titulo: 'La tercera aventura', descripcion: 'Otra sesión de rol.' }
  ];
  await page.route(/\/api\/game-cover\?gameId=PRT-DEMO-BASE&.*variant=card$/, route =>
    route.fulfill({ body: cover, contentType: 'image/webp' }));
  let count = 2;
  const state = { pause: false, resume: () => {} };
  await page.route(gamesUrl, async route => {
    if (state.pause) await new Promise<void>(resolve => { state.resume = resolve; });
    await route.fulfill({ json: { ok: true, data: games.slice(0, count) } });
  });

  const cards = page.locator('.home-game-layout > app-game-card');
  const first = cards.first();
  const second = cards.nth(1);
  const art = first.locator('.card-art');
  const open = first.getByRole('link', { name: 'Ver aventura' });
  const share = first.getByRole('button', { name: 'Compartir ' + longTitle });
  const checkTwo = async (desktopLayout: boolean) => {
    const sideBySide = await page.evaluate(() => matchMedia('(min-width: 768px)').matches);
    await expect(cards).toHaveCount(2);
    await expect(first.getByRole('heading', { name: longTitle })).toBeVisible();
    await expect(second.getByRole('heading', { name: 'Mesa breve' })).toBeVisible();
    await expect(first).toHaveCSS('grid-row-start', sideBySide && !desktopLayout ? '1' : 'auto');
    const [a, b] = await Promise.all([first.boundingBox(), second.boundingBox()]);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    if (sideBySide) {
      expect(a!.y).toBe(b!.y);
      expect(b!.x).toBeGreaterThanOrEqual(a!.x + a!.width);
      if (desktopLayout) {
        expect(a!.height).toBeGreaterThan(b!.height);
        for (const card of [first, second]) {
          const summary = card.locator('.game-card-summary');
          await expect.poll(() => summary.evaluate(element => {
            const maxTextHeight = 3 * parseFloat(getComputedStyle(element).lineHeight);
            return element.getBoundingClientRect().height - maxTextHeight;
          })).toBeLessThanOrEqual(1);
        }
      }
    } else {
      expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height);
    }
    await art.scrollIntoViewIfNeeded();
    await expect(art.locator('img')).not.toHaveJSProperty('naturalWidth', 0);
    await expect(second.locator('.card-art')).toHaveCSS('background-image', /tabletop-detail\.webp/);
    await expect(open).toBeVisible();
    await expect(share).toBeVisible();
  };

  const desktop = info.project.name.startsWith('desktop-');
  if (desktop) {
    // At the breakpoint, measure the CSS media viewport. Classic scrollbars
    // may consume 11px of the outer browser viewport on WebKit.
    for (const width of [1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      if (!(await page.evaluate(value => matchMedia(`(min-width:${value}px)`).matches, width))) {
        const gutter = await page.evaluate(() => innerWidth - document.documentElement.clientWidth);
        await page.goto('about:blank');
        await page.setViewportSize({ width: width + gutter, height: 900 });
        await page.goto('/');
      }
      await expect.poll(() => page.evaluate(value => matchMedia(`(min-width:${value}px)`).matches, width)).toBe(true);
      await checkTwo(true);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.adventures-section').screenshot({ path: info.outputPath(`home-two-${width}.png`), animations: 'disabled' });
    }
  } else {
    const portrait = page.viewportSize()!;
    await page.goto('/');
    await checkTwo(false);
    await page.setViewportSize({ width: portrait.height, height: portrait.width });
    await checkTwo(false);
    await page.locator('.adventures-section').screenshot({ path: info.outputPath('home-two-landscape.png'), animations: 'disabled' });
    await page.setViewportSize(portrait);
  }

  await share.click();
  const menu = page.getByRole('menu', { name: 'Opciones para compartir' });
  await expect(menu.getByRole('menuitem', { name: /WhatsApp/ })).toHaveAttribute('href', /wa\.me/);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await open.click();
  await expect(page).toHaveURL(/\/partidas\/PRT-DEMO-BASE$/);

  state.pause = true;
  count = 1;
  await page.goto('/');
  try {
    await expect(page.getByLabel('Cargando partidas')).toBeVisible();
    await expect(page.locator('.game-skeleton-grid .game-skeleton')).toHaveCount(3);
  } finally {
    state.pause = false;
    state.resume();
  }
  await expect(cards).toHaveCount(1);
  count = 3;
  await page.goto('/');
  await expect(cards).toHaveCount(3);
  await expect(first).toHaveCSS('grid-row-start', desktop ? '1' : 'auto');
});
