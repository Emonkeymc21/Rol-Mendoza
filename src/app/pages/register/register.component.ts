import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({ selector: 'app-register', templateUrl: './register.component.html', styleUrls: ['./register.component.scss'] })
export class RegisterComponent {
  saving = false;
  googleSaving = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
    terms: [false, Validators.requiredTrue]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private profiles: ProfileService,
    private router: Router
  ) {}

  async register(): Promise<void> {
    if (this.saving || this.googleSaving) return;
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (value.password !== value.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.saving = true;
    try {
      await this.auth.registerWithEmail(value.displayName, value.email, value.password);
      await this.router.navigate(['/completar-perfil']);
    } catch (error) {
      console.error('No se pudo completar el registro con correo.', error);
      this.errorMessage = this.auth.friendlyError(error);
    } finally {
      this.saving = false;
    }
  }

  async registerWithGoogle(): Promise<void> {
    if (this.googleSaving || this.saving) return;
    this.errorMessage = '';
    this.googleSaving = true;
    try {
      await this.auth.signInWithGoogle();
      try {
        const complete = await this.profiles.isOwnProfileComplete();
        await this.router.navigate([complete ? '/perfil' : '/completar-perfil']);
      } catch (error) {
        console.error('No se pudo leer el perfil después del registro con Google.', error);
        await this.router.navigate(['/completar-perfil'], { queryParams: { profileLoadError: '1' } });
      }
    } catch (error) {
      console.error('No se pudo completar el acceso con Google.', error);
      this.errorMessage = this.auth.friendlyError(error);
    } finally {
      this.googleSaving = false;
    }
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted);
  }
}
