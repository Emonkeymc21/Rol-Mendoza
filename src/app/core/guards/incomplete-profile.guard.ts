import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, from, map } from 'rxjs';
import { ProfileService } from '../services/profile.service';

@Injectable({ providedIn: 'root' })
export class IncompleteProfileGuard implements CanActivate {
  constructor(private profiles: ProfileService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return from(this.profiles.getOwnProfile()).pipe(map(profile => this.profiles.isComplete(profile)
      ? this.router.createUrlTree(['/mi-cuenta'])
      : true
    ));
  }
}
