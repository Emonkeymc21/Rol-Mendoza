const sharp = require('sharp');
const { createHmac } = require('node:crypto');
const { Buffer } = require('node:buffer');

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbxlil_efKyghmU4FhnDhP_LvvUZtcor_g4L9UOhJsa0qo-i-YZoo9ek1VN69HTcd6zLnQ/exec';
const MAX_UPLOAD = 4 * 1024 * 1024;
const GAME_ID = /^[A-Za-z0-9_-]{3,80}$/;
const VERSION = /^[a-f0-9]{24}$/;
const LIMITS = {
  detail: { width: 1440, height: 1080, bytes: 90_000 },
  card: { width: 480, height: 480, bytes: 27_000 }
};

class CoverError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function appsScript(method, input, idToken) {
  const url = new URL(APPS_SCRIPT_URL);
  if (method === 'GET') Object.entries(input).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    method,
    signal: AbortSignal.timeout(8000),
    ...(method === 'POST' && {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ apiVersion: '8.0.0', action: 'authorizeCover', payload: input, idToken })
    })
  });
  if (!response.ok) throw new Error('Apps Script unavailable');
  return response.json();
}

async function uploadBuffer(req) {
  if (Number(req.headers['content-length']) > MAX_UPLOAD) throw new CoverError(413, 'Elegí una imagen de hasta 4 MB.');
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > MAX_UPLOAD) throw new CoverError(413, 'Elegí una imagen de hasta 4 MB.');
    return req.body;
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_UPLOAD) throw new CoverError(413, 'Elegí una imagen de hasta 4 MB.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

async function optimize(input, { width, height, bytes }) {
  for (const scale of [1, 0.8, 0.6]) {
    const image = input.clone()
      .autoOrient()
      .resize(Math.round(width * scale), Math.round(height * scale), { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#1d1518' })
      .toColourspace('srgb');
    for (const quality of [79, 64, 49, 34]) {
      const output = await image.clone().webp({ quality, effort: 3 }).toBuffer();
      if (output.length <= bytes) return output.toString('base64');
    }
  }
  throw new CoverError(422, 'No pudimos reducir esta imagen. Probá con otra de menor resolución.');
}

async function prepare(req, res, gameId) {
  const token = /^Bearer (.{1,5000})$/.exec(req.headers.authorization ?? '')?.[1];
  if (!token) throw new CoverError(401, 'Iniciá sesión para cargar una portada.');
  if (gameId && !GAME_ID.test(gameId)) throw new CoverError(400, 'La partida no es válida.');
  if (Number(req.headers['content-length']) > MAX_UPLOAD) throw new CoverError(413, 'Elegí una imagen de hasta 4 MB.');
  const key = process.env.CUMBRE20_COVER_SIGNING_KEY;
  if (!key) throw new CoverError(503, 'La carga de portadas todavía no está disponible.');
  const permission = await appsScript('POST', { gameId }, token);
  if (!permission.ok) throw new CoverError(403, permission.error || 'No tenés permiso para cargar esta portada.');

  const input = await uploadBuffer(req);
  let detail;
  let card;
  try {
    const image = sharp(input, { limitInputPixels: 25_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) > 1) {
      throw new CoverError(415, 'Elegí una imagen JPG, PNG o WebP sin animación.');
    }
    [detail, card] = await Promise.all([optimize(image, LIMITS.detail), optimize(image, LIMITS.card)]);
  } catch (error) {
    if (error instanceof CoverError) throw error;
    throw new CoverError(422, 'No pudimos abrir la imagen. Revisá el formato o elegí otra foto.');
  }
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const signature = createHmac('sha256', key)
    .update([permission.data.uid, gameId, expires, detail, card].join('\n'))
    .digest('hex');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ detail, card, expires, signature }));
}

async function serve(res, query, gameId) {
  const { version, variant } = query;
  if (!GAME_ID.test(gameId) || !VERSION.test(version ?? '') || !Object.hasOwn(LIMITS, variant ?? '')) {
    throw new CoverError(404, 'Portada no disponible.');
  }
  const result = await appsScript('GET', { action: 'cover', gameId, version, variant });
  if (!result.ok) throw new CoverError(404, 'Portada no disponible.');
  const image = Buffer.from(result.data.image, 'base64');
  if (!image.length || image.length > LIMITS[variant].bytes) throw new CoverError(404, 'Portada no disponible.');
  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Content-Length', String(image.length));
  res.end(image);
}

module.exports = async function gameCover(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const query = req.query || Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
  const gameId = typeof query.gameId === 'string' ? query.gameId : '';
  try {
    if (req.method === 'POST') return await prepare(req, res, gameId);
    if (req.method === 'GET') return await serve(res, query, gameId);
    res.setHeader('Allow', 'GET, POST');
    throw new CoverError(405, 'Método no disponible.');
  } catch (error) {
    if (!(error instanceof CoverError)) console.error('Campaign cover request failed.', error.message);
    res.statusCode = error instanceof CoverError ? error.status : 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error instanceof CoverError ? error.message : 'No pudimos procesar la portada. Intentá nuevamente.' }));
  }
};
