import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, filter, of, switchMap } from 'rxjs';
import { roleLabel, UserProfile } from '../../../core/models/user-profile.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';

@Component({ selector: 'app-header', templateUrl: './header.component.html', styleUrls: ['./header.component.scss'] })
export class HeaderComponent {
  menuOpen = false;
  accountMenuOpen = false;
  profile: UserProfile | null = null;
  loggingOut = false;
  readonly user$ = this.auth.user$;
  constructor(private router: Router, private auth: AuthService, private profiles: ProfileService) {
    router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.menuOpen = false;
      this.accountMenuOpen = false;
    });
    this.auth.user$.pipe(
      switchMap(user => user ? this.profiles.watchOwnProfile().pipe(catchError(() => of(null))) : of(null))
    ).subscribe(profile => this.profile = profile);
  }
  toggleMenu(): void { this.menuOpen = !this.menuOpen; this.accountMenuOpen = false; }
  toggleAccountMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.accountMenuOpen = !this.accountMenuOpen;
  }
  canCreateGames(): boolean { return this.profile?.role === 'DM' || this.profile?.role === 'BOTH'; }
  roleText(): string { return this.profile ? roleLabel(this.profile.role) : 'Comunidad'; }
  initials(name: string | null | undefined): string {
    return (name || 'RM').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
  }
  async logout(): Promise<void> {
    if (this.loggingOut) return;
    this.loggingOut = true;
    try { await this.auth.logout(); }
    catch (error) { console.error('No se pudo cerrar la sesión.', error); }
    finally { this.loggingOut = false; }
  }
  @HostListener('document:keydown.escape') closeMenu(): void {
    this.menuOpen = false;
    this.accountMenuOpen = false;
  }
  @HostListener('document:click') closeAccountMenu(): void { this.accountMenuOpen = false; }
}
