import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BlockedUser, roleLabel, UserPrivateProfile, UserProfile } from '../../core/models/user-profile.model';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({ selector: 'app-account', templateUrl: './account.component.html', styleUrls: ['./account.component.scss'] })
export class AccountComponent implements OnInit {
  readonly user$ = this.auth.user$;
  profile?: UserProfile;
  privateProfile?: UserPrivateProfile;
  blockedUsers: BlockedUser[] = [];
  loading = true;
  loggingOut = false;
  deletingContact = false;
  notice = '';

  constructor(private auth: AuthService, private profiles: ProfileService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    try {
      const [profile, privateProfile, blockedUsers] = await Promise.all([
        this.profiles.getOwnProfile(),
        this.profiles.getOwnPrivateProfile(),
        this.profiles.getBlockedUsers()
      ]);
      this.profile = profile || undefined;
      this.privateProfile = privateProfile || undefined;
      this.blockedUsers = blockedUsers;
    } catch (error) {
      this.notice = error instanceof Error ? error.message : 'No pudimos cargar tu perfil.';
    } finally {
      this.loading = false;
    }
  }

  roleText(): string {
    return this.profile ? roleLabel(this.profile.role) : 'Sin completar';
  }

  async unblock(user: BlockedUser): Promise<void> {
    await this.profiles.unblockUser(user.uid);
    this.blockedUsers = this.blockedUsers.filter(item => item.uid !== user.uid);
  }

  async deleteContactData(): Promise<void> {
    if (!window.confirm('¿Eliminar tus datos de contacto? Tu perfil quedará incompleto hasta que vuelvas a cargar un WhatsApp y aceptar las condiciones.')) return;
    this.deletingContact = true;
    try {
      await this.profiles.deleteOwnContactData();
      await this.router.navigate(['/completar-perfil']);
    } finally {
      this.deletingContact = false;
    }
  }

  async logout(): Promise<void> {
    this.loggingOut = true;
    try { await this.auth.logout(); }
    finally { this.loggingOut = false; }
  }
}
