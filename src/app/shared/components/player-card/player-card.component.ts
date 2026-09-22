import { Component, Input, OnInit } from '@angular/core';
import { Player } from '../../../core/models/player.model';
import { UserPrivateProfile } from '../../../core/models/user-profile.model';
import { AuthService } from '../../../core/services/auth.service';
import { ContactNormalizerService } from '../../../core/services/contact-normalizer.service';
import { ProfileService } from '../../../core/services/profile.service';

@Component({ selector: 'app-player-card', templateUrl: './player-card.component.html', styleUrls: ['./player-card.component.scss'] })
export class PlayerCardComponent implements OnInit {
  @Input({ required: true }) player!: Player;
  contact?: UserPrivateProfile;
  expanded = false;
  private ownName = '';

  constructor(private auth: AuthService, private profiles: ProfileService, private contacts: ContactNormalizerService) {}

  async ngOnInit(): Promise<void> {
    if (this.auth.currentUser?.uid === this.player.id) return;
    try {
      const own = await this.profiles.getOwnProfile();
      if (!this.profiles.canViewContacts(own)) return;
      this.ownName = own?.displayName || '';
      this.contact = await this.profiles.getContact(this.player.id) || undefined;
    } catch {
      this.contact = undefined;
    }
  }

  whatsappUrl(): string {
    if (!this.contact?.whatsappUrl) return '';
    const playerName = (this.player.name || 'Hola').split(' ')[0];
    const dmName = this.ownName || 'un DM de Cumbre20';
    return this.contacts.whatsappWithMessage(
      this.contact.whatsappUrl,
      `¡Hola ${playerName}! Soy ${dmName}, de Cumbre20. Vi tu perfil y me gustaría conversar sobre una partida. ¿Te interesa?`
    ) || this.contact.whatsappUrl;
  }

  bioClamped(): boolean {
    return !this.expanded && (this.player.bio || '').length > 150;
  }

  toggleBio(): void {
    this.expanded = !this.expanded;
  }
}
