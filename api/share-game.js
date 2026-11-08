const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbxlil_efKyghmU4FhnDhP_LvvUZtcor_g4L9UOhJsa0qo-i-YZoo9ek1VN69HTcd6zLnQ/exec';
const SOCIAL_BOT = /(WhatsApp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|Discordbot|Slackbot|LinkedInBot|Pinterest|Googlebot|bingbot)/i;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanText(value, fallback = '') {
  return String(value ?? fallback).replace(/\s+/g, ' ').trim();
}

function normalizeStatus(value) {
  return cleanText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function gameDescription(game) {
  const total = Math.max(0, Number(game.cupos_totales) || 0);
  const free = Math.max(0, Number(game.cupos_libres) || 0);
  const availability = free > 0 ? `${free} ${free === 1 ? 'lugar disponible' : 'lugares disponibles'}` : 'Mesa completa';
  return [
    `Sistema: ${cleanText(game.sistema, 'A definir')}`,
    `Modalidad: ${cleanText(game.modalidad, 'A coordinar')}`,
    `Ubicación: ${cleanText(game.ciudad || game.zona_plataforma, 'Mendoza')}`,
    total ? `${availability} de ${total}` : availability
  ].join(' · ').slice(0, 220);
}

function publicOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'rol-mendoza-2026.vercel.app';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}`;
}

function renderPage({ origin, gameId, game, unavailable = false }) {
  const shareUrl = `${origin}/compartir/partida/${encodeURIComponent(gameId)}`;
  const detailUrl = `${origin}/partidas/${encodeURIComponent(gameId)}`;
  const imageUrl = `${origin}/assets/branding/games-available-real.webp`;
  const title = unavailable
    ? 'Partida no disponible | Cumbre20'
    : `${cleanText(game.titulo, 'Partida de rol')} | Cumbre20`;
  const description = unavailable
    ? 'Esta partida ya no está disponible. Encontrá otras mesas de rol en Mendoza.'
    : `${gameDescription(game)}. Cumbre20 — Encontrá tu próxima mesa.`;
  const heading = unavailable ? 'Esta partida ya no está disponible' : cleanText(game.titulo, 'Partida de rol');
  const actionUrl = unavailable ? `${origin}/partidas` : detailUrl;
  const actionLabel = unavailable ? 'Buscar otras partidas' : 'Ver la partida';

  return `<!doctype html>
<html lang="es-AR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="${unavailable ? 'noindex,nofollow' : 'index,follow'}">
<link rel="canonical" href="${escapeHtml(shareUrl)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Cumbre20">
<meta property="og:locale" content="es_AR"><meta property="og:url" content="${escapeHtml(shareUrl)}">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}"><meta property="og:image:width" content="1800"><meta property="og:image:height" content="791">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(imageUrl)}">
<style>html{color-scheme:dark}body{margin:0;background:#130e10;color:#f1e8d5;font:16px/1.6 Inter,system-ui,sans-serif}main{min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}article{width:min(680px,100%);border-left:3px solid #d8ad57;background:#1d1518;padding:clamp(24px,6vw,56px);box-sizing:border-box}small{color:#d8ad57;text-transform:uppercase;letter-spacing:.12em;font-weight:800}h1{font:700 clamp(2rem,7vw,4rem)/1.05 Georgia,serif;margin:.8rem 0 1rem}p{color:#c7bdb3}a{display:inline-block;margin-top:1rem;background:#d8ad57;color:#130e10;padding:.8rem 1.1rem;text-decoration:none;font-weight:800}</style>
</head><body><main><article><small>Cumbre20 · Mendoza</small><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(description)}</p><a href="${escapeHtml(actionUrl)}">${escapeHtml(actionLabel)}</a></article></main></body></html>`;
}

async function fetchGame(gameId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set('action', 'game');
    url.searchParams.set('gameId', gameId);
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!response.ok) return undefined;
    const payload = await response.json();
    return payload?.ok ? payload.data : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

async function handler(req, res) {
  const query = req.query || {};
  const gameId = cleanText(Array.isArray(query.gameId) ? query.gameId[0] : query.gameId);
  if (!/^[A-Za-z0-9_-]{3,120}$/.test(gameId)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(renderPage({ origin: publicOrigin(req), gameId: '', unavailable: true }));
  }

  const origin = publicOrigin(req);
  if (!SOCIAL_BOT.test(req.headers['user-agent'] || '')) {
    res.statusCode = 302;
    res.setHeader('Location', `${origin}/partidas/${encodeURIComponent(gameId)}`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.end();
  }

  const game = await fetchGame(gameId);
  const unavailable = !game || ['cancelada', 'cancelled'].includes(normalizeStatus(game.estado));
  res.statusCode = unavailable ? 404 : 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', unavailable
    ? 'public, s-maxage=60, stale-while-revalidate=300'
    : 'public, s-maxage=300, stale-while-revalidate=1800');
  return res.end(renderPage({ origin, gameId, game, unavailable }));
}

module.exports = handler;
module.exports._test = { escapeHtml, gameDescription, normalizeStatus, renderPage };
