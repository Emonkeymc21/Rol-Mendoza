import { Component, ChangeDetectionStrategy } from '@angular/core';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { RoleCommunityService } from '../../core/services/role-community.service';

@Component({
    selector: 'app-communities',
    templateUrl: './communities.component.html',
    styleUrls: ['./communities.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class CommunitiesComponent {
  loadError = '';
  readonly user$ = this.auth.user$;
  readonly communities$ = this.communities.getPublished().pipe(catchError(error => {
    console.error('No se pudieron cargar las comunidades publicadas.', error);
    this.loadError = 'No pudimos cargar las comunidades en este momento.';
    return of([]);
  }));

  constructor(private communities: RoleCommunityService, private auth: AuthService) {}

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'C20';
  }
}
