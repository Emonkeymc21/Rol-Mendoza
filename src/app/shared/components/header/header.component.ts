import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, HostListener, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, filter, Observable, of, switchMap } from 'rxjs';
import { roleLabel, UserProfile } from '../../../core/models/user-profile.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ThemePreference, ThemeService } from '../../../core/services/theme.service';

@Component({
    selector: 'app-header', templateUrl: './header.component.html', styleUrls: ['./header.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class HeaderComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly mobileViewportQuery = '(max-width: 767px), (min-width: 768px) and (max-width: 1023px) and (max-height: 500px) and (orientation: landscape) and (hover: none) and (pointer: coarse)';
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
    router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.closeMenu();
      this.accountMenuOpen = false;
    });
    this.destroyRef.onDestroy(() => this.document.body.classList.remove('c20-mobile-menu-open'));
    this.auth.user$.pipe(
      switchMap(user => user ? this.profiles.watchOwnProfile().pipe(catchError(() => of(null))) : of(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(profile => this.profile = profile);
  }
  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    this.accountMenuOpen = false;
    this.syncMobileScrollLock();
  }
  closeMenu(): void {
    this.menuOpen = false;
    this.syncMobileScrollLock();
  }
  private syncMobileScrollLock(): void {
    const view = this.document.defaultView;
    const mobile = typeof view?.matchMedia === 'function' && view.matchMedia(this.mobileViewportQuery).matches;
    this.document.body.classList.toggle('c20-mobile-menu-open', this.menuOpen && mobile);
  }
  @HostListener('window:resize')
  onViewportResize(): void { this.syncMobileScrollLock(); }
  @HostListener('document:keydown.tab', ['$event'])
  trapMobileNavigationFocus(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    const view = this.document.defaultView;
    if (!this.menuOpen || typeof view?.matchMedia !== 'function' || !view.matchMedia(this.mobileViewportQuery).matches) return;
    const items = Array.from(this.document.querySelectorAll<HTMLElement>('#mobile-navigation a, #mobile-navigation button:not([disabled])'));
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const active = this.document.activeElement;
    if (keyEvent.shiftKey && (active === first || active === this.document.querySelector('.menu-trigger'))) {
      keyEvent.preventDefault();
      last.focus();
    } else if (!keyEvent.shiftKey && active === last) {
      keyEvent.preventDefault();
      first.focus();
    }
  }
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
  @HostListener('document:keydown.escape') onEscape(): void {
    const wasOpen = this.menuOpen;
    this.closeMenu();
    this.accountMenuOpen = false;
    if (wasOpen) this.document.querySelector<HTMLButtonElement>('.menu-trigger')?.focus();
  }
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.accountMenuOpen = false;
    if (!this.menuOpen) return;
    const target = event.target as Node | null;
    if (!target) return;
    const nav = this.document.getElementById('mobile-navigation');
    const trigger = this.document.querySelector('.menu-trigger');
    if (nav?.contains(target) || trigger?.contains(target)) return;
    // WebKit may dispatch a tap on <html> instead of the fixed backdrop.
    // Closing from document guarantees the outside-tap action still works.
    this.closeMenu();
  }
}
