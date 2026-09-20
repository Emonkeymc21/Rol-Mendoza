import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({ selector: 'app-login', templateUrl: './login.component.html', styleUrls: ['./login.component.scss'] })
export class LoginComponent {
  saving = false;
  googleSaving = false;
  resetting = false;
  errorMessage = '';
  notice = '';
  private readonly returnUrl: string;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private profiles: ProfileService,
    route: ActivatedRoute,
    private router: Router
  ) {
    const requested = route.snapshot.queryParamMap.get('returnUrl') || '/perfil';
    this.returnUrl = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/perfil';
  }

  async login(): Promise<void> {
    if (this.saving || this.googleSaving) return;
    this.errorMessage = '';
    this.notice = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    this.saving = true;
    try {
      await this.auth.signInWithEmail(value.email, value.password);
      await this.continueAfterLogin();
    } catch (error) {
      console.error('No se pudo iniciar sesión con correo.', error);
      this.errorMessage = this.auth.friendlyError(error);
    } finally {
      this.saving = false;
    }
  }

  async loginWithGoogle(): Promise<void> {
    if (this.googleSaving || this.saving) return;
    this.errorMessage = '';
    this.googleSaving = true;
    try {
      await this.auth.signInWithGoogle();
      await this.continueAfterLogin();
    } catch (error) {
      console.error('No se pudo iniciar sesión con Google.', error);
      this.errorMessage = this.auth.friendlyError(error);
    } finally {
      this.googleSaving = false;
    }
  }

  async resetPassword(): Promise<void> {
    const email = this.form.controls.email.value;
    if (!email || this.form.controls.email.invalid) {
      this.errorMessage = 'Escribí primero un correo válido.';
      return;
    }
    this.errorMessage = '';
    this.resetting = true;
    try {
      await this.auth.resetPassword(email);
      this.notice = 'Te enviamos un enlace para cambiar la contraseña.';
    } catch (error) {
      console.error('No se pudo enviar el correo para restablecer la contraseña.', error);
      this.errorMessage = this.auth.friendlyError(error);
    } finally {
      this.resetting = false;
    }
  }

  private async continueAfterLogin(): Promise<void> {
    try {
      const complete = await this.profiles.isOwnProfileComplete();
      if (!complete) {
        await this.router.navigate(['/completar-perfil'], { queryParams: { returnUrl: this.returnUrl } });
        return;
      }
      await this.router.navigateByUrl(this.returnUrl);
    } catch (error) {
      console.error('No se pudo leer el perfil después del login.', error);
      await this.router.navigate(['/completar-perfil'], {
        queryParams: { returnUrl: this.returnUrl, profileLoadError: '1' }
      });
    }
  }
}
