import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { catchError, from, map, Observable, of, switchMap, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';

@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  constructor(private auth: AuthService, private profiles: ProfileService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.user$.pipe(
      take(1),
      switchMap(user => user
        ? !user.emailVerified
          ? of(this.router.createUrlTree(['/verificar-correo']))
          : from(this.profiles.isOwnProfileComplete()).pipe(
            map(complete => this.router.createUrlTree([
              complete ? '/perfil' : '/completar-perfil'
            ])),
            catchError(error => {
              console.error('No se pudo cargar el perfil al entrar a una ruta pública.', error);
              return of(this.router.createUrlTree(['/completar-perfil'], {
                queryParams: { profileLoadError: '1' }
              }));
            })
          )
        : of(true)
      )
    );
  }
}
