import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Game, GameStatus } from '../../core/models/game.model';
import { GameService } from '../../core/services/game.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-my-games',
  templateUrl: './my-games.component.html',
  styleUrls: ['./my-games.component.scss']
})
export class MyGamesComponent implements OnInit {
  games: Game[] = [];
  loading = true;
  errorMessage = '';
  notice = '';
  busyGameId = '';
  canCreate = false;

  constructor(private gamesService: GameService, profiles: ProfileService, route: ActivatedRoute) {
    if (route.snapshot.queryParamMap.get('saved')) {
      this.notice = route.snapshot.queryParamMap.get('action') === 'published'
        ? '¡Partida publicada! Tu partida ya está disponible para la comunidad.'
        : 'Los cambios de la partida se guardaron correctamente.';
    }
    void profiles.getOwnProfile().then(profile => this.canCreate = profile?.role === 'DM' || profile?.role === 'BOTH');
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.gamesService.getMyGames().subscribe({
      next: games => {
        this.games = games;
        this.loading = false;
      },
      error: error => {
        console.error('No se pudieron cargar las partidas propias.', error);
        this.errorMessage = error?.message || 'No pudimos cargar tus partidas. Intentá nuevamente.';
        this.loading = false;
      }
    });
  }

  changeStatus(game: Game, status: GameStatus): void {
    if (this.busyGameId) return;
    if (status === 'CANCELLED' && !window.confirm('¿Querés cancelar esta partida? Dejará de mostrarse públicamente.')) return;
    this.busyGameId = game.id;
    this.errorMessage = '';
    this.notice = '';
    this.gamesService.setStatus(game.id, status).subscribe({
      next: result => {
        game.status = status;
        this.notice = result.message;
        this.busyGameId = '';
      },
      error: error => {
        console.error('No se pudo modificar el estado de la partida.', error);
        this.errorMessage = error?.message || 'No pudimos actualizar la partida. Intentá nuevamente.';
        this.busyGameId = '';
      }
    });
  }

  statusLabel(status: GameStatus): string {
    const labels: Record<GameStatus, string> = {
      ACTIVE: 'Activa', PAUSED: 'Pausada', CANCELLED: 'Cancelada', FULL: 'Sin cupos'
    };
    return labels[status];
  }
}
