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

const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Cumbre20 | Encontrá tu próxima mesa' },
  { path: 'jugadores', component: PlayersComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Jugadores y másters | Cumbre20' },
  { path: 'jugadores/:id', component: PlayerDetailComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Perfil | Cumbre20' },
  { path: 'partidas', component: GamesComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Partidas disponibles | Cumbre20' },
  { path: 'partidas/nueva', component: CreateGameComponent, canActivate: [AuthGuard, ProfileCompleteGuard, DmGuard], title: 'Crear una partida | Cumbre20' },
  { path: 'mis-partidas', component: MyGamesComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Mis partidas | Cumbre20' },
  { path: 'mis-solicitudes', component: MyRequestsComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Mis solicitudes | Cumbre20' },
  { path: 'solicitudes', component: DmRequestsComponent, canActivate: [AuthGuard, ProfileCompleteGuard, DmGuard], title: 'Solicitudes de jugadores | Cumbre20' },
  { path: 'notificaciones', component: NotificationsComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Notificaciones | Cumbre20' },
  { path: 'mis-partidas/:id/editar', component: CreateGameComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Editar partida | Cumbre20' },
  { path: 'partidas/:id', component: GameDetailComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Detalle de partida | Cumbre20' },
  { path: 'como-funciona', component: HowItWorksComponent, title: 'Cómo funciona | Cumbre20' },
  { path: 'nosotros', component: AboutComponent, title: 'Nosotros | Cumbre20' },
  { path: 'registrarme', component: RegisterComponent, canActivate: [GuestGuard], title: 'Sumate | Cumbre20' },
  { path: 'registro', redirectTo: 'registrarme', pathMatch: 'full' },
  { path: 'ingresar', component: LoginComponent, canActivate: [GuestGuard], title: 'Ingresar | Cumbre20' },
  { path: 'completar-perfil', component: CompleteProfileComponent, canActivate: [AuthGuard, IncompleteProfileGuard], title: 'Completar perfil | Cumbre20' },
  { path: 'perfil/editar', component: CompleteProfileComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Editar perfil | Cumbre20' },
  { path: 'editar-perfil', redirectTo: 'perfil/editar', pathMatch: 'full' },
  { path: 'perfil', component: AccountComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Mi perfil | Cumbre20' },
  { path: 'mi-cuenta', redirectTo: 'perfil', pathMatch: 'full' },
  { path: '404', component: NotFoundComponent, title: 'Página no encontrada | Cumbre20' },
  { path: '**', redirectTo: '404' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
