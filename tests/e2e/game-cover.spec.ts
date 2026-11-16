import { expect, test, type Locator, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const api = 'http://127.0.0.1:4401';
const auth = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key';
const root = 'http://127.0.0.1:8080/v1/projects/demo-cumbre20/databases/(default)/documents';
const password = 'Demo-cover-123!';
const coverLabel = 'Imagen de portada (opcional)';
const title = 'Crónicas de la Cumbre';
const field = (page: Page, name: string) => page.locator(`[formcontrolname="${name}"]`);
const coverRoute = /\/api\/game-cover(?:\?|$)/;

test('campaign cover lifecycle, responsive use, permissions and size', async ({ page, request, browser }, info) => {
  test.setTimeout(150000);
  expect((await request.post(api + '/reset')).ok()).toBe(true);
  async function actor(displayName: string, role: string) {
    const email = role.toLowerCase() + '-cover@example.test';
    const signup = await request.post(auth, { data: { email, password, displayName, returnSecureToken: true } });
    expect(signup.ok()).toBe(true);
    const { localId, idToken } = await signup.json();
    const profile = await request.patch(root + '/users/' + localId, {
      headers: { Authorization: 'Bearer owner' },
      data: { fields: {
        displayName: { stringValue: displayName }, city: { stringValue: 'Guaymallén' },
        role: { stringValue: role }, active: { booleanValue: true }, profileCompleted: { booleanValue: true },
        firstName: { stringValue: displayName }, lastName: { stringValue: 'Prueba' },
        preferences: { mapValue: { fields: {
          systems: { arrayValue: { values: [{ stringValue: 'Fate' }] } },
          ...Object.fromEntries(Object.entries({
            experience: 'Principiante', frequency: 'Semanal', availability: 'Sábados',
            atmosphere: 'Aventura', bio: 'Perfil ficticio para comprobar las portadas en el entorno aislado de pruebas.'
          }).map(([key, value]) => [key, {stringValue: value}]))
        } } }
      } }
    });
    expect(profile.ok()).toBe(true);
    const contact = await request.patch(root + '/userPrivate/' + localId, {
      headers: { Authorization: 'Bearer owner' },
      data: { fields: { privacyConsent: { booleanValue: true }, whatsappNumber: { stringValue: '5492615551234' } } }
    });
    expect(contact.ok()).toBe(true);
    return { email, idToken };
  }
  const owner = await actor('Emma QA', 'DM');
  const other = await actor('Luna QA', 'PLAYER');
  const wide = await sharp('src/assets/branding/game-detail-real.webp').resize(1600).jpeg({quality: 94})
    .withExif({IFD3: {GPSLatitudeRef: 'S', GPSLatitude: '32/1 53/1 0/1'}}).toBuffer();
  const tall = await sharp('src/assets/branding/tabletop-detail.webp').resize(620, 1450, {fit: 'cover'}).png().toBuffer();
  const isMobile = /android|iphone/.test(info.project.name);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 1000});
  const portrait = page.viewportSize()!;
  const views = isMobile ? [
    ['vertical', portrait], ['horizontal', {width: portrait.height, height: portrait.width}]
  ] as const : [['pc', portrait]] as const;

  async function capture(target: Locator, name: string) {
    await target.page().locator('.firebase-emulator-warning').evaluateAll(elements => {
      for (const element of elements) (element as HTMLElement).style.display = 'none';
    });
    await target.page().evaluate(() => document.fonts.ready);
    await target.screenshot({ path: info.outputPath(name + '.png'), animations: 'disabled' });
  }
  async function snapshots(target: Locator, name: string) {
    for (const [direction, viewport] of views) {
      await target.page().setViewportSize(viewport);
      await capture(target, name + '-' + direction);
      expect(await target.page().evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
    }
    await target.page().setViewportSize(portrait);
  }

  await page.goto('/ingresar?returnUrl=%2Fpartidas%2Fnueva');
  await expect(page.locator('html')).toHaveAttribute('data-emulator-project', 'demo-cumbre20');
  await field(page, 'email').fill(owner.email);
  await field(page, 'password').fill(password);
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/partidas/nueva');
  await field(page, 'title').fill(title);
  await field(page, 'system').fill('Fate');
  await field(page, 'summary').fill('Una aventura de prueba entre picos nevados para comprobar la portada de la campaña.');
  await field(page, 'tone').fill('Aventura');
  await field(page, 'city').selectOption('Guaymallén');
  await field(page, 'location').selectOption('Discord');
  await field(page, 'date').fill('2027-01-23');
  await field(page, 'time').fill('18:00');
  await field(page, 'schedule').fill('Sábados a las 18');
  const input = page.getByLabel(coverLabel);
  await input.setInputFiles({name:'invalido.jpg', mimeType:'image/jpeg', buffer:Buffer.from('invalid JPEG')});
  await expect(page.getByRole('alert')).toContainText('No pudimos abrir');
  await expect(field(page, 'title')).toHaveValue(title);

  await input.setInputFiles({name:'cordillera.jpg', mimeType:'image/jpeg', buffer:wide});
  await expect(page.getByAltText('Vista previa de la portada')).toBeVisible();
  await snapshots(page.locator('.game-cover-field'), 'formulario');
  const submit = page.getByRole('button', {name:'Publicar partida', exact:true});
  let release!: () => void;
  const hold = new Promise<void>(resolve => release = resolve);
  const interruption = async (route: import('@playwright/test').Route) => {
    await hold;
    await route.abort().catch(() => undefined);
  };
  await page.route(coverRoute, interruption);
  await submit.click();
  await expect(page.getByRole('progressbar')).toBeVisible();
  await page.getByRole('button', {name:'Cancelar carga'}).click();
  release();
  await page.unroute(coverRoute, interruption);
  await expect(page.getByRole('alert')).toContainText('Carga cancelada');
  await expect(field(page, 'title')).toHaveValue(title);
  await expect(page.getByAltText('Vista previa de la portada')).toBeVisible();

  await submit.click();
  await expect(page).toHaveURL(/mis-partidas/);
  const gamesURL = api + '/apps-script?action=games';
  const rows = (await (await request.get(gamesURL)).json()).data;
  const game = rows.find((row: {titulo: string}) => row.titulo === title);
  expect(game.portada_version).toMatch(/^[a-f\d]{32}$/);
  expect(JSON.stringify(rows)).not.toMatch(/portada_previa|portada_tarjeta|portada_detalle_/);
  const gameId = game.partida_id;
  const editRoute = `/mis-partidas/${gameId}/editar`;
  const coverUrl = (variant: string, version = game.portada_version) =>
    `/api/game-cover?gameId=${gameId}&version=${version}&variant=${variant}`;
  const file = {name:'cordillera.jpg', mimeType:'image/jpeg', buffer:wide};
  const uploadHeaders = (idToken: string) => ({
    Authorization: 'Bearer ' + idToken, 'X-Cumbre-Game': gameId,
    'X-Cumbre-Upload': randomUUID(), 'Content-Type': 'application/octet-stream'
  });
  const forbidden = await page.request.post('/api/game-cover', { headers: uploadHeaders(other.idToken), data: wide });
  expect(forbidden.status()).toBe(403);
  const invalid = await page.request.post('/api/game-cover', { headers: uploadHeaders(owner.idToken), data: Buffer.from('fake JPEG') });
  expect(invalid.status()).toBe(422);
  expect((await page.request.post('/api/game-cover', { headers: uploadHeaders(owner.idToken), data: Buffer.alloc(4 * 1024 * 1024 + 1) })).status()).toBe(413);

  const visitor = await browser.newContext({
    viewport: portrait, isMobile, hasTouch: isMobile, colorScheme: 'dark', deviceScaleFactor: 1
  });
  try {
    const visit = await visitor.newPage();
    await visit.goto('/partidas');
    const card = visit.locator('app-game-card').filter({hasText:title});
    await card.locator('.card-cover').scrollIntoViewIfNeeded();
    await expect(card.locator('.card-cover')).toHaveJSProperty('complete', true);
    await expect(card.getByRole('link', {name:'Ver aventura'})).toBeVisible();
    await expect(card.getByRole('button', {name:'Compartir ' + title})).toBeVisible();
    const heights = new Map<string, number>();
    for (const [direction, viewport] of views) {
      await visit.setViewportSize(viewport);
      await card.locator('.card-art').scrollIntoViewIfNeeded();
      await expect(card.locator('.card-cover')).not.toHaveJSProperty('naturalWidth', 0);
      await capture(card, 'tarjeta-' + direction);
      heights.set(direction, (await card.boundingBox())!.height);
    }
    await visit.setViewportSize(portrait);
    await card.getByRole('link', {name:'Ver aventura'}).click();
    await visit.reload();
    await expect(visit).toHaveURL('/partidas/' + gameId);
    await expect(visit.locator('.masthead-cover')).not.toHaveJSProperty('naturalWidth', 0);
    await snapshots(visit.locator('.game-masthead'), 'detalle');
    if (isMobile) {
      const share = visit.getByRole('button', {name:'Compartir partida'});
      await share.click();
      await visit.setViewportSize(views[1][1]);
      const actions = visit.getByRole('menu', {name:'Opciones para compartir'});
      await expect(actions.getByRole('menuitem', {name:/WhatsApp/})).toBeInViewport();
      await actions.getByRole('menuitem', {name:'Cerrar opciones para compartir'}).click();
      await expect(actions).toBeHidden();
      await visit.setViewportSize(portrait);
    }

    const sizes: Record<string, number> = { original: file.buffer.length };
    for (const [variant, limit] of [['card', 27], ['hero', 105]] as const) {
      const result = await visit.request.get(coverUrl(variant));
      expect(result.status()).toBe(200);
      expect(result.headers()['cache-control']).toBe('private, no-store');
      expect(result.headers()['content-type']).toBe('image/webp');
      const bytes = await result.body();
      expect(bytes.length).toBeLessThanOrEqual(limit * 1024);
      const meta = await sharp(bytes).metadata();
      expect(meta.exif).toBeUndefined();
      expect(meta.xmp).toBeUndefined();
      sizes[variant] = bytes.length;
    }
    sizes.fallbackCard = (await readFile('src/assets/branding/tabletop-detail.webp')).length;
    sizes.fallbackHero = (await readFile('src/assets/branding/game-detail-real.webp')).length;

    await page.goto(editRoute);
    await expect(page.getByAltText('Vista previa de la portada')).toHaveAttribute('src', /^data:image\/webp/);
    await input.setInputFiles({name:'vertical.png', mimeType:'image/png', buffer:tall});
    await expect(page.getByAltText('Vista previa de la portada')).toHaveAttribute('src', /^blob:/);
    const save = page.getByRole('button', {name:'Guardar cambios',exact:true});
    const breakNetwork = (route: import('@playwright/test').Route) => route.abort();
    await page.route(coverRoute, breakNetwork);
    await save.click();
    await expect(page.getByRole('alert')).toContainText('Se interrumpió la carga');
    await page.unroute(coverRoute, breakNetwork);
    expect((await visit.request.get(coverUrl('hero'))).status()).toBe(200);

    await save.click();
    await expect(page).toHaveURL(/mis-partidas/);
    const latest = (await (await request.get(gamesURL)).json()).data.find((row:{partida_id:string}) => row.partida_id === gameId);
    expect(latest.portada_version).not.toBe(game.portada_version);
    expect((await visit.request.get(coverUrl('hero'))).status()).toBe(404);
    await visit.reload();
    await expect(visit.locator('.masthead-cover')).not.toHaveJSProperty('naturalHeight', 0);
    await visit.goto('/partidas');
    for (const [direction, viewport] of views) {
      await visit.setViewportSize(viewport);
      await card.locator('.card-art').scrollIntoViewIfNeeded();
      await expect(card.locator('.card-cover')).not.toHaveJSProperty('naturalWidth', 0);
      expect((await card.boundingBox())!.height).toBe(heights.get(direction));
    }

    await visit.route(coverRoute, route => route.fulfill({status:404}));
    await visit.reload();
    await card.locator('.card-art').scrollIntoViewIfNeeded();
    await expect(card.locator('.card-cover')).toHaveCount(0);
    await expect(card.locator('.card-art')).toHaveCSS('background-image', /tabletop-detail/);
    await visit.unroute(coverRoute);

    await request.post(api + '/advance-cache-clock');
    await request.post(api + '/advance-cache-clock');
    await page.goto(editRoute);
    await page.getByRole('button', {name:'Quitar portada'}).click();
    await save.click();
    await expect(page).toHaveURL(/mis-partidas/);
    expect((await visit.request.get(coverUrl('hero', latest.portada_version))).status()).toBe(404);
    await visit.goto('/partidas');
    for (const [direction, viewport] of views) {
      await visit.setViewportSize(viewport);
      await expect(card.locator('.card-cover')).toHaveCount(0);
      expect((await card.boundingBox())!.height).toBe(heights.get(direction));
    }
    await visit.goto('/partidas/PRT-DEMO-BASE');
    await expect(visit.locator('.game-masthead')).toHaveCSS('background-image', /game-detail-real/);
    await info.attach('cover-metrics', {body:JSON.stringify({sizes,cardHeight:Object.fromEntries(heights)},null,2),contentType:'application/json'});
  } finally {
    await visitor.close();
  }
});
