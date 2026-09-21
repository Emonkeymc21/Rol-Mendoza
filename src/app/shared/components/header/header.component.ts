import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, filter, Observable, of, switchMap } from 'rxjs';
import { roleLabel, UserProfile } from '../../../core/models/user-profile.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ThemePreference, ThemeService } from '../../../core/services/theme.service';

@Component({ selector: 'app-header', templateUrl: './header.component.html', styleUrls: ['./header.component.scss'] })
export class HeaderComponent {
  menuOpen = false;
  accountMenuOpen = false;
  profile: UserProfile | null = null;
  loggingOut = false;
  readonly user$ = this.auth.user$;
  readonly unreadCount$: Observable<number>;
  themePreference: ThemePreference;
  constructor(private router: Router, private auth: AuthService, private profiles: ProfileService, notifications: NotificationService, private theme: ThemeService) {
    this.unreadCount$ = notifications.unreadCount$;
    this.themePreference = theme.preference;
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
  setTheme(preference: ThemePreference): void {
    this.themePreference = preference;
    this.theme.setPreference(preference);
  }
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
