import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from './components/icon/icon.component';
import { RevealDirective } from './directives/reveal.directive';
import { PlayerCardComponent } from './components/player-card/player-card.component';
import { GameCardComponent } from './components/game-card/game-card.component';
import { ClassAvatarComponent } from './components/user-avatar/user-avatar.component';
import { ShareGameComponent } from './components/share-game/share-game.component';

@NgModule({
  declarations: [PlayerCardComponent, GameCardComponent, ClassAvatarComponent, ShareGameComponent, RevealDirective],
  imports: [CommonModule, RouterModule, IconComponent],
  exports: [PlayerCardComponent, GameCardComponent, ClassAvatarComponent, ShareGameComponent, RevealDirective, IconComponent]
})
export class SharedUiModule {}
