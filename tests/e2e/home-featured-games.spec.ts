import { expect, test } from '@playwright/test';

test('Two featured games do not stretch across a second row on desktop', async ({ page, request }, info) => {
  test.skip(!info.project.name.startsWith('desktop-'), 'Desktop grid');

  const response = await request.get('http://127.0.0.1:4401/apps-script?action=game&gameId=PRT-DEMO-BASE');
  expect(response.ok()).toBe(true);
  const fixture = await response.json();
  expect(fixture.ok).toBe(true);
  const games = [
    { ...fixture.data, titulo: 'Crónicas de la montaña y el misterio de la ciudad perdida', descripcion: 'Una aventura entre montañas.' },
    { ...fixture.data, partida_id: 'PRT-HOME-SECOND', titulo: 'Mesa breve', descripcion: 'Una sesión de rol.' }
  ];
  await page.route(/\/apps-script\?action=games$/, route => route.fulfill({ json: { ok: true, data: games } }));
  await page.goto('/');

  const cards = page.locator('.home-game-layout > app-game-card');
  await expect(cards).toHaveCount(2);
  await page.evaluate(() => document.fonts.ready);
  const first = cards.first();
  await expect(first).toHaveCSS('grid-row-start', 'auto');
  await expect.poll(async () => first.locator('.game-card-summary').evaluate(element => {
    const maxTextHeight = 3 * parseFloat(getComputedStyle(element).lineHeight);
    return element.getBoundingClientRect().height - maxTextHeight;
  })).toBeLessThanOrEqual(1);
  await expect(first.getByRole('link', { name: 'Ver aventura' })).toBeVisible();
});
