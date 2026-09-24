import { Component, Input } from '@angular/core';
import { Player } from '../../../core/models/player.model';

@Component({ selector: 'app-player-card', templateUrl: './player-card.component.html', styleUrls: ['./player-card.component.scss'] })
export class PlayerCardComponent {
  @Input({ required: true }) player!: Player;
  expanded = false;

  bioClamped(): boolean {
    return !this.expanded && (this.player.bio || '').length > 150;
  }

  toggleBio(): void {
    this.expanded = !this.expanded;
  }
}
