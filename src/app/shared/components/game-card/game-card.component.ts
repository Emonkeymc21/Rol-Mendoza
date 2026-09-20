import { Component, Input } from '@angular/core';
import { Game } from '../../../core/models/game.model';

@Component({ selector: 'app-game-card', templateUrl: './game-card.component.html', styleUrls: ['./game-card.component.scss'] })
export class GameCardComponent {
  @Input({ required: true }) game!: Game;

  statusLabel(): string {
    const labels: Record<Game['status'], string> = {
      ACTIVE: 'Activa', FULL: 'Sin cupos', PAUSED: 'Pausada', CANCELLED: 'Cancelada'
    };
    return labels[this.game.status];
  }

  masterInitials(): string {
    return (this.game.gm || 'DM').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
  }

  occupiedSeats(): number {
    return Math.min(this.game.totalSeats, Math.max(this.game.currentPlayers, this.game.totalSeats - this.game.seats));
  }

  capacityPercent(): number {
    return this.game.totalSeats ? Math.round((this.occupiedSeats() / this.game.totalSeats) * 100) : 0;
  }
}
