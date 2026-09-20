import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { catchError, from, map, Observable, of, switchMap, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';

@Injectable({ providedIn: 'root' })
export class IncompleteProfileGuard implements CanActivate {
  constructor(private auth: AuthService, private profiles: ProfileService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.user$.pipe(
      take(1),
      switchMap(user => user
        ? from(this.profiles.isOwnProfileComplete()).pipe(
            map(complete => complete ? this.router.createUrlTree(['/perfil']) : true),
            catchError(error => {
              console.error('No se pudo comprobar el estado del onboarding.', error);
              return of(true);
            })
          )
        : of(this.router.createUrlTree(['/ingresar']))
      )
    );
  }
}
