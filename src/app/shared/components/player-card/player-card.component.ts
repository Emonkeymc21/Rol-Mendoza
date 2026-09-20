import { Component, Input, OnInit } from '@angular/core';
import { Player } from '../../../core/models/player.model';
import { UserPrivateProfile } from '../../../core/models/user-profile.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';

@Component({ selector: 'app-player-card', templateUrl: './player-card.component.html', styleUrls: ['./player-card.component.scss'] })
export class PlayerCardComponent implements OnInit {
  @Input({ required: true }) player!: Player;
  contact?: UserPrivateProfile;

  constructor(private auth: AuthService, private profiles: ProfileService) {}

  async ngOnInit(): Promise<void> {
    if (this.auth.currentUser?.uid === this.player.id) return;
    try {
      const own = await this.profiles.getOwnProfile();
      if (this.profiles.canViewContacts(own)) this.contact = await this.profiles.getContact(this.player.id) || undefined;
    } catch {
      this.contact = undefined;
    }
  }
}
