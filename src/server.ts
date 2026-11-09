import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { environment } from './environments/environment';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine({allowedHosts: [
  'rol-mendoza-2026.vercel.app', 'localhost', '127.0.0.1',
  ...(process.env['VERCEL_URL'] ? [process.env['VERCEL_URL']] : [])
]});

// Only the compiled demo build can proxy its loopback Apps Script implementation.
if (!environment.production && environment.firebase.projectId === 'demo-cumbre20' && process.env['CUMBRE20_TEST_MODE'] === '1') {
  if (process.env['FIREBASE_AUTH_EMULATOR_HOST'] !== '127.0.0.1:9099') throw Error('Demo emulators required');
  if (process.env['CUMBRE20_TEST_CSP']) app.use((_req,res,next)=>{res.setHeader('Content-Security-Policy',process.env['CUMBRE20_TEST_CSP']!);next();});
  app.use('/apps-script', async (req, res, next) => {
    try {
      const response = await fetch('http://127.0.0.1:4401/apps-script' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''), {method:req.method, body:req.method === 'GET' ? undefined : await new Promise<string>(resolve => {let raw='';req.on('data',chunk=>raw+=chunk);req.on('end',()=>resolve(raw));})});
      res.status(response.status).type('application/json').send(await response.text());
    } catch (error) {next(error);}
  });
  app.use('/compartir', async (req, res, next) => {
    try {
      const response = await fetch('http://127.0.0.1:4401' + req.originalUrl, {headers:{'user-agent':req.headers['user-agent']||''},redirect:'manual'});
      res.status(response.status);response.headers.forEach((value,key)=>res.setHeader(key,value));res.send(await response.text());
    } catch (error) { next(error); }
  });
}


/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const publicPage = /^(?:\/$|\/partidas\/?$|\/partidas\/(?!nueva(?:\/|$))[^/]+\/?$|\/comunidades\/?$|\/(?:como-funciona|nosotros|privacidad|terminos)\/?$)/.test(req.path);
  if (!publicPage) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const privatePage = /^\/(?:jugadores|partidas\/nueva|mis-partidas|mis-solicitudes|solicitudes|notificaciones|comunidades\/solicitar|registrarme|registro|ingresar|completar-perfil|perfil|editar-perfil|mi-cuenta)(?:\/|$)/.test(req.path);
  if (!publicPage && !privatePage) req.url = '/404';
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
