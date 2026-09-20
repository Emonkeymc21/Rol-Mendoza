import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExternalLinksService {
  readonly registrationUrl = environment.googleForms.registrationUrl;
  readonly joinGameUrl = environment.googleForms.joinGameUrl;
  readonly createGameUrl = environment.googleForms.createGameUrl;
  open(url: string): boolean {
    if (!url) return false;
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }

  registrationUrlFor(displayName = ''): string {
    if (!this.registrationUrl) return '';
    const url = new URL(this.registrationUrl);
    if (displayName.trim()) url.searchParams.set('entry.592377339', displayName.trim());
    return url.toString();
  }

  go(url: string): boolean {
    if (!url) return false;
    window.location.assign(url);
    return true;
  }
}
