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

const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Rol Mendoza | Encontrá tu próxima mesa' },
  { path: 'jugadores', component: PlayersComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Jugadores y másters | Rol Mendoza' },
  { path: 'jugadores/:id', component: PlayerDetailComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Perfil | Rol Mendoza' },
  { path: 'partidas', component: GamesComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Partidas disponibles | Rol Mendoza' },
  { path: 'partidas/nueva', component: CreateGameComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Crear una partida | Rol Mendoza' },
  { path: 'partidas/:id', component: GameDetailComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Detalle de partida | Rol Mendoza' },
  { path: 'como-funciona', component: HowItWorksComponent, title: 'Cómo funciona | Rol Mendoza' },
  { path: 'registrarme', component: RegisterComponent, canActivate: [GuestGuard], title: 'Sumate | Rol Mendoza' },
  { path: 'ingresar', component: LoginComponent, canActivate: [GuestGuard], title: 'Ingresar | Rol Mendoza' },
  { path: 'completar-perfil', component: CompleteProfileComponent, canActivate: [AuthGuard, IncompleteProfileGuard], title: 'Completar perfil | Rol Mendoza' },
  { path: 'editar-perfil', component: CompleteProfileComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Editar perfil | Rol Mendoza' },
  { path: 'mi-cuenta', component: AccountComponent, canActivate: [AuthGuard, ProfileCompleteGuard], title: 'Mi cuenta | Rol Mendoza' },
  { path: '404', component: NotFoundComponent, title: 'Página no encontrada | Rol Mendoza' },
  { path: '**', redirectTo: '404' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
