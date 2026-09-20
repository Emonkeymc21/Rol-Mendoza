import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Player } from '../../core/models/player.model';
import { UserPrivateProfile, UserProfile } from '../../core/models/user-profile.model';
import { AuthService } from '../../core/services/auth.service';
import { CommunityService } from '../../core/services/community.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({ selector: 'app-player-detail', templateUrl: './player-detail.component.html', styleUrls: ['./player-detail.component.scss'] })
export class PlayerDetailComponent {
  player?: Player;
  targetProfile?: UserProfile;
  contact?: UserPrivateProfile;
  canViewContacts = false;
  isOwnProfile = false;
  blocking = false;
  notice = '';

  constructor(
    route: ActivatedRoute,
    community: CommunityService,
    private auth: AuthService,
    private profiles: ProfileService,
    private router: Router
  ) {
    const id = route.snapshot.paramMap.get('id') ?? '';
    community.getPlayer(id).subscribe(player => {
      this.player = player;
      if (player) void this.loadPrivateState(id);
    });
  }

  async block(): Promise<void> {
    if (!this.targetProfile || !window.confirm(`¿Bloquear a ${this.targetProfile.displayName}? Dejarán de verse y no podrá consultar tus datos de contacto.`)) return;
    this.blocking = true;
    try {
      await this.profiles.blockUser(this.targetProfile);
      await this.router.navigate(['/jugadores']);
    } catch (error) {
      this.notice = error instanceof Error ? error.message : 'No pudimos bloquear al usuario.';
      this.blocking = false;
    }
  }

  private async loadPrivateState(id: string): Promise<void> {
    try {
      const [own, target] = await Promise.all([this.profiles.getOwnProfile(), this.profiles.getProfile(id)]);
      this.targetProfile = target || undefined;
      this.isOwnProfile = this.auth.currentUser?.uid === id;
      this.canViewContacts = !this.isOwnProfile && this.profiles.canViewContacts(own);
      if (this.canViewContacts) this.contact = await this.profiles.getContact(id) || undefined;
    } catch {
      this.contact = undefined;
    }
  }
}
