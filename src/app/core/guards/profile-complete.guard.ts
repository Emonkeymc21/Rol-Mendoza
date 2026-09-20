import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, from, map } from 'rxjs';
import { ProfileService } from '../services/profile.service';

@Injectable({ providedIn: 'root' })
export class ProfileCompleteGuard implements CanActivate {
  constructor(private profiles: ProfileService, private router: Router) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return from(this.profiles.getOwnProfile()).pipe(map(profile => this.profiles.isComplete(profile)
      ? true
      : this.router.createUrlTree(['/completar-perfil'], { queryParams: { returnUrl: state.url } })
    ));
  }
}

