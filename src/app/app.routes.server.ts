import { RenderMode, ServerRoute } from '@angular/ssr';

// Authenticated routes remain client-only. Public SSR never initializes Firebase Auth.
export const serverRoutes: ServerRoute[] = [
  ...['', 'como-funciona', 'nosotros', 'privacidad', 'terminos'].map(path => ({path, renderMode: RenderMode.Prerender as const})),
  ...['partidas', 'partidas/:id', 'comunidades'].map(path => ({path, renderMode: RenderMode.Server as const})),
  {path:'404', renderMode: RenderMode.Server, status:404},
  {path:'**', renderMode: RenderMode.Client}
];
