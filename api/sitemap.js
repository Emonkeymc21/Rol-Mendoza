const site = 'https://rol-mendoza-2026.vercel.app';
const fallback = 'https://script.google.com/macros/s/AKfycbxlil_efKyghmU4FhnDhP_LvvUZtcor_g4L9UOhJsa0qo-i-YZoo9ek1VN69HTcd6zLnQ/exec';
module.exports = async function sitemap(_req, res) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    const url = new URL(process.env.APPS_SCRIPT_WEB_APP_URL || fallback);
    url.searchParams.set('action', 'games');
    const response = await fetch(url, {signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw Error('Public games unavailable');
    const result = await response.json();
    if (!result.ok || !Array.isArray(result.data)) throw Error('Invalid public list');
    const paths = ['', '/partidas', '/comunidades', '/como-funciona', '/nosotros', '/privacidad', '/terminos'];
    for (const game of result.data) {
      if (!/^[A-Za-z0-9_-]{3,80}$/.test(String(game.partida_id || '')) || /cancel/i.test(String(game.estado))) continue;
      paths.push('/partidas/' + encodeURIComponent(game.partida_id));
    }
    res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      [...new Set(paths)].slice(0,50000).map(path => `<url><loc>${site}${path}</loc></url>`).join('') + '</urlset>');
  } catch (error) {
    console.error('Public sitemap unavailable.', error);
    res.statusCode = 503;res.setHeader('Retry-After', '60');
    res.end('<?xml version="1.0" encoding="UTF-8"?><error>Sitemap temporalmente no disponible</error>');
  }
};
