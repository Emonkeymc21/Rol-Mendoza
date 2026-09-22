import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Game, GameStatus } from '../../core/models/game.model';
import { GameService } from '../../core/services/game.service';
import { ProfileService } from '../../core/services/profile.service';
import { GameJoinRequest } from '../../core/models/join-request.model';
import { NotificationService } from '../../core/services/notification.service';
import { GameParticipantView } from '../../core/models/game-participant.model';
import { GameParticipantService } from '../../core/services/game-participant.service';
import { AuthService } from '../../core/services/auth.service';

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
  removingUid = '';
  canCreate = false;
  requests: GameJoinRequest[] = [];
  participants: GameParticipantView[] = [];

  constructor(
    private gamesService: GameService,
    profiles: ProfileService,
    route: ActivatedRoute,
    private notifications: NotificationService,
    participantService: GameParticipantService,
    auth: AuthService
  ) {
    if (route.snapshot.queryParamMap.get('saved')) {
      this.notice = route.snapshot.queryParamMap.get('action') === 'published'
        ? '¡Partida publicada! Tu partida ya está disponible para la comunidad.'
        : 'Los cambios de la partida se guardaron correctamente.';
    }
    void profiles.getOwnProfile().then(profile => this.canCreate = profile?.role === 'DM' || profile?.role === 'BOTH');
    notifications.watchDmRequests().subscribe({
      next: requests => this.requests = requests,
      error: error => console.error('No se pudieron contar las solicitudes de partidas.', error)
    });
    if (auth.currentUser) participantService.watchOwned(auth.currentUser.uid).subscribe({
      next: participants => this.participants = participants,
      error: error => console.error('No se pudieron cargar los participantes de tus partidas.', error)
    });
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

  requestCount(gameId: string): number {
    return this.requests.filter(item => item.gameId === gameId && item.status === 'PENDING').length;
  }

  participantsFor(gameId: string): GameParticipantView[] {
    return this.participants.filter(item => item.participant.gameId === gameId);
  }

  async removePlayer(game: Game, view: GameParticipantView): Promise<void> {
    if (this.removingUid || this.busyGameId) return;
    const playerName = view.profile?.displayName || 'este jugador';
    if (!window.confirm(`¿Remover a ${playerName} de “${game.title}”? Se liberará su cupo y se le avisará con una notificación.`)) return;
    this.removingUid = view.participant.playerUid;
    this.errorMessage = '';
    this.notice = '';
    try {
      const result = await this.notifications.removeParticipant(game.id, view.participant.playerUid);
      this.notice = result.message;
    } catch (error) {
      console.error('No se pudo remover al jugador.', error);
      this.errorMessage = error instanceof Error ? error.message : 'No pudimos remover al jugador. Intentá nuevamente.';
    } finally {
      this.removingUid = '';
    }
  }

  availableMessage(game: Game): string {
    if (game.status === 'FULL' || game.seats <= 0) return 'Mesa completa';
    return `${game.seats} ${game.seats === 1 ? 'lugar disponible' : 'lugares disponibles'}`;
  }
}
