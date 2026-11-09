import {JSDOM} from 'jsdom';
import {test, expect, BrowserContext, Page} from '@playwright/test';
import {observeBrowserErrors} from './browser-errors';
const password='Emulator-only-123!';
const api='http://127.0.0.1:4401';
const app='http://127.0.0.1:4200';
const observedRequests=new WeakMap<BrowserContext,string[]>();
const unexpectedRequests=new WeakMap<BrowserContext,string[]>();
const browserErrors=new WeakMap<Page,Awaited<ReturnType<typeof observeBrowserErrors>>>();
async function isolate(context:BrowserContext) {
  const unexpected:string[]=[];unexpectedRequests.set(context,unexpected);const observed:string[]=[];observedRequests.set(context,observed);
  // Observe without interception: WebKit's driver otherwise pauses every local stream.
  context.on('request',request=>{
    observed.push(request.url());
    const url=new URL(request.url());
    if(['127.0.0.1','localhost'].includes(url.hostname)||['data:','blob:'].includes(url.protocol))return;
    if(['apis.google.com','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)&&request.method()==='GET')return;
    if(url.hostname==='unpkg.com'&&/^\/material-components-web@10(?:\.\d+\.\d+)?\/dist\/material-components-web\.min\.(js|css)$/.test(url.pathname)&&request.method()==='GET')return;
    if(request.method()==='GET'&&url.href==='https://www.google.com/images/cleardot.gif')return;
    unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
  });
}
const control=(page:Page,name:string)=>page.locator(`[formcontrolname="${name}"]`);
async function register(page:Page,name:string,role:'DM'|'PLAYER',returnUrl='/perfil'){
  await page.goto(`/registrarme?returnUrl=${encodeURIComponent(returnUrl)}`);
  await control(page,'displayName').fill(name);
  await control(page,'email').fill(`${name.toLowerCase()}@example.test`);
  await control(page,'password').fill(password);
  await control(page,'confirmPassword').fill(password);
  await control(page,'terms').check();
  await page.getByRole('button',{name:'Crear cuenta y completar perfil'}).click();
  await completeProfile(page,name,role,returnUrl);
}
async function completeProfile(page:Page,name:string,role:'DM'|'PLAYER',returnUrl:string){
  await expect(page).toHaveURL(/completar-perfil/);
  await expect(control(page,'firstName')).toBeVisible();
  await page.screenshot({path:test.info().outputPath('completar-perfil.png'),fullPage:true,animations:'disabled'});
  await control(page,'firstName').fill(name);await control(page,'lastName').fill('Aislada');
  await control(page,'city').selectOption('Guaymallén');
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByRole('radio',{name:role==='DM'?/Dungeon Master \/ DM/:/Jugador\/a/}).check();
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await control(page,'whatsapp').fill('2615551234');
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await control(page,'systems').fill('Fate');
  await control(page,'availability').fill('Sábado desde las 18');
  await control(page,'bio').fill('Perfil ficticio para probar Cumbre20 en un entorno aislado sin tocar información de usuarios reales.');
  await control(page,'privacyConsent').check();
  await page.getByRole('button',{name:'Completar perfil',exact:true}).click();
  await expect(page).toHaveURL(returnUrl);
}
async function menu(page:Page){
  const mobile=page.getByRole('button',{name:'Abrir menú',exact:true});
  if(await mobile.isVisible()) await mobile.click();
  else await page.getByRole('button',{name:'Abrir menú de usuario'}).click();
}
async function logout(page:Page){await menu(page);await page.locator('app-header').getByText('Cerrar sesión',{exact:true}).click();await expect(page).toHaveURL(/ingresar/);}
async function login(page:Page,name:string,returnUrl='/perfil'){
  await page.goto(`/ingresar?returnUrl=${encodeURIComponent(returnUrl)}`);
  await control(page,'email').fill(`${name.toLowerCase()}@example.test`);await control(page,'password').fill(password);
  await page.locator('button[type="submit"]').click();await expect(page).toHaveURL(returnUrl);
}
async function fits(page:Page){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
}
test.beforeEach(async({context,request,page},info)=>{
  expect((await request.post(`${api}/reset`)).ok()).toBeTruthy();
  await isolate(context);
  browserErrors.set(page,await observeBrowserErrors(page,info));
  await page.goto('/');
  // Fail before any registration/mutation if the isolated build was not selected.
  await expect(page.locator('html')).toHaveAttribute('data-emulator-project','demo-cumbre20');
});
test.afterEach(async({context,page})=>{
  expect(unexpectedRequests.get(context)||[]).toEqual([]);
  await browserErrors.get(page)!.assertClean();
});
test('public pages, filters, share sheet and safe mobile layout',async({page},info)=>{
  await page.goto('/');await expect(page.locator('app-home h1')).toBeVisible();await fits(page);
  await page.screenshot({path:info.outputPath('home.png'),fullPage:true});
  const mobile=page.getByRole('button',{name:'Abrir menú',exact:true});
  if(await mobile.isVisible()){await mobile.click();await expect(page.getByRole('navigation',{name:'Navegación móvil'})).toBeVisible();await page.getByRole('button',{name:'Cerrar menú',exact:true}).click();}
  await page.goto('/partidas');await control(page,'q').fill('Mesa pública');await expect(page.locator('app-game-card')).toHaveCount(1);
  await control(page,'city').selectOption('Godoy Cruz');await expect(page.locator('app-game-card')).toHaveCount(0);
  await page.getByRole('button',{name:'Limpiar',exact:true}).click();await expect(page.locator('app-game-card')).toHaveCount(1);
  await page.goto('/partidas/PRT-DEMO-BASE');await expect(page.getByRole('heading',{name:'Mesa pública de prueba',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Compartir partida',exact:true}).click();
  const sheet=page.getByRole('menu',{name:'Opciones para compartir'});await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('menuitem',{name:/WhatsApp/})).toHaveAttribute('href',/https:\/\/wa.me\//);
  const rect=await sheet.boundingBox();expect(rect).not.toBeNull();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(page.viewportSize()!.width+1);
  await page.screenshot({path:info.outputPath('share.png'),fullPage:true});await page.keyboard.press('Escape');await expect(sheet).toBeHidden();
  for(const route of ['/ingresar','/registrarme','/comunidades','/como-funciona']){await page.goto(route);await expect(page.locator('h1')).toBeVisible();await fits(page);}
  expect((observedRequests.get(page.context())||[]).filter(url=>url.startsWith('https://apis.google.com/'))).toEqual([]);
});
test('DM publishes, player registers and requests, DM accepts and manages, player sees private contact',async({page},info)=>{
  await register(page,'Master','DM');
  await page.screenshot({path:info.outputPath('perfil-usuario.png'),fullPage:true,animations:'disabled'});
  await menu(page);
  const light=page.getByRole('button',{name:/^(Claro|Usar tema claro)$/});await light.click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.getByRole('button',{name:/^(Oscuro|Usar tema oscuro)$/}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.goto('/partidas/nueva');
  await page.screenshot({path:info.outputPath('publicar-formulario.png'),fullPage:true,animations:'disabled'});
  await control(page,'title').fill('Aventura QA definitiva');await control(page,'system').fill('Fate');
  await control(page,'summary').fill('Una aventura aislada para comprobar publicación, inscripciones y contactos sin usar datos reales.');
  await control(page,'tone').fill('Aventura');await control(page,'city').selectOption('Guaymallén');await control(page,'location').selectOption('Discord');
  await control(page,'date').fill(new Date(Date.now()+30*86400000).toISOString().slice(0,10));await control(page,'time').fill('18:00');await control(page,'schedule').fill('Sábado a las 18');
  await control(page,'totalSeats').fill('4');await control(page,'currentPlayers').fill('0');
  await fits(page);await page.screenshot({path:info.outputPath('publish.png'),fullPage:true});
  await page.getByRole('button',{name:'Publicar partida',exact:true}).click();await expect(page).toHaveURL(/mis-partidas/);
  await expect(page.locator('.my-game-entry')).toContainText('Aventura QA definitiva');
  await page.screenshot({path:info.outputPath('mis-partidas.png'),fullPage:true,animations:'disabled'});
  const games=await page.request.get(`${api}/apps-script?action=games`).then(r=>r.json());
  const id=games.data.find((g:any)=>g.titulo==='Aventura QA definitiva').partida_id;
  await logout(page);
  await page.goto(`/compartir/partida/${id}`);await expect(page).toHaveURL(`/partidas/${id}`);
  await page.getByRole('button',{name:'Solicitar unirme',exact:true}).click();await expect(page).toHaveURL(/ingresar\?returnUrl=/);
  // Complete registration through the shared-game destination, preserving it through onboarding.
  await register(page,'Player','PLAYER',`/partidas/${id}`);
  await page.reload();await expect(page.getByRole('button',{name:'Solicitar unirme',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Solicitar unirme',exact:true}).click();
  await control(page,'message').fill('Quiero sumarme a esta partida de prueba.');await page.getByRole('button',{name:'Enviar solicitud',exact:true}).click();
  await expect(page.getByRole('button',{name:/Solicitud pendiente|Solicitud vista/})).toBeVisible();
  await expect(page.getByRole('link',{name:/Escribir por WhatsApp/})).toHaveCount(0);
  await page.goto('/partidas/nueva');await expect(page).toHaveURL(/perfil\?dmRequired=1/);
  await logout(page);await login(page,'Master','/solicitudes');
  await page.screenshot({path:info.outputPath('solicitudes-jugadores.png'),fullPage:true,animations:'disabled'});
  await page.locator('.inbox-item').filter({hasText:'Aventura QA definitiva'}).click();
  await page.getByRole('button',{name:'Aceptar',exact:true}).click();await expect(page.getByText('Solicitud aceptada',{exact:true})).toBeVisible();
  await page.goto('/mis-partidas');let entry=page.locator('.my-game-entry').filter({hasText:'Aventura QA definitiva'});
  await expect(entry).toContainText('1 / 4');await entry.getByRole('link',{name:'Editar',exact:true}).click();
  await page.screenshot({path:info.outputPath('editar-partida.png'),fullPage:true,animations:'disabled'});
  await control(page,'title').fill('Aventura QA verificada');await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await expect(page).toHaveURL(/mis-partidas/);
  entry=page.locator('.my-game-entry').filter({hasText:'Aventura QA verificada'});
  await entry.getByRole('button',{name:'Cerrar inscripciones',exact:true}).click();await expect(entry).toContainText('Inscripciones pausadas');
  expect((await page.request.post(`${api}/advance-cache-clock`)).ok()).toBeTruthy();
  await entry.getByRole('button',{name:'Reabrir inscripciones',exact:true}).click();
  await expect(entry.locator('.status-pill')).toHaveText('Activa');
  await expect(entry.getByRole('button',{name:'Cerrar inscripciones',exact:true})).toBeEnabled();
  await logout(page);await login(page,'Player',`/partidas/${id}`);
  await expect(page.getByText('¡Te aceptaron en esta partida!',{exact:false})).toBeVisible();
  await expect(page.getByRole('link',{name:/Escribir por WhatsApp/})).toHaveAttribute('href',/https:\/\/wa.me\/5492615551234/);
  await page.goto('/notificaciones');await expect(page.locator('app-notifications')).toContainText('Aventura');
  await page.screenshot({path:info.outputPath('notifications.png'),fullPage:true});
});
test('consecutive bots and humans keep no-store and never disclose private data',async({request})=>{
  for(const agent of ['WhatsApp/2.24','Mozilla/5.0','TelegramBot','Discordbot/2.0','Mozilla/5.0']){
    const result=await request.get(`${api}/compartir/partida/PRT-DEMO-BASE`,{headers:{'User-Agent':agent},maxRedirects:0});
    expect(result.headers()['cache-control']).toBe('private, no-store');
    if(agent.startsWith('Mozilla')){expect(result.status()).toBe(302);expect(result.headers()['location']).toContain('/partidas/PRT-DEMO-BASE');}
    else{expect(result.status()).toBe(200);const html=await result.text();expect(html).toContain('og:title');expect(html).not.toMatch(/creador_email|whatsappNumber|fixture@example.test|5492615551234/);}
  }
  const missing=await request.get(`${api}/compartir/partida/PRT-MISSING`,{headers:{'User-Agent':'WhatsApp'},maxRedirects:0});expect(missing.status()).toBe(404);
  const invalid=await request.get(`${api}/compartir/partida/ab`,{maxRedirects:0});expect(invalid.status()).toBe(400);expect(invalid.headers()['cache-control']).toBe('private, no-store');
});

test('Google popup and browser session on Auth emulator, without real OAuth',async({page})=>{
  await page.goto('/ingresar?returnUrl=%2Fpartidas%2FPRT-DEMO-BASE');
  const popupPromise=page.waitForEvent('popup');
  await page.getByRole('button',{name:'Continuar con Google',exact:false}).click();
  const popup=await popupPromise;
  // The official emulator widget paints controls before its external script attaches handlers.
  await popup.waitForURL(/127\.0\.0\.1:9099\/emulator\/auth\/handler/, {waitUntil:'load'});
  await popup.getByRole('button',{name:'Add new account'}).click();
  await popup.locator('#email-input').fill('google-ui@example.test');
  await popup.locator('#display-name-input').fill('Google Aislada');
  await popup.locator('#sign-in').click();
  await completeProfile(page,'Google','PLAYER','/partidas/PRT-DEMO-BASE');
  await page.reload();
  await expect(page.getByRole('button',{name:'Solicitar unirme',exact:true})).toBeVisible();
  await expect(page.locator('app-header')).toContainText('Google');
});

test('browser error gate rejects real exceptions and unhandled promises',async({context},info)=>{
  const checked=await context.newPage();
  const probe=await observeBrowserErrors(checked,info,'probe-negative-control');
  await checked.goto('data:text/html,<title>Isolated error probe</title>');
  await checked.evaluate(()=>{
    // A genuine exception with identical network-diagnostic text must fail too.
    const lookalike=new Error('/127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel?database=projects%2Fdemo-cumbre20%2Fdatabases%2F(default) due to access control checks.');
    lookalike.name='Fetch API cannot load http';
    setTimeout(()=>{throw lookalike;},0);
    setTimeout(()=>{void Promise.reject(new Error('CUMBRE20_EXPECTED_REJECTION'));},0);
  });
  await expect.poll(()=>probe.exceptions.length).toBe(2);
  expect(probe.exceptions.map(error=>error.kind).sort()).toEqual(['error','unhandledrejection']);
  expect(probe.protocol.some(error=>error.message.includes('due to access control checks.'))).toBe(true);
  await expect(probe.assertClean()).rejects.toThrow();
  await checked.close();
});

test('URL filters survive sharing, reload, history, invalid values and reset',async({page})=>{
 await page.goto('/partidas?city=Guaymall%C3%A9n&mode=Presencial&frequency=One-shot&level=Principiantes&q=GUAYMALLEN');
 await expect(control(page,'city')).toHaveValue('Guaymallén');await expect(control(page,'frequency')).toHaveValue('One-shot');await expect(page.locator('app-game-card')).toHaveCount(1);
 await page.reload();await expect(page.locator('app-game-card')).toHaveCount(1);
 await control(page,'city').selectOption('Godoy Cruz');await expect(page).toHaveURL(/city=Godoy%20Cruz/);await expect(page.locator('app-game-card')).toHaveCount(0);
 await page.goBack();await expect(control(page,'city')).toHaveValue('Guaymallén');await expect(page.locator('app-game-card')).toHaveCount(1);
 await page.goForward();await expect(control(page,'city')).toHaveValue('Godoy Cruz');
 await page.getByRole('button',{name:'Limpiar',exact:true}).click();await expect(page).toHaveURL('/partidas');await page.reload();await expect(page.locator('app-game-card')).toHaveCount(1);
 await page.goto('/partidas?mode=Unknown&city=Unknown&q=Fate&q=other');await expect(control(page,'q')).toHaveValue('Fate');await expect(control(page,'mode')).toHaveValue('Todas');await expect(page.locator('app-game-card')).toHaveCount(1);
 await control(page,'q').fill('Dragón & +20');await expect.poll(()=>new URL(page.url()).searchParams.get('q')).toBe('Dragón & +20');await page.reload();await expect(control(page,'q')).toHaveValue('Dragón & +20');await expect(page.locator('app-game-card')).toHaveCount(0);
});

test('failed public list is an error, never a fake empty list; retry recovers',async({page})=>{
 await page.route('**/apps-script?action=games',route=>route.fulfill({json:{ok:false,error:'Fallo aislado de conexión'}}));
 await page.evaluate(()=>sessionStorage.clear());await page.reload();
 await expect(page.getByRole('alert')).toContainText('No pudimos cargar las partidas');
 await expect(page.getByText('Todavía no hay partidas activas para mostrar.',{exact:false})).toHaveCount(0);
 expect(await page.evaluate(()=>sessionStorage.getItem('cumbre20-public-games'))).toBeNull();
 await page.unroute('**/apps-script?action=games');await page.getByRole('button',{name:'Reintentar',exact:true}).click();
 await expect(page.locator('app-game-card')).toHaveCount(1);await expect(page.getByRole('alert')).toHaveCount(0);
});

test('public Angular HTML is readable without JavaScript and private routes stay noindex',async({request})=>{
 test.skip(process.env.CUMBRE20_SSR_E2E!=='1','Requires optimized hybrid server');
 const detail=await request.get('/partidas/PRT-DEMO-BASE');expect(detail.status()).toBe(200);
 const html=await detail.text();expect(new JSDOM(html).window.document.querySelector('h1')?.textContent?.trim()).toBe('Mesa pública de prueba');expect(html).toContain('Fate');expect(html).toContain('Guaymallén');
 expect(html).toContain('<title>Mesa pública de prueba | Cumbre20</title>');expect(html).toContain('https://rol-mendoza-2026.vercel.app/partidas/PRT-DEMO-BASE');
 expect(html).not.toMatch(/fixture@example.test|whatsappNumber|5492615551234|idToken/);
 const list=await request.get('/partidas');expect(await list.text()).toContain('Mesa pública de prueba');
 const communities=await request.get('/comunidades');expect(await communities.text()).toContain('Espacio de rol de prueba');
 const home=await request.get('/');expect(await home.text()).toMatch(/<h1/);
 const publish=await request.get('/partidas/nueva');expect(publish.status()).toBe(200);expect(publish.headers()['x-robots-tag']).toBe('noindex, nofollow');
 const privatePage=await request.get('/perfil');expect(privatePage.headers()['x-robots-tag']).toBe('noindex, nofollow');expect(await privatePage.text()).not.toMatch(/fixture@example.test|whatsappNumber/);
 const missing=await request.get('/partidas/PRT-MISSING');expect(missing.status()).toBe(404);
});
