import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MENDOZA_LOCATIONS } from '../../core/data/mendoza-locations';
import { RoleCommunityService } from '../../core/services/role-community.service';

@Component({
    selector: 'app-request-community',
    templateUrl: './request-community.component.html',
    styleUrls: ['./request-community.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class RequestCommunityComponent {
  readonly zones = [...MENDOZA_LOCATIONS, 'Varias localidades', 'Toda Mendoza'];
  saving = false;
  submitted = false;
  success = '';
  error = '';

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(800)]],
    zone: ['', Validators.required],
    instagramUrl: ['', Validators.pattern(/^https:\/\/.+/i)],
    discordUrl: ['', Validators.pattern(/^https:\/\/.+/i)],
    websiteUrl: ['', Validators.pattern(/^https:\/\/.+/i)],
    confirmation: [false, Validators.requiredTrue]
  });

  constructor(private fb: FormBuilder, private communities: RoleCommunityService) {}

  async submit(): Promise<void> {
    if (this.saving) return;
    this.submitted = true;
    this.success = '';
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    try {
      const { confirmation: _confirmation, ...input } = this.form.getRawValue();
      await this.communities.requestAdministration(input);
      this.success = 'Recibimos la solicitud. Vamos a verificar la identidad y los canales oficiales antes de publicar el perfil.';
      this.form.disable();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No pudimos enviar la solicitud. Intentá nuevamente.';
    } finally {
      this.saving = false;
    }
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted);
  }
}
