import { Component } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { SeoService } from './core/services/seo.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Cumbre20';
  readonly authLoading$ = this.auth.loading$;

  constructor(private auth: AuthService, seo: SeoService) {
    seo.start();
  }
}
