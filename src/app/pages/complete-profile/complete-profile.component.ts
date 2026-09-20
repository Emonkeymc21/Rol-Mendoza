import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MENDOZA_LOCATIONS } from '../../core/data/mendoza-locations';
import { CommunityRole, ProfileInput } from '../../core/models/user-profile.model';
import { AuthService } from '../../core/services/auth.service';
import { ContactNormalizerService } from '../../core/services/contact-normalizer.service';
import { ProfileService } from '../../core/services/profile.service';

const exactLocationValidator = (): ValidatorFn => (control: AbstractControl): ValidationErrors | null =>
  MENDOZA_LOCATIONS.includes(String(control.value || '').trim()) ? null : { location: true };

@Component({
  selector: 'app-complete-profile',
  templateUrl: './complete-profile.component.html',
  styleUrls: ['./complete-profile.component.scss']
})
export class CompleteProfileComponent implements OnInit {
  readonly locations = MENDOZA_LOCATIONS;
  readonly roles: { value: CommunityRole; label: string; detail: string }[] = [
    { value: 'DM', label: 'Dungeon Master / DM', detail: 'Dirijo partidas y busco jugadores.' },
    { value: 'PLAYER', label: 'Jugador/a', detail: 'Busco mesas y nuevas aventuras.' },
    { value: 'BOTH', label: 'Ambos', detail: 'Quiero jugar y también dirigir.' }
  ];
  readonly steps = ['Información personal', 'Tu rol', 'Contacto', 'Preferencias'];
  step = 0;
  saving = false;
  loading = true;
  errorMessage = '';
  readonly editing: boolean;
  private readonly returnUrl: string;

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    city: ['', [Validators.required, exactLocationValidator()]],
    role: ['' as CommunityRole | '', Validators.required],
    whatsapp: ['', [Validators.required, this.whatsappValidator()]],
    alternatePhone: ['', Validators.maxLength(30)],
    instagram: ['', this.instagramValidator()],
    systems: ['', [Validators.required, Validators.maxLength(240)]],
    experience: ['Estoy empezando', Validators.required],
    mode: ['Mixto' as 'Presencial' | 'Online' | 'Mixto', Validators.required],
    frequency: ['Quincenal', Validators.required],
    availability: ['', [Validators.required, Validators.maxLength(160)]],
    atmosphere: ['Me adapto al grupo', Validators.required],
    bio: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(500)]],
    privacyConsent: [false, Validators.requiredTrue]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private contacts: ContactNormalizerService,
    private profiles: ProfileService,
    route: ActivatedRoute,
    private router: Router
  ) {
    this.editing = route.snapshot.routeConfig?.path === 'perfil/editar';
    const requested = route.snapshot.queryParamMap.get('returnUrl') || '/';
    this.returnUrl = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';
  }

  async ngOnInit(): Promise<void> {
    try {
      const [profile, privateProfile] = await Promise.all([
        this.profiles.getOwnProfile(),
        this.profiles.getOwnPrivateProfile()
      ]);
      const nameParts = (this.auth.currentUser?.displayName || '').trim().split(/\s+/).filter(Boolean);
      this.form.patchValue({
        firstName: profile?.firstName || nameParts[0] || '',
        lastName: profile?.lastName || nameParts.slice(1).join(' '),
        city: profile?.city === 'Mendoza' ? '' : profile?.city || '',
        role: profile?.profileCompleted ? profile.role : '',
        whatsapp: privateProfile?.whatsappNumber || '',
        alternatePhone: privateProfile?.alternatePhone || '',
        instagram: privateProfile?.instagramUsername || '',
        systems: profile?.preferences.systems.join(', ') || '',
        experience: profile?.preferences.experience || 'Estoy empezando',
        mode: profile?.preferences.mode || 'Mixto',
        frequency: profile?.preferences.frequency || 'Quincenal',
        availability: profile?.preferences.availability || '',
        atmosphere: profile?.preferences.atmosphere || 'Me adapto al grupo',
        bio: profile?.preferences.bio && !profile.preferences.bio.startsWith('Con ganas de') ? profile.preferences.bio : '',
        privacyConsent: privateProfile?.privacyConsent === true
      });
    } catch (error) {
      console.error('No se pudo cargar el perfil para el onboarding.', error);
      this.errorMessage = this.messageFor(error);
    } finally {
      this.loading = false;
    }
  }

  get whatsappPreview(): string {
    return this.contacts.normalizeWhatsapp(this.form.controls.whatsapp.value)?.url || '';
  }

  get instagramPreview(): string {
    return this.contacts.normalizeInstagram(this.form.controls.instagram.value)?.url || '';
  }

  get bioLength(): number {
    return this.form.controls.bio.value.length;
  }

  next(): void {
    const controls = this.controlsForStep(this.step);
    controls.forEach(control => control.markAsTouched());
    if (controls.some(control => control.invalid)) return;
    this.step = Math.min(this.step + 1, this.steps.length - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  previous(): void {
    this.step = Math.max(0, this.step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToStep(index: number): void {
    if (index < this.step) this.step = index;
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  async save(): Promise<void> {
    if (this.saving) return;
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.step = this.firstInvalidStep();
      this.errorMessage = this.invalidFormMessage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const value = this.form.getRawValue();
    const input: ProfileInput = {
      firstName: value.firstName,
      lastName: value.lastName,
      city: value.city,
      role: value.role as CommunityRole,
      whatsapp: value.whatsapp,
      alternatePhone: value.alternatePhone,
      instagram: value.instagram,
      privacyConsent: value.privacyConsent,
      preferences: {
        systems: value.systems.split(/[,;|]/).map(item => item.trim()).filter(Boolean),
        experience: value.experience,
        mode: value.mode,
        frequency: value.frequency,
        availability: value.availability,
        atmosphere: value.atmosphere,
        bio: value.bio
      }
    };
    this.saving = true;
    try {
      await this.profiles.saveProfile(input);
      if (this.editing) {
        await this.router.navigate(['/perfil'], { queryParams: { updated: '1' } });
      } else {
        await this.router.navigateByUrl(this.returnUrl);
      }
    } catch (error) {
      console.error('No se pudo guardar el perfil.', error);
      this.errorMessage = this.messageFor(error);
    } finally {
      this.saving = false;
    }
  }

  private controlsForStep(step: number): AbstractControl[] {
    if (step === 0) return [this.form.controls.firstName, this.form.controls.lastName, this.form.controls.city];
    if (step === 1) return [this.form.controls.role];
    if (step === 2) return [this.form.controls.whatsapp, this.form.controls.alternatePhone, this.form.controls.instagram];
    return [
      this.form.controls.systems, this.form.controls.experience, this.form.controls.mode,
      this.form.controls.frequency, this.form.controls.availability, this.form.controls.bio,
      this.form.controls.atmosphere,
      this.form.controls.privacyConsent
    ];
  }

  private firstInvalidStep(): number {
    return [0, 1, 2, 3].find(index => this.controlsForStep(index).some(control => control.invalid)) ?? 0;
  }

  private invalidFormMessage(): string {
    const labels: Partial<Record<keyof typeof this.form.controls, string>> = {
      firstName: 'el nombre', lastName: 'el apellido', city: 'la localidad', role: 'el rol',
      whatsapp: 'el WhatsApp', instagram: 'Instagram', systems: 'los sistemas preferidos',
      availability: 'la disponibilidad', bio: 'la presentación personal',
      privacyConsent: 'el consentimiento de privacidad'
    };
    const invalid = (Object.keys(this.form.controls) as (keyof typeof this.form.controls)[])
      .filter(name => this.form.controls[name].invalid)
      .map(name => labels[name])
      .filter((label): label is string => Boolean(label));
    return invalid.length
      ? `Revisá ${invalid.join(', ')} antes de continuar.`
      : 'Revisá los campos marcados antes de continuar.';
  }

  private whatsappValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null =>
      !control.value || this.contacts.normalizeWhatsapp(String(control.value)) ? null : { whatsapp: true };
  }

  private instagramValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null =>
      !control.value || this.contacts.normalizeInstagram(String(control.value)) ? null : { instagram: true };
  }

  private messageFor(error: unknown): string {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code.includes('permission-denied')) return 'Firestore rechazó la operación. Publicá las reglas nuevas antes de probar este flujo.';
    if (code.includes('unavailable')) return 'Firestore no está disponible en este momento. Revisá tu conexión e intentá nuevamente.';
    if (code.includes('unauthenticated')) return 'Tu sesión venció. Volvé a ingresar para continuar.';
    return !code && error instanceof Error ? error.message : 'No pudimos guardar el perfil. Intentá nuevamente.';
  }
}
