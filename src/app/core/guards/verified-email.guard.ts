import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { map, Observable, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class VerifiedEmailGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return this.auth.user$.pipe(
      take(1),
      map(user => {
        if (!user) {
          return this.router.createUrlTree(['/ingresar'], { queryParams: { returnUrl: state.url } });
        }
        return user.emailVerified
          ? true
          : this.router.createUrlTree(['/verificar-correo'], { queryParams: { returnUrl: state.url } });
      })
    );
  }
}
