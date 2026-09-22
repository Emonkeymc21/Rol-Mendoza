import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {
  readonly email = this.auth.currentUser?.email || '';
  checking = false;
  resending = false;
  resendLocked = false;
  loggingOut = false;
  errorMessage = '';
  notice = '';
  private readonly returnUrl: string;

  constructor(
    private auth: AuthService,
    private profiles: ProfileService,
    route: ActivatedRoute,
    private router: Router
  ) {
    const requested = route.snapshot.queryParamMap.get('returnUrl') || '/perfil';
    this.returnUrl = requested.startsWith('/') && !requested.startsWith('//')
      ? requested
      : '/perfil';
  }

  async ngOnInit(): Promise<void> {
    await this.checkVerification(true);
  }

  @HostListener('window:focus')
  async onWindowFocus(): Promise<void> {
    if (!this.checking && !this.auth.currentUser?.emailVerified) {
      await this.checkVerification(true);
    }
  }

  async checkVerification(silent = false): Promise<void> {
    if (this.checking) return;
    this.checking = true;
    this.errorMessage = '';
    if (!silent) this.notice = '';
    try {
      const user = await this.auth.refreshCurrentUser();
      if (!user.emailVerified) {
        if (!silent) this.notice = 'El correo todavía no figura como verificado. Abrí el enlace que te enviamos y volvé a intentar.';
        return;
      }
      await this.continueAfterVerification();
    } catch (error) {
      console.error('No se pudo comprobar la verificación del correo.', error);
      this.errorMessage = this.auth.friendlyError(error);
    } finally {
      this.checking = false;
    }
  }

  async resend(): Promise<void> {
    if (this.resending || this.resendLocked) return;
    this.resending = true;
    this.errorMessage = '';
    this.notice = '';
    try {
      await this.auth.sendVerificationEmail();
      this.resendLocked = true;
      this.notice = 'Te enviamos un nuevo correo. Revisá también la carpeta de spam.';
    } catch (error) {
      console.error('No se pudo reenviar el correo de verificación.', error);
      this.errorMessage = this.auth.friendlyError(error);
    } finally {
      this.resending = false;
    }
  }

  async logout(): Promise<void> {
    if (this.loggingOut) return;
    this.loggingOut = true;
    this.errorMessage = '';
    try {
      await this.auth.logout();
    } catch (error) {
      console.error('No se pudo cerrar la sesión.', error);
      this.errorMessage = 'No pudimos cerrar la sesión. Intentá nuevamente.';
      this.loggingOut = false;
    }
  }

  private async continueAfterVerification(): Promise<void> {
    try {
      const complete = await this.profiles.isOwnProfileComplete();
      if (!complete) {
        await this.router.navigate(['/completar-perfil'], {
          queryParams: { returnUrl: this.returnUrl }
        });
        return;
      }
      await this.router.navigateByUrl(this.returnUrl);
    } catch (error) {
      console.error('El correo fue verificado, pero no se pudo leer el perfil.', error);
      await this.router.navigate(['/completar-perfil'], {
        queryParams: { returnUrl: this.returnUrl, profileLoadError: '1' }
      });
    }
  }
}
