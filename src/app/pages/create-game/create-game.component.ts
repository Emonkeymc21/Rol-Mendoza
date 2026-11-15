import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MENDOZA_LOCATIONS, OTHER_LOCATION, resolveLocation, splitLocation } from '../../core/data/mendoza-locations';
import { Subscription } from 'rxjs';
import { Game, PreparedGameCover } from '../../core/models/game.model';
import { AuthService } from '../../core/services/auth.service';
import { GameCoverService } from '../../core/services/game-cover.service';
import { GameService } from '../../core/services/game.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({
    selector: 'app-create-game', templateUrl: './create-game.component.html', styleUrls: ['./create-game.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class CreateGameComponent implements OnInit, OnDestroy {
  readonly locations = MENDOZA_LOCATIONS;
  readonly otherLocation = OTHER_LOCATION;
  readonly gameLocations = ['Discord', 'A definir', 'Otro espacio'];
  readonly safetyOptions = [
    'Lo hablaremos en la sesión cero',
    'Lo conversaremos en el grupo',
    'Otro'
  ];
  legacyGameLocation = '';
  submitted = false;
  saving = false;
  loading = false;
  saveError = '';
  readonly editing: boolean;
  private readonly gameId: string;
  private createRequestId?: string;
  private cover?: PreparedGameCover | null;
  private coverUpload?: Subscription;
  private originalPreview = '';
  coverPreview = '';
  coverError = '';
  coverProgress: number | null = null;
  canEdit = false;

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
    system: ['', [Validators.required, Validators.maxLength(100)]],
    city: ['', Validators.required],
    otherCity: ['', Validators.maxLength(80)],
    location: ['', Validators.required],
    mode: ['Presencial' as Game['mode'], Validators.required],
    date: ['', Validators.required],
    time: ['', Validators.required],
    schedule: ['', Validators.required],
    frequency: ['One-shot', Validators.required],
    seats: [5, [Validators.required, Validators.min(0), Validators.max(12)]],
    totalSeats: [5, [Validators.required, Validators.min(2), Validators.max(12)]],
    currentPlayers: [0, [Validators.required, Validators.min(0), Validators.max(12)]],
    level: ['Principiantes bienvenidos', Validators.required],
    ageRequirement: ['Sin requisito', Validators.required],
    contactMethod: ['Perfil del máster', Validators.required],
    summary: ['', [Validators.required, Validators.minLength(30), Validators.maxLength(420)]],
    tone: ['', Validators.required],
    safety: ['Lo hablaremos en la sesión cero', Validators.required],
    otherSafety: ['', Validators.maxLength(180)],
    tags: ['Narrativa, Aventura']
  });

  constructor(
    private fb: FormBuilder,
    private games: GameService,
    private covers: GameCoverService,
    private profiles: ProfileService,
    readonly auth: AuthService,
    route: ActivatedRoute,
    private router: Router
  ) {
    this.gameId = route.snapshot.paramMap.get('id') || '';
    this.editing = Boolean(this.gameId);
    this.form.controls.city.valueChanges.subscribe(() => this.updateOtherCityValidation());
    this.form.controls.safety.valueChanges.subscribe(() => this.updateOtherSafetyValidation());
    this.form.controls.totalSeats.valueChanges.subscribe(() => this.syncAvailableSeats());
    this.form.controls.currentPlayers.valueChanges.subscribe(() => this.syncAvailableSeats());
  }

  async ngOnInit(): Promise<void> {
    if (this.editing) {
      this.loading = true;
      this.games.getOwnedGame(this.gameId).subscribe({
        next: game => {
          this.originalPreview = game.coverPreview ? this.previewUrl(game.coverPreview) : '';
          this.coverPreview = this.originalPreview;
          this.canEdit = true;
          const selectedLocation = splitLocation(game.city);
          this.legacyGameLocation = game.location && !this.gameLocations.includes(game.location)
            ? game.location
            : '';
          const knownSafety = this.safetyOptions.includes(game.safety);
          this.form.patchValue({
            title: game.title, system: game.system, city: selectedLocation.city, otherCity: selectedLocation.otherCity, location: game.location,
            mode: game.mode, date: game.date, time: game.time, schedule: game.schedule,
            frequency: game.frequency, seats: game.seats, totalSeats: game.totalSeats,
            currentPlayers: game.currentPlayers, level: game.level,
            ageRequirement: game.ageRequirement, contactMethod: game.contactMethod,
            summary: game.summary, tone: game.tone,
            safety: knownSafety ? game.safety : 'Otro',
            otherSafety: knownSafety ? '' : game.safety,
            tags: game.tags.join(', ')
          });
          this.updateOtherCityValidation();
          this.updateOtherSafetyValidation();
          this.syncAvailableSeats();
          this.loading = false;
        },
        error: error => {
          console.error('No se pudo cargar la partida para editar.', error);
          this.saveError = error?.message || 'No pudimos cargar esta partida.';
          this.loading = false;
        }
      });
      return;
    }

    try {
      const profile = await this.profiles.getOwnProfile();
      if (profile?.city) this.form.patchValue(splitLocation(profile.city));
      this.updateOtherCityValidation();
      this.updateOtherSafetyValidation();
      this.syncAvailableSeats();
    } catch (error) {
      console.error('No se pudo precargar la ciudad del perfil.', error);
    }
  }

  save(): void {
    if (this.saving || this.coverProgress !== null || (this.editing && !this.canEdit)) return;
    this.submitted = true;
    this.saveError = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.saveError = 'Revisá los campos marcados antes de publicar la partida.';
      return;
    }
    const value = this.form.getRawValue();
    if (value.currentPlayers > value.totalSeats) {
      this.saveError = 'Los jugadores actuales no pueden superar el tamaño total de la mesa.';
      return;
    }
    const user = this.auth.currentUser;
    if (!user) {
      this.saveError = 'Necesitás iniciar sesión para publicar una partida.';
      return;
    }

    if (this.cover && this.cover.expires <= Math.floor(Date.now() / 1000)) {
      this.coverError = 'La carga venció. Volvé a elegir la imagen antes de guardar.';
      return;
    }
    this.saving = true;
    const { otherCity, otherSafety, ...gameValues } = value;
    const game: Game = {
      ...gameValues,
      city: resolveLocation(value.city, otherCity),
      safety: value.safety === 'Otro' ? otherSafety.trim() : value.safety,
      id: this.gameId,
      gm: user.displayName || user.email?.split('@')[0] || 'Máster de la comunidad',
      masterUserId: user.uid,
      creatorEmail: user.email || '',
      tags: value.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      status: 'ACTIVE',
      featured: false
    };
    const draft = { ...game, cover: this.cover };
    const operation = this.editing ? this.games.updateGame(draft) : this.games.createGame({
      ...draft,
      createRequestId: this.createRequestId ??= crypto.randomUUID()
    });
    operation.subscribe({
      next: async result => {
        await this.router.navigate(['/mis-partidas'], {
          queryParams: { saved: result.gameId || result.id, action: this.editing ? 'updated' : 'published' }
        });
        this.saving = false;
      },
      error: error => {
        console.error(this.editing ? 'No se pudo actualizar la partida.' : 'No se pudo crear la partida.', error);
        this.saving = false;
        this.saveError = error?.message || (this.editing
          ? 'No pudimos actualizar la partida. Intentá nuevamente.'
          : 'No pudimos crear la partida. Intentá nuevamente.');
      }
    });
  }

  chooseCover(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.saving) return;
    this.cancelCoverUpload();
    this.coverError = '';
    this.coverProgress = 0;
    this.coverUpload = this.covers.prepare(file, this.gameId, progress => {
      this.coverProgress = progress;
    }).subscribe({
      next: cover => {
        this.cover = cover;
        this.coverPreview = this.previewUrl(cover.detail);
        this.coverProgress = null;
      },
      error: error => {
        this.coverProgress = null;
        this.coverError = error.message;
      }
    });
  }

  cancelCoverUpload(): void {
    this.coverUpload?.unsubscribe();
    this.coverProgress = null;
  }

  removeCover(): void {
    this.cover = this.originalPreview ? null : undefined;
    this.coverPreview = '';
    this.coverError = '';
  }

  ngOnDestroy(): void {
    this.cancelCoverUpload();
  }

  private previewUrl(image: string): string {
    return 'data:image/webp;base64,' + image;
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted);
  }

  private updateOtherCityValidation(): void {
    const control = this.form.controls.otherCity;
    control.setValidators(this.form.controls.city.value === OTHER_LOCATION
      ? [Validators.required, Validators.minLength(2), Validators.maxLength(80)]
      : [Validators.maxLength(80)]);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private updateOtherSafetyValidation(): void {
    const control = this.form.controls.otherSafety;
    control.setValidators(this.form.controls.safety.value === 'Otro'
      ? [Validators.required, Validators.minLength(2), Validators.maxLength(180)]
      : [Validators.maxLength(180)]);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private syncAvailableSeats(): void {
    const total = Number(this.form.controls.totalSeats.value) || 0;
    const current = Number(this.form.controls.currentPlayers.value) || 0;
    this.form.controls.seats.setValue(Math.max(0, total - current), { emitEvent: false });
  }
}
