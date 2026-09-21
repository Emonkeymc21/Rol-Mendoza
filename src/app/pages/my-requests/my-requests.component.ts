import { Component } from '@angular/core';
import { GameJoinRequest, requestStatusLabel } from '../../core/models/join-request.model';
import { NotificationService } from '../../core/services/notification.service';
import { UserPrivateProfile, UserProfile } from '../../core/models/user-profile.model';
import { ProfileService } from '../../core/services/profile.service';
import { ContactNormalizerService } from '../../core/services/contact-normalizer.service';

@Component({ selector: 'app-my-requests', templateUrl: './my-requests.component.html', styleUrls: ['./my-requests.component.scss'] })
export class MyRequestsComponent {
  requests: GameJoinRequest[] = [];
  loading = true;
  errorMessage = '';
  ownProfile?: UserProfile;
  dmContacts: Record<string, UserPrivateProfile | null | undefined> = {};
  private readonly loadingContacts = new Set<string>();

  constructor(
    notifications: NotificationService,
    private profiles: ProfileService,
    private contacts: ContactNormalizerService
  ) {
    notifications.watchMyRequests().subscribe({
      next: requests => {
        this.requests = requests;
        this.loading = false;
        void this.loadApprovedContacts();
      },
      error: error => {
        console.error('No se pudieron cargar las solicitudes del jugador.', error);
        this.errorMessage = 'No pudimos cargar tus solicitudes. Intentá nuevamente.';
        this.loading = false;
      }
    });
    void this.profiles.getOwnProfile().then(profile => this.ownProfile = profile || undefined);
  }

  statusLabel(request: GameJoinRequest): string { return requestStatusLabel(request); }

  dmWhatsappUrl(request: GameJoinRequest): string {
    const contact = this.dmContacts[request.dmUid];
    if (!contact?.whatsappUrl) return '';
    const playerName = this.ownProfile?.displayName || request.playerName || 'un jugador de Cumbre20';
    return this.contacts.whatsappWithMessage(
      contact.whatsappUrl,
      `¡Hola! Soy ${playerName}, de Cumbre20. Me aceptaste en la partida “${request.gameTitle}”. ¿Coordinamos los detalles?`
    );
  }

  private async loadApprovedContacts(): Promise<void> {
    const dmUids = [...new Set(
      this.requests.filter(request => request.status === 'APPROVED').map(request => request.dmUid)
    )];
    await Promise.all(dmUids.map(async dmUid => {
      if (!dmUid || this.dmContacts[dmUid] !== undefined || this.loadingContacts.has(dmUid)) return;
      this.loadingContacts.add(dmUid);
      try {
        this.dmContacts[dmUid] = await this.profiles.getContact(dmUid);
      } catch (error) {
        this.dmContacts[dmUid] = null;
        console.error('No se pudo cargar el contacto del máster aceptante.', error);
      } finally {
        this.loadingContacts.delete(dmUid);
      }
    }));
  }
}
