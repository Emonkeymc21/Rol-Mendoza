import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { IconComponent } from './shared/components/icon/icon.component';
import { PlayerCardComponent } from './shared/components/player-card/player-card.component';
import { GameCardComponent } from './shared/components/game-card/game-card.component';
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
import { MyGamesComponent } from './pages/my-games/my-games.component';
import { ClassAvatarComponent } from './shared/components/user-avatar/user-avatar.component';
import { AboutComponent } from './pages/about/about.component';
import { MyRequestsComponent } from './pages/my-requests/my-requests.component';
import { DmRequestsComponent } from './pages/dm-requests/dm-requests.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { CustomCursorComponent } from './shared/components/custom-cursor/custom-cursor.component';
import { RevealDirective } from './shared/directives/reveal.directive';
import { LegalComponent } from './pages/legal/legal.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    PlayerCardComponent,
    GameCardComponent,
    HomeComponent,
    PlayersComponent,
    PlayerDetailComponent,
    GamesComponent,
    GameDetailComponent,
    CreateGameComponent,
    RegisterComponent,
    HowItWorksComponent,
    NotFoundComponent,
    LoginComponent,
    AccountComponent,
    CompleteProfileComponent,
    MyGamesComponent,
    ClassAvatarComponent,
    AboutComponent,
    MyRequestsComponent,
    DmRequestsComponent,
    NotificationsComponent,
    CustomCursorComponent,
    RevealDirective,
    LegalComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule,
    IconComponent,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
