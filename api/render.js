// Angular hybrid rendering. No Firebase Admin credentials, cookies or private data enter SSR.
let application;
module.exports = async function render(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const url = new URL(req.url, 'https://rol-mendoza-2026.vercel.app');
  const originalPath = req.query?.__cumbre_path ?? url.searchParams.get('__cumbre_path');
  url.searchParams.delete('__cumbre_path');
  const path = originalPath == null ? url.pathname : '/' + String(originalPath).replace(/^\/+/, '');
  req.url = path + (url.searchParams.size ? '?' + url.searchParams : '');
  const publicRoute = /^(?:\/$|\/partidas\/?$|\/partidas\/(?!nueva(?:\/|$))[^/]+\/?$|\/comunidades\/?$|\/(?:como-funciona|nosotros|privacidad|terminos)\/?$)/.test(path);
  if (!publicRoute) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  try {
    application ??= import('../dist/rol-mendoza/server/server.mjs');
    const { reqHandler } = await application;
    return reqHandler(req, res);
  } catch (error) {
    console.error('Angular public rendering failed.', error);
    res.statusCode = 503;
    res.setHeader('Retry-After', '60');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.end('No pudimos cargar Cumbre20. Intentá nuevamente en unos minutos.');
  }
};
