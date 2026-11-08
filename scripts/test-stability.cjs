const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const routes = read('src/app/app-routing.module.ts');
const login = read('src/app/pages/login/login.component.ts');
const register = read('src/app/pages/register/register.component.ts');
const completeProfile = read('src/app/pages/complete-profile/complete-profile.component.ts');
const auth = read('src/app/core/services/auth.service.ts');
const rules = read('firestore.rules');
const appsScript = read('google-apps-script/Code.gs');
const vercel = JSON.parse(read('vercel.json'));
const angular = JSON.parse(read('angular.json'));

// Rutas privadas y de DM.
for (const route of ['jugadores', 'mis-partidas', 'mis-solicitudes', 'notificaciones', 'perfil']) {
  assert.match(routes, new RegExp(`path: '${route}'[^\n]+AuthGuard`), `${route} debe requerir autenticación`);
}
for (const route of ['partidas/nueva', 'solicitudes']) {
  assert.match(routes, new RegExp(`path: '${route}'[^\n]+DmGuard`), `${route} debe requerir rol DM`);
}

// El destino posterior al acceso sólo acepta rutas internas.
for (const [name, source] of [['login', login], ['registro', register], ['perfil', completeProfile]]) {
  assert.match(source, /startsWith\('\/'\)\s*&&\s*!requested\.startsWith\('\/\/'\)/, `${name} debe rechazar redirecciones externas`);
}
assert.match(auth, /sendEmailVerification\(/, 'el registro por correo debe solicitar verificación');
assert.match(auth, /sendPasswordResetEmail\(/, 'debe existir recuperación de contraseña');

// Datos privados y escrituras de negocio se protegen fuera de la UI.
assert.match(rules, /match \/userPrivate\/\{userId\}[\s\S]*?allow list: if false;/);
assert.match(rules, /match \/gameJoinRequests\/\{requestId\}[\s\S]*?allow create, delete: if false;/);
assert.match(rules, /match \/gameParticipants\/\{participantId\}[\s\S]*?allow create, update, delete: if false;/);
assert.match(rules, /match \/contactGrants\/\{targetUid\}\/viewers\/\{viewerUid\}[\s\S]*?allow read, write: if false;/);
assert.match(rules, /match \/conversations\/\{document=\*\*\}[\s\S]*?allow read, write: if false;/);

// Apps Script autentica antes de despachar acciones y limita abuso.
const verifyIndex = appsScript.indexOf('const user = verifyFirebaseToken_(idToken);');
const switchIndex = appsScript.indexOf('switch (action)', appsScript.indexOf('function doPost'));
assert.ok(verifyIndex > -1 && switchIndex > verifyIndex, 'Apps Script debe autenticar antes de ejecutar acciones');
assert.match(appsScript, /rateLimit_\(action, user\.uid\)/);
assert.match(appsScript, /assertOwner_\(/);
assert.match(appsScript, /function safeCell_\(/);
assert.match(appsScript, /function publicGame_\([\s\S]*?pick_\(row,[\s\S]*?\);[\s\S]*?return safe;/);
const publicGameBlock = appsScript.slice(appsScript.indexOf('function publicGame_'), appsScript.indexOf('function ownedGame_'));
assert.doesNotMatch(publicGameBlock, /creador_email|telefono|whatsapp/i, 'la API pública no debe exponer contacto privado');

// Encabezados mínimos y navegación SPA.
const headers = vercel.headers.flatMap(entry => entry.headers || []);
const header = key => headers.find(item => item.key.toLowerCase() === key.toLowerCase())?.value || '';
assert.match(header('Content-Security-Policy'), /frame-ancestors 'none'/);
assert.equal(header('X-Content-Type-Options'), 'nosniff');
assert.equal(header('X-Frame-Options'), 'DENY');
assert.match(header('Referrer-Policy'), /strict-origin/);
assert.ok(vercel.rewrites.some(rule => rule.source === '/compartir/partida/:gameId'));

// Producción no debe publicar source maps y el logo optimizado debe existir.
assert.notEqual(angular.projects['rol-mendoza'].architect.build.configurations.production.sourceMap, true);
const logo = path.join(root, 'src/assets/cumbre20-logo-256.webp');
const favicon = path.join(root, 'src/assets/cumbre20-favicon-64.png');
assert.ok(fs.existsSync(logo) && fs.statSync(logo).size < 50_000, 'el logo debe estar optimizado');
assert.ok(fs.existsSync(favicon) && fs.statSync(favicon).size < 25_000, 'el favicon debe estar optimizado');

// Angular escapa interpolaciones; no se permiten bypasses HTML en la aplicación.
const sourceFiles = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (/\.(ts|html)$/.test(entry.name)) sourceFiles.push(full);
  }
}
collect(path.join(root, 'src/app'));
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /\[innerHTML\]|bypassSecurityTrust(?:Html|Url|ResourceUrl)/, `${path.relative(root, file)} contiene un bypass de sanitización`);
}

console.log('Stability and security regression tests passed.');
