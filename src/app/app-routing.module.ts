import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { PlayersComponent } from './pages/players/players.component';
import { PlayerDetailComponent } from './pages/player-detail/player-detail.component';
import { GamesComponent } from './pages/games/games.component';
import { GameDetailComponent } from './pages/game-detail/game-detail.component';
import { CreateGameComponent } from './pages/create-game/create-game.component';
import { RegisterComponent } from './pages/register/register.component';
import { HowItWorksComponent } from './pages/how-it-works/how-it-works.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { LoginComponent } from './pages/login/login.component';
import { AccountComponent } from './pages/account/account.component';
import { CompleteProfileComponent } from './pages/complete-profile/complete-profile.component';
import { AuthGuard } from './core/guards/auth.guard';
import { ProfileCompleteGuard } from './core/guards/profile-complete.guard';
import { IncompleteProfileGuard } from './core/guards/incomplete-profile.guard';
import { GuestGuard } from './core/guards/guest.guard';
import { DmGuard } from './core/guards/dm.guard';
import { MyGamesComponent } from './pages/my-games/my-games.component';
import { AboutComponent } from './pages/about/about.component';
import { MyRequestsComponent } from './pages/my-requests/my-requests.component';
import { DmRequestsComponent } from './pages/dm-requests/dm-requests.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { LegalComponent } from './pages/legal/legal.component';

const privatePage = { robots: 'noindex,nofollow' };

const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Cumbre20 | Encontrá tu próxima mesa', data: { description: 'Encontrá y organizá mesas de rol en Mendoza. Cumbre20 conecta jugadores, másters y partidas sin reemplazar los espacios que ya existen.' } },
  { path: 'jugadores', component: PlayersComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Jugadores y másters | Cumbre20', data: privatePage },
  { path: 'jugadores/:id', component: PlayerDetailComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Perfil | Cumbre20', data: privatePage },
  { path: 'partidas', component: GamesComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Partidas disponibles | Cumbre20', data: privatePage },
  { path: 'partidas/nueva', component: CreateGameComponent, canActivate: [AuthGuard, ProfileCompleteGuard, DmGuard], title: 'Crear una partida | Cumbre20', data: privatePage },
  { path: 'mis-partidas', component: MyGamesComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Mis partidas | Cumbre20', data: privatePage },
  { path: 'mis-solicitudes', component: MyRequestsComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Mis solicitudes | Cumbre20', data: privatePage },
  { path: 'solicitudes', component: DmRequestsComponent, canActivate: [AuthGuard, ProfileCompleteGuard, DmGuard], title: 'Solicitudes de jugadores | Cumbre20', data: privatePage },
  { path: 'notificaciones', component: NotificationsComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Notificaciones | Cumbre20', data: privatePage },
  { path: 'mis-partidas/:id/editar', component: CreateGameComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Editar partida | Cumbre20', data: privatePage },
  { path: 'partidas/:id', component: GameDetailComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Detalle de partida | Cumbre20', data: privatePage },
  { path: 'como-funciona', component: HowItWorksComponent, title: 'Cómo funciona | Cumbre20', data: { description: 'Descubrí cómo crear tu perfil, encontrar una mesa de rol o publicar una partida en Cumbre20.' } },
  { path: 'nosotros', component: AboutComponent, title: 'Nosotros | Cumbre20', data: { description: 'Cumbre20 es una herramienta que ayuda a conectar jugadores, másters, partidas y espacios de rol que ya existen en Mendoza.' } },
  { path: 'privacidad', component: LegalComponent, title: 'Política de Privacidad | Cumbre20', data: { legalDocument: 'privacy', description: 'Conocé qué datos utiliza Cumbre20, para qué los necesita y cómo protegemos tu privacidad.' } },
  { path: 'terminos', component: LegalComponent, title: 'Términos y Condiciones | Cumbre20', data: { legalDocument: 'terms', description: 'Condiciones de uso de Cumbre20 para jugadores, másters y personas que buscan una mesa de rol en Mendoza.' } },
  { path: 'registrarme', component: RegisterComponent, canActivate: [GuestGuard], title: 'Sumate | Cumbre20', data: privatePage },
  { path: 'registro', redirectTo: 'registrarme', pathMatch: 'full' },
  { path: 'ingresar', component: LoginComponent, canActivate: [GuestGuard], title: 'Ingresar | Cumbre20', data: privatePage },
  { path: 'completar-perfil', component: CompleteProfileComponent, canActivate: [AuthGuard, IncompleteProfileGuard], title: 'Completar perfil | Cumbre20', data: privatePage },
  { path: 'perfil/editar', component: CompleteProfileComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Editar perfil | Cumbre20', data: privatePage },
  { path: 'editar-perfil', redirectTo: 'perfil/editar', pathMatch: 'full' },
  { path: 'perfil', component: AccountComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Mi perfil | Cumbre20', data: privatePage },
  { path: 'mi-cuenta', redirectTo: 'perfil', pathMatch: 'full' },
  { path: '404', component: NotFoundComponent, title: 'Página no encontrada | Cumbre20', data: { description: 'La página que buscás no existe o cambió de ubicación.', robots: 'noindex,nofollow' } },
  { path: '**', redirectTo: '404' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
