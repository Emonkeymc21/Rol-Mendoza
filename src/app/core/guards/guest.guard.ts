import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { from, map, Observable, of, switchMap, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';

@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  constructor(private auth: AuthService, private profiles: ProfileService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.user$.pipe(
      take(1),
      switchMap(user => user
        ? from(this.profiles.getOwnProfile()).pipe(map(profile => this.router.createUrlTree([
            this.profiles.isComplete(profile) ? '/mi-cuenta' : '/completar-perfil'
          ])))
        : of(true)
      )
    );
  }
}
