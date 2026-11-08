const assert = require('node:assert/strict');
const handler = require('../api/share-game');
const { _test } = handler;

const game = {
  titulo: 'Sombras <del Aconcagua>',
  sistema: 'D&D 5e',
  modalidad: 'Presencial',
  ciudad: 'Godoy Cruz',
  cupos_totales: 5,
  cupos_libres: 3,
  estado: 'ACTIVE',
  creador_email: 'privado@example.com',
  telefono: '5492610000000',
  whatsapp: 'https://wa.me/5492610000000'
};

const html = _test.renderPage({ origin: 'https://cumbre20.test', gameId: 'PRT-123', game });
assert.match(html, /Sombras &lt;del Aconcagua&gt;/);
assert.match(html, /3 lugares disponibles de 5/);
assert.match(html, /property="og:title"/);
assert.doesNotMatch(html, /creatorEmail|telefono|whatsapp/i);
assert.equal(_test.normalizeStatus('Cancelada'), 'cancelada');
assert.equal(_test.escapeHtml('"<script>'), '&quot;&lt;script&gt;');
function responseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    setHeader(name, value) { this.headers[name] = value; },
    end(body = '') { this.body = body; return body; }
  };
}

(async () => {
  const redirect = responseRecorder();
  await handler({ query: { gameId: 'PRT-123' }, headers: { host: 'cumbre20.test', 'user-agent': 'Mozilla/5.0' } }, redirect);
  assert.equal(redirect.statusCode, 302);
  assert.equal(redirect.headers.Location, 'https://cumbre20.test/partidas/PRT-123');

  global.fetch = async () => ({ ok: true, json: async () => ({ ok: true, data: game }) });
  for (const userAgent of ['WhatsApp/2.0', 'TelegramBot/1.0', 'Discordbot/2.0']) {
    const preview = responseRecorder();
    await handler({ query: { gameId: 'PRT-123' }, headers: { host: 'cumbre20.test', 'user-agent': userAgent } }, preview);
    assert.equal(preview.statusCode, 200);
    assert.match(preview.body, /Sombras &lt;del Aconcagua&gt;/);
    assert.match(preview.body, /summary_large_image/);
    assert.doesNotMatch(preview.body, /privado@example\.com|5492610000000|wa\.me/i);
  }

  global.fetch = async () => ({ ok: true, json: async () => ({ ok: true, data: { ...game, estado: 'CANCELLED' } }) });
  const cancelled = responseRecorder();
  await handler({ query: { gameId: 'PRT-123' }, headers: { host: 'cumbre20.test', 'user-agent': 'WhatsApp/2.0' } }, cancelled);
  assert.equal(cancelled.statusCode, 404);
  assert.match(cancelled.body, /Partida no disponible/);
  assert.match(cancelled.body, /noindex,nofollow/);

  global.fetch = async () => ({ ok: false, json: async () => ({}) });
  const missing = responseRecorder();
  await handler({ query: { gameId: 'PRT-404' }, headers: { host: 'cumbre20.test', 'user-agent': 'TelegramBot/1.0' } }, missing);
  assert.equal(missing.statusCode, 404);
  assert.match(missing.body, /Buscar otras partidas/);

  const invalid = responseRecorder();
  await handler({ query: { gameId: '../private' }, headers: { host: 'cumbre20.test' } }, invalid);
  assert.equal(invalid.statusCode, 400);
  console.log('Share preview tests passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
