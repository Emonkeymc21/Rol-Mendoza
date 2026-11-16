const sharp = require('sharp');
const { createHmac } = require('node:crypto');

const URL_APPS_SCRIPT = process.env.APPS_SCRIPT_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbxlil_efKyghmU4FhnDhP_LvvUZtcor_g4L9UOhJsa0qo-i-YZoo9ek1VN69HTcd6zLnQ/exec';
const MAX_UPLOAD = 4 * 1024 * 1024;
const FORMATS = ['jpeg', 'png', 'webp'];
const GAME_ID = /^[A-Za-z0-9_-]{3,80}$/;
const VERSION = /^[a-f0-9]{32}$/;
const UPLOAD_ID = /^[a-f0-9-]{36}$/;
const VARIANTS = { card: { edge: 480, bytes: 27 * 1024 }, hero: { edge: 1440, bytes: 105 * 1024 } };

class CoverError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function appsScript(values, auth) {
  const url = new URL(URL_APPS_SCRIPT);
  const request = { signal: AbortSignal.timeout(15000) };
  if (auth) {
    request.method = 'POST';
    request.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    request.body = JSON.stringify({ apiVersion: '8.0.0', idToken: auth, ...values });
  } else {
    url.search = new URLSearchParams(values);
  }
  const response = await fetch(url, request);
  if (!response.ok) throw new Error('Campaign API unavailable');
  return response.json();
}

async function encode(image, { edge, bytes }) {
  let quality = 82;
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const output = await image.clone().autoOrient().resize(edge, edge, {
      fit: 'inside', withoutEnlargement: true
    }).flatten({ background: '#130e10' }).webp({ quality }).toBuffer();
    if (output.length <= bytes) return output.toString('base64');
    if (quality > 52) quality -= 15;
    else edge = Math.floor(edge * 0.75);
  }
  throw new CoverError(422, 'No pudimos reducir el peso de la imagen. Probá con otra.');
}

async function prepareCover(req) {
  const key = process.env.CUMBRE20_COVER_KEY;
  if (!key) throw new CoverError(503, 'La carga de portadas no está disponible por el momento.');
  const token = /^Bearer ([\w.-]{1,5000})$/.exec(req.headers.authorization || '')?.[1];
  if (!token) throw new CoverError(401, 'Volvé a ingresar para subir la portada.');
  const gameId = req.headers['x-cumbre-game'] || '';
  const uploadId = req.headers['x-cumbre-upload'];
  if ((gameId && !GAME_ID.test(gameId)) || typeof uploadId !== 'string' || !UPLOAD_ID.test(uploadId)) {
    throw new CoverError(400, 'No pudimos identificar la partida.');
  }
  if (Number(req.headers['content-length']) > MAX_UPLOAD) throw new CoverError(413, 'La imagen supera los 4 MB.');
  const access = await appsScript({ action: 'coverAccess', payload: { gameId } }, token);
  if (!access.ok) throw new CoverError(403, access.error || 'No tenés permiso para subir la portada.');
  const source = await readUpload(req);
  if (!source.length) throw new CoverError(422, 'El archivo está vacío.');
  let card, hero;
  try {
    const image = sharp(source, { limitInputPixels: 25_000_000, failOn: 'warning' });
    const { format, pages } = await image.metadata();
    if (!FORMATS.includes(format) || (pages ?? 1) !== 1) {
      throw new CoverError(422, 'Elegí una imagen JPG, PNG o WebP estática.');
    }
    // Re-encoding drops EXIF/GPS, ICC and XMP by default.
    card = await encode(image, VARIANTS.card);
    hero = await encode(image, VARIANTS.hero);
  } catch (error) {
    if (error instanceof CoverError) throw error;
    throw new CoverError(422, 'No pudimos abrir esa imagen. Probá con otro JPG, PNG o WebP.');
  }
  const expires = Date.now() + 5 * 60 * 1000;
  const proof = createHmac('sha256', key)
    .update(JSON.stringify([token, gameId, uploadId, expires, card, hero]))
    .digest('base64url');
  return { uploadId, expires, card, hero, proof };
}

async function readUpload(req) {
  const parsed = req.body;
  if (Buffer.isBuffer(parsed)) {
    if (parsed.length > MAX_UPLOAD) throw new CoverError(413, 'La imagen supera los 4 MB.');
    return parsed;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_UPLOAD) throw new CoverError(413, 'La imagen supera los 4 MB.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function sendCover(req, res) {
  const { gameId, version, variant } = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
  if (!GAME_ID.test(gameId || '') || !VERSION.test(version || '') || !Object.hasOwn(VARIANTS, variant)) {
    throw new CoverError(404, 'Portada no disponible.');
  }
  const payload = await appsScript({ action: 'gameCover', gameId, version, variant });
  if (!payload.ok || typeof payload.data !== 'string') throw new CoverError(404, 'Portada no disponible.');
  const image = Buffer.from(payload.data, 'base64');
  if (!image.length || image.length > VARIANTS[variant].bytes) throw new CoverError(404, 'Portada no disponible.');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Content-Length', image.length);
  res.end(image);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (req.method === 'GET') {
      if (new URL(req.url, 'http://localhost').searchParams.has('capability')) {
        const health = process.env.CUMBRE20_COVER_KEY && await appsScript({ action: 'health' });
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ enabled: health?.data?.gameCovers === true }));
      }
      return await sendCover(req, res);
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      throw new CoverError(405, 'Método no disponible.');
    }
    const prepared = await prepareCover(req);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(prepared));
  } catch (error) {
    res.statusCode = error.status || 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error.status ? error.message : 'No pudimos conectar con el servicio de portadas. Intentá nuevamente.' }));
  }
};
