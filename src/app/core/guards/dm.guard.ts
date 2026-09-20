import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { catchError, from, map, Observable, of, switchMap, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';

@Injectable({ providedIn: 'root' })
export class DmGuard implements CanActivate {
  constructor(private auth: AuthService, private profiles: ProfileService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.user$.pipe(
      take(1),
      switchMap(user => user
        ? from(this.profiles.getOwnProfile()).pipe(
            map(profile => profile?.role === 'DM' || profile?.role === 'BOTH'
              ? true
              : this.router.createUrlTree(['/perfil'], { queryParams: { dmRequired: '1' } })),
            catchError(error => {
              console.error('No se pudo verificar el rol para crear una partida.', error);
              return of(this.router.createUrlTree(['/perfil'], { queryParams: { dmRequired: '1' } }));
            })
          )
        : of(this.router.createUrlTree(['/ingresar']))
      )
    );
  }
}
