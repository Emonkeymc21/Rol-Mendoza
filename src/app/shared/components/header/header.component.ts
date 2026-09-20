import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-header', templateUrl: './header.component.html', styleUrls: ['./header.component.scss'] })
export class HeaderComponent {
  menuOpen = false;
  readonly user$ = this.auth.user$;
  constructor(router: Router, private auth: AuthService) {
    router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => this.menuOpen = false);
  }
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  @HostListener('document:keydown.escape') closeMenu(): void { this.menuOpen = false; }
}
