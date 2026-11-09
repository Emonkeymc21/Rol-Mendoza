const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const PROJECT_ID = 'demo-cumbre20';
const GAME_HEADERS = ['partida_id','creada_el','creador_uid','creador_email','titulo','sistema','master_nombre_publico','modalidad','ciudad','zona_plataforma','fecha','hora','dia_horario','frecuencia','cupos_totales','cupos_libres','jugadores_actuales','nivel','edad_requerida','metodo_contacto','tono','descripcion','herramientas_cuidado','estado','publicada','actualizada_el'];
const COMMENT_HEADERS = ['comentario_id','fecha','partida_id','usuario_uid','nombre_publico','comentario','estado','respuesta_admin','fecha_moderacion'];

// Only the Google infrastructure is adapted. Business functions run from Code.gs.
function createAppsScript({ root = path.resolve(__dirname, '../..'), seed = true } = {}) {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') {
    throw new Error('Tests require loopback Auth and Firestore emulators. Production is never an allowed fallback.');
  }
  const sheets = new Map([['PARTIDAS', [GAME_HEADERS]], ['COMENTARIOS', [COMMENT_HEADERS]], ['SOLICITUDES', [[]]]]);
  const cache = new Map();
  let clockOffset = 0;
  let failCommit = false;
  let locked = false;
  const errors = [];
  const range = (grid, row, column, height = 1, width = 1) => ({
    getValues: () => Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => grid[row - 1 + y]?.[column - 1 + x] ?? '')),
    setValues(values) {
      for (let y = 0; y < height; y++) {
        grid[row - 1 + y] ||= [];
        for (let x = 0; x < width; x++) grid[row - 1 + y][column - 1 + x] = values[y][x];
      }
    }
  });
  const sheet = name => {
    const grid = sheets.get(name);
    if (!grid) return null;
    return {
      getDataRange: () => ({ getValues: () => grid.map(row => [...row]) }),
      getLastColumn: () => grid[0].length,
      getLastRow: () => grid.length,
      getRange: (r, c, h, w) => range(grid, r, c, h, w),
      deleteRow: r => grid.splice(r - 1, 1)
    };
  };
  const response = (code, body) => ({ getResponseCode: () => code, getContentText: () => body });
  const fetchGoogle = (url, options = {}) => {
    const parsed = new URL(url);
    let target;
    if (parsed.hostname === 'identitytoolkit.googleapis.com' && parsed.pathname.startsWith('/v1/')) {
      target = `http://127.0.0.1:9099/identitytoolkit.googleapis.com${parsed.pathname}${parsed.search}`;
    } else if (parsed.hostname === 'firestore.googleapis.com' && parsed.pathname.startsWith(`/v1/projects/${PROJECT_ID}/`)) {
      target = `http://127.0.0.1:8080${parsed.pathname}${parsed.search}`;
    } else throw new Error('A test attempted an unapproved external request.');
    if (failCommit && parsed.pathname.endsWith('/documents:commit')) {
      failCommit = false;
      return response(503, JSON.stringify({ error: { message: 'Injected emulator transport failure' } }));
    }
    const args = ['--silent', '--show-error', '--max-time', '10', '-w', '\n%{http_code}', '-X', (options.method || 'get').toUpperCase()];
    if (options.contentType) args.push('-H', `Content-Type: ${options.contentType}`);
    for (const [key, value] of Object.entries(options.headers || {})) args.push('-H', `${key}: ${value}`);
    if (options.payload) args.push('--data-binary', options.payload);
    args.push(target);
    const result = execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 2_000_000 });
    const boundary = result.lastIndexOf('\n');
    return response(Number(result.slice(boundary + 1)), result.slice(0, boundary));
  };
  const context = vm.createContext({
    console: { error: (...args) => errors.push(args.join(' ')), log() {} },
    SpreadsheetApp: { openById: () => ({ getSheetByName: sheet }), flush() {} },
    LockService: { getScriptLock: () => ({ waitLock() { if (locked) throw new Error('Concurrent test lock'); locked = true; }, releaseLock() { locked = false; } }) },
    ScriptApp: { getOAuthToken: () => 'owner' },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (algorithm, value) => crypto.createHash(algorithm).update(value).digest(),
      base64EncodeWebSafe: value => Buffer.from(value).toString('base64url'),
      getUuid: () => crypto.randomUUID(),
      formatDate: date => date.toISOString().replace(/\D/g, '').slice(0, 14)
    },
    CacheService: { getScriptCache: () => ({
      get(key) { const saved = cache.get(key); return saved && saved.until > Date.now() + clockOffset ? saved.value : null; },
      put(key, value, seconds) { cache.set(key, { value, until: Date.now() + clockOffset + seconds * 1000 }); }
    }) },
    UrlFetchApp: { fetch: fetchGoogle }
  });
  const source = fs.readFileSync(path.join(root, 'google-apps-script/Code.gs'), 'utf8');
  if (!source.includes("firebaseProjectId: 'rol-mendoza'")) throw new Error('Review the fixture project substitution before running tests.');
  vm.runInContext(source.replace("firebaseProjectId: 'rol-mendoza'", `firebaseProjectId: '${PROJECT_ID}'`), context, { filename: 'Code.gs' });
  const parse = result => JSON.parse(result.text);
  if (seed) {
    context.createGame_({ title: 'Mesa pública de prueba', system: 'Fate', location: 'A coordinar', mode: 'Presencial', city: 'Guaymallén', schedule: 'Sábado 18:00', frequency: 'One-shot', totalSeats: 4, currentPlayers: 0, level: 'Principiantes bienvenidos', tone: 'Aventura', summary: 'Una aventura ficticia y aislada para verificar los flujos de Cumbre20.', safety: 'Acuerdos previos de mesa' }, { firebase_uid: 'fixture-dm', email: 'fixture@example.test', nombre_publico: 'DM de prueba' }, { city: 'Guaymallén' });
    const grid = sheets.get('PARTIDAS');
    grid[1][0] = 'PRT-DEMO-BASE';
  }
  return {
    get: params => parse(context.doGet({ parameter: params })),
    post: body => parse(context.doPost({ postData: { contents: JSON.stringify(body) } })),
    advanceCacheTime: milliseconds => { clockOffset += milliseconds; },
    failNextCommit: () => { failCommit = true; },
    errors,
    sheets
  };
}
module.exports = { createAppsScript, PROJECT_ID };
