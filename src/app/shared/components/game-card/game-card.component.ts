import { Component, Input, OnInit } from '@angular/core';
import { Game } from '../../../core/models/game.model';
import { UserProfile } from '../../../core/models/user-profile.model';
import { ProfileService } from '../../../core/services/profile.service';

@Component({ selector: 'app-game-card', templateUrl: './game-card.component.html', styleUrls: ['./game-card.component.scss'] })
export class GameCardComponent implements OnInit {
  @Input({ required: true }) game!: Game;
  dmProfile?: UserProfile;

  constructor(private profiles: ProfileService) {}

  async ngOnInit(): Promise<void> {
    if (!this.game.masterUserId) return;
    try { this.dmProfile = await this.profiles.getProfile(this.game.masterUserId) || undefined; }
    catch { this.dmProfile = undefined; }
  }

  statusLabel(): string {
    const labels: Record<Game['status'], string> = {
      ACTIVE: 'Activa', FULL: 'Sin cupos', PAUSED: 'Pausada', CANCELLED: 'Cancelada'
    };
    return labels[this.game.status];
  }

  occupiedSeats(): number {
    return Math.min(this.game.totalSeats, Math.max(this.game.currentPlayers, this.game.totalSeats - this.game.seats));
  }

  capacityPercent(): number {
    return this.game.totalSeats ? Math.round((this.occupiedSeats() / this.game.totalSeats) * 100) : 0;
  }

  availabilityLabel(): string {
    if (this.game.status === 'FULL' || this.game.seats <= 0) return 'Mesa completa';
    return `${this.game.seats} ${this.game.seats === 1 ? 'lugar disponible' : 'lugares disponibles'}`;
  }
}
