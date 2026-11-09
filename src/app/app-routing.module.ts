import { NgModule } from '@angular/core';
import { HomeComponent } from './pages/home/home.component';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { ProfileCompleteGuard } from './core/guards/profile-complete.guard';
import { IncompleteProfileGuard } from './core/guards/incomplete-profile.guard';
import { GuestGuard } from './core/guards/guest.guard';
import { DmGuard } from './core/guards/dm.guard';

const privatePage = { robots: 'noindex,nofollow' };

const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Cumbre20 | Encontrá tu próxima mesa', data: { description: 'Encontrá y organizá mesas de rol en Mendoza. Cumbre20 conecta jugadores, másters y partidas sin reemplazar los espacios que ya existen.' } },
  { path: 'jugadores', loadChildren: () => import('./pages/players/players.module').then(m => m.PlayersModule), canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Jugadores y másters | Cumbre20', data: privatePage },
  { path: 'jugadores/:id', loadChildren: () => import('./pages/player-detail/player-detail.module').then(m => m.PlayerDetailModule), canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Perfil | Cumbre20', data: privatePage },
  { path: 'partidas', loadChildren: () => import('./pages/games/games.module').then(m => m.GamesModule), title: 'Partidas disponibles | Cumbre20', data: { description: 'Explorá partidas de rol presenciales, online y mixtas en Mendoza. Filtrá por localidad, sistema y experiencia.' } },
  { path: 'partidas/nueva', loadChildren: () => import('./pages/create-game/create-game.module').then(m => m.CreateGameModule), canActivate: [AuthGuard, ProfileCompleteGuard, DmGuard], title: 'Crear una partida | Cumbre20', data: privatePage },
  { path: 'mis-partidas', loadChildren: () => import('./pages/my-games/my-games.module').then(m => m.MyGamesModule), canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Mis partidas | Cumbre20', data: privatePage },
  { path: 'mis-solicitudes', loadChildren: () => import('./pages/my-requests/my-requests.module').then(m => m.MyRequestsModule), canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Mis solicitudes | Cumbre20', data: privatePage },
  { path: 'solicitudes', loadChildren: () => import('./pages/dm-requests/dm-requests.module').then(m => m.DmRequestsModule), canActivate: [AuthGuard, ProfileCompleteGuard, DmGuard], title: 'Solicitudes de jugadores | Cumbre20', data: privatePage },
  { path: 'notificaciones', loadChildren: () => import('./pages/notifications/notifications.module').then(m => m.NotificationsModule), canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Notificaciones | Cumbre20', data: privatePage },
  { path: 'mis-partidas/:id/editar', loadChildren: () => import('./pages/create-game/create-game.module').then(m => m.CreateGameModule), canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Editar partida | Cumbre20', data: privatePage },
  { path: 'partidas/:id', loadChildren: () => import('./pages/game-detail/game-detail.module').then(m => m.GameDetailModule), title: 'Detalle de partida | Cumbre20', data: { description: 'Conocé los datos de una partida publicada en Cumbre20 y solicitá unirte con tu perfil.' } },
  { path: 'comunidades', loadChildren: () => import('./pages/communities/communities.module').then(m => m.CommunitiesModule), title: 'Comunidades de rol en Mendoza | Cumbre20', data: { description: 'Descubrí grupos, clubes, tiendas y espacios que organizan rol en Mendoza y accedé a sus canales oficiales.' } },
  { path: 'comunidades/solicitar', loadChildren: () => import('./pages/request-community/request-community.module').then(m => m.RequestCommunityModule), canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Solicitar perfil de comunidad | Cumbre20', data: privatePage },
  { path: 'como-funciona', loadChildren: () => import('./pages/how-it-works/how-it-works.module').then(m => m.HowItWorksModule), title: 'Cómo funciona | Cumbre20', data: { description: 'Descubrí cómo crear tu perfil, encontrar una mesa de rol o publicar una partida en Cumbre20.' } },
  { path: 'nosotros', loadChildren: () => import('./pages/about/about.module').then(m => m.AboutModule), title: 'Nosotros | Cumbre20', data: { description: 'Cumbre20 es una herramienta que ayuda a conectar jugadores, másters, partidas y espacios de rol que ya existen en Mendoza.' } },
  { path: 'privacidad', loadChildren: () => import('./pages/legal/legal.module').then(m => m.LegalModule), title: 'Política de Privacidad | Cumbre20', data: { legalDocument: 'privacy', description: 'Conocé qué datos utiliza Cumbre20, para qué los necesita y cómo protegemos tu privacidad.' } },
  { path: 'terminos', loadChildren: () => import('./pages/legal/legal.module').then(m => m.LegalModule), title: 'Términos y Condiciones | Cumbre20', data: { legalDocument: 'terms', description: 'Condiciones de uso de Cumbre20 para jugadores, másters y personas que buscan una mesa de rol en Mendoza.' } },
  { path: 'registrarme', loadChildren: () => import('./pages/register/register.module').then(m => m.RegisterModule), canActivate: [GuestGuard], title: 'Sumate | Cumbre20', data: privatePage },
  { path: 'registro', redirectTo: 'registrarme', pathMatch: 'full' },
  { path: 'ingresar', loadChildren: () => import('./pages/login/login.module').then(m => m.LoginModule), canActivate: [GuestGuard], title: 'Ingresar | Cumbre20', data: privatePage },
  { path: 'completar-perfil', loadChildren: () => import('./pages/complete-profile/complete-profile.module').then(m => m.CompleteProfileModule), canActivate: [AuthGuard, IncompleteProfileGuard], title: 'Completar perfil | Cumbre20', data: privatePage },
  { path: 'perfil/editar', loadChildren: () => import('./pages/complete-profile/complete-profile.module').then(m => m.CompleteProfileModule), canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Editar perfil | Cumbre20', data: privatePage },
  { path: 'editar-perfil', redirectTo: 'perfil/editar', pathMatch: 'full' },
  { path: 'perfil', loadChildren: () => import('./pages/account/account.module').then(m => m.AccountModule), canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Mi perfil | Cumbre20', data: privatePage },
  { path: 'mi-cuenta', redirectTo: 'perfil', pathMatch: 'full' },
  { path: '404', loadChildren: () => import('./pages/not-found/not-found.module').then(m => m.NotFoundModule), title: 'Página no encontrada | Cumbre20', data: { description: 'La página que buscás no existe o cambió de ubicación.', robots: 'noindex,nofollow' } },
  { path: '**', redirectTo: '404' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
