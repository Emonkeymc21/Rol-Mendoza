import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GameJoinRequest, JoinRequestStatus, requestStatusLabel } from '../../core/models/join-request.model';
import { UserProfile } from '../../core/models/user-profile.model';
import { NotificationService } from '../../core/services/notification.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({ selector: 'app-dm-requests', templateUrl: './dm-requests.component.html', styleUrls: ['./dm-requests.component.scss'] })
export class DmRequestsComponent {
  requests: GameJoinRequest[] = [];
  selected?: GameJoinRequest;
  playerProfile?: UserProfile;
  loading = true;
  resolving = false;
  errorMessage = '';
  readonly gameFilter: string;
  private readonly requestedId: string;

  constructor(private notifications: NotificationService, private profiles: ProfileService, route: ActivatedRoute) {
    this.gameFilter = route.snapshot.queryParamMap.get('gameId') || '';
    this.requestedId = route.snapshot.queryParamMap.get('request') || '';
    notifications.watchDmRequests().subscribe({
      next: requests => {
        this.requests = this.gameFilter ? requests.filter(item => item.gameId === this.gameFilter) : requests;
        if (this.selected) this.selected = this.requests.find(item => item.id === this.selected?.id);
        if (!this.selected && this.requestedId) {
          const requested = this.requests.find(item => item.id === this.requestedId);
          if (requested) void this.open(requested);
        }
        this.loading = false;
      },
      error: error => {
        console.error('No se pudieron cargar las solicitudes para el DM.', error);
        this.errorMessage = 'No pudimos cargar las solicitudes de tus partidas.';
        this.loading = false;
      }
    });
  }

  async open(request: GameJoinRequest): Promise<void> {
    this.selected = request;
    this.playerProfile = undefined;
    this.errorMessage = '';
    try {
      const [profile] = await Promise.all([
        this.profiles.getProfile(request.playerUid),
        this.notifications.markSeen(request),
        this.notifications.markJoinNotificationRead(request.id)
      ]);
      this.playerProfile = profile || undefined;
    } catch (error) {
      console.error('No se pudo abrir la solicitud.', error);
      this.errorMessage = error instanceof Error ? error.message : 'No pudimos abrir la solicitud.';
    }
  }

  async resolve(status: Exclude<JoinRequestStatus, 'PENDING'>): Promise<void> {
    if (!this.selected || this.resolving) return;
    this.resolving = true;
    this.errorMessage = '';
    try {
      await this.notifications.resolve(this.selected, status);
    } catch (error) {
      console.error('No se pudo resolver la solicitud.', error);
      this.errorMessage = error instanceof Error ? error.message : 'No pudimos actualizar la solicitud.';
    } finally { this.resolving = false; }
  }

  statusLabel(request: GameJoinRequest): string { return requestStatusLabel(request); }
}
