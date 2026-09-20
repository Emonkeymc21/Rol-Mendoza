import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { catchError, from, map, Observable, of, switchMap, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';

@Injectable({ providedIn: 'root' })
export class ProfileCompleteGuard implements CanActivate {
  constructor(private auth: AuthService, private profiles: ProfileService, private router: Router) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return this.auth.user$.pipe(
      take(1),
      switchMap(user => user
        ? from(this.profiles.isOwnProfileComplete()).pipe(
            map(complete => complete
              ? true
              : this.router.createUrlTree(['/completar-perfil'], { queryParams: { returnUrl: state.url } })),
            catchError(error => {
              console.error('No se pudo verificar el perfil completo.', error);
              return of(this.router.createUrlTree(['/completar-perfil'], {
                queryParams: { returnUrl: state.url, profileLoadError: '1' }
              }));
            })
          )
        : of(this.router.createUrlTree(['/ingresar'], { queryParams: { returnUrl: state.url } }))
      )
    );
  }
}
