import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GameJoinRequest, JoinRequestStatus, requestStatusLabel } from '../../core/models/join-request.model';
import { UserPrivateProfile, UserProfile } from '../../core/models/user-profile.model';
import { NotificationService } from '../../core/services/notification.service';
import { ProfileService } from '../../core/services/profile.service';
import { ContactNormalizerService } from '../../core/services/contact-normalizer.service';

@Component({ selector: 'app-dm-requests', templateUrl: './dm-requests.component.html', styleUrls: ['./dm-requests.component.scss'] })
export class DmRequestsComponent {
  requests: GameJoinRequest[] = [];
  selected?: GameJoinRequest;
  playerProfile?: UserProfile;
  playerContact?: UserPrivateProfile;
  ownProfile?: UserProfile;
  loading = true;
  resolving = false;
  errorMessage = '';
  successMessage = '';
  readonly gameFilter: string;
  private readonly requestedId: string;

  constructor(
    private notifications: NotificationService,
    private profiles: ProfileService,
    private contacts: ContactNormalizerService,
    route: ActivatedRoute
  ) {
    this.gameFilter = route.snapshot.queryParamMap.get('gameId') || '';
    this.requestedId = route.snapshot.queryParamMap.get('request') || '';
    notifications.watchDmRequests().subscribe({
      next: requests => {
        this.requests = this.gameFilter ? requests.filter(item => item.gameId === this.gameFilter) : requests;
        if (this.selected) {
          this.selected = this.requests.find(item => item.id === this.selected?.id);
          if (this.selected?.status === 'APPROVED' && !this.playerContact) void this.loadPlayerContact();
        }
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
    void this.profiles.getOwnProfile().then(profile => this.ownProfile = profile || undefined);
  }

  async open(request: GameJoinRequest): Promise<void> {
    this.selected = request;
    this.playerProfile = undefined;
    this.playerContact = undefined;
    this.errorMessage = '';
    try {
      const [profile] = await Promise.all([
        this.profiles.getProfile(request.playerUid),
        this.notifications.markSeen(request),
        this.notifications.markJoinNotificationRead(request.id)
      ]);
      this.playerProfile = profile || undefined;
      if (request.status === 'APPROVED') await this.loadPlayerContact();
    } catch (error) {
      console.error('No se pudo abrir la solicitud.', error);
      this.errorMessage = error instanceof Error ? error.message : 'No pudimos abrir la solicitud.';
    }
  }

  async resolve(status: Exclude<JoinRequestStatus, 'PENDING'>): Promise<void> {
    if (!this.selected || this.resolving) return;
    this.resolving = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      const result = await this.notifications.resolve(this.selected, status);
      this.successMessage = result.message;
      this.selected = { ...this.selected, status, seenByDm: true };
      if (status === 'APPROVED') await this.loadPlayerContact();
    } catch (error) {
      console.error('No se pudo resolver la solicitud.', error);
      this.errorMessage = error instanceof Error ? error.message : 'No pudimos actualizar la solicitud.';
    } finally { this.resolving = false; }
  }

  statusLabel(request: GameJoinRequest): string { return requestStatusLabel(request); }

  playerWhatsappUrl(): string {
    if (!this.playerContact?.whatsappUrl || !this.selected) return '';
    const dmName = this.ownProfile?.displayName || this.selected.dmName || 'el DM';
    return this.contacts.whatsappWithMessage(
      this.playerContact.whatsappUrl,
      `¡Hola! Soy ${dmName}, de Cumbre20. Te acepté en la partida “${this.selected.gameTitle}”. ¿Seguís interesado/a? Coordinemos los detalles.`
    );
  }

  private async loadPlayerContact(): Promise<void> {
    if (this.selected?.status !== 'APPROVED') return;
    try {
      this.playerContact = await this.profiles.getContact(this.selected.playerUid) || undefined;
    } catch (error) {
      this.playerContact = undefined;
      console.error('No se pudo cargar el contacto del jugador aceptado.', error);
    }
  }
}
