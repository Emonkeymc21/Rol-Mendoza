import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MENDOZA_LOCATIONS, OTHER_LOCATION, resolveLocation, splitLocation } from '../../core/data/mendoza-locations';
import { firstValueFrom } from 'rxjs';
import { COVER_FILE_LIMIT, convertHeic, prepareGameCover } from './game-cover-upload';
import { Game, PreparedGameCover } from '../../core/models/game.model';
import { AuthService } from '../../core/services/auth.service';
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
  coverError = '';
  coversEnabled = false;
  coverPreview = '';
  coverProgress: number | null = null;
  selectingCover = false;
  coverUpload?: AbortController;
  ownedGameLoaded = false;
  private originalCoverPreview = '';
  protected originalCoverVersion?: string;
  private coverFile?: Blob;
  private coverRemoved = false;
  private destroyed = false;
  private coverObjectUrl = '';
  private coverUploadId = '';
  private preparedCover?: { token: string; value: PreparedGameCover };
  readonly editing: boolean;
  private readonly gameId: string;

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
    void this.loadCoverAvailability();
    if (this.editing) {
      this.loading = true;
      this.games.getOwnedGame(this.gameId).subscribe({
        next: game => {
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
          this.originalCoverVersion = game.coverVersion;
          this.originalCoverPreview = game.coverPreview || '';
          this.coverPreview = this.originalCoverPreview;
          this.ownedGameLoaded = true;
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

  private async loadCoverAvailability(): Promise<void> {
    try {
      const response = await fetch('/api/game-cover?capability=1');
      if (response.ok) this.coversEnabled = (await response.json()).enabled === true;
    } catch {
      // Campaigns remain editable when the optional upload service is unavailable.
    }
  }

  async chooseCover(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!this.coversEnabled || !file || this.saving || this.selectingCover) return;
    this.coverError = '';
    if (!file.size || file.size > COVER_FILE_LIMIT) {
      this.coverError = 'Elegí una imagen de hasta 4 MB.';
      return;
    }

    this.selectingCover = true;
    try {
      const heic = /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
      const image = heic ? await convertHeic(file) : file;
      const url = URL.createObjectURL(image);
      try {
        const preview = new Image();
        preview.src = url;
        await preview.decode();
      } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
      }
      if (this.destroyed) {
        URL.revokeObjectURL(url);
        return;
      }
      this.resetPendingCover();
      this.coverObjectUrl = url;
      this.coverPreview = url;
      this.coverFile = image;
      this.coverUploadId = crypto.randomUUID();
      this.coverRemoved = false;
    } catch {
      this.coverError = 'No pudimos abrir esa imagen. Probá con un archivo JPG, PNG o WebP.';
    } finally {
      this.selectingCover = false;
    }
  }

  removeCover(): void {
    this.resetPendingCover();
    this.coverPreview = '';
    this.coverRemoved = Boolean(this.originalCoverVersion);
    this.coverError = '';
  }

  restoreCover(): void {
    this.resetPendingCover();
    this.coverRemoved = false;
    this.coverPreview = this.originalCoverPreview;
    this.coverError = '';
  }

  get coverChanged(): boolean {
    return Boolean(this.coverFile || this.coverRemoved);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.coverUpload?.abort();
    this.resetPendingCover();
  }

  private resetPendingCover(): void {
    if (this.coverObjectUrl) URL.revokeObjectURL(this.coverObjectUrl);
    this.coverObjectUrl = '';
    this.coverFile = undefined;
    this.preparedCover = undefined;
  }

  async save(): Promise<void> {
    if (this.saving || this.selectingCover || (this.editing && !this.ownedGameLoaded)) return;
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
      featured: false,
      coverVersion: this.originalCoverVersion
    };
    let token: string | undefined;
    let cover: PreparedGameCover | null | undefined = this.coverRemoved ? null : undefined;
    this.coverError = '';
    try {
      if (this.coverFile) {
        const controller = new AbortController();
        this.coverUpload = controller;
        this.coverProgress = 0;
        try {
          token = await this.auth.getIdToken();
          const prepared = this.preparedCover;
          cover = prepared && prepared.token === token && prepared.value.expires > Date.now() + 30000
            ? prepared.value
            : await prepareGameCover(this.coverFile, this.gameId, this.coverUploadId, token, controller.signal,
                progress => this.coverProgress = progress);
          this.preparedCover = { token, value: cover };
        } catch (error) {
          this.coverError = controller.signal.aborted
            ? 'Carga cancelada. Podés volver a intentarlo o descartar el cambio.'
            : (error as Error).message;
          return;
        } finally {
          this.coverUpload = undefined;
          this.coverProgress = null;
        }
      }

      const operation = this.editing ? this.games.updateGame(game, cover, token) : this.games.createGame(game, cover, token);
      const result = await firstValueFrom(operation);
      await this.router.navigate(['/mis-partidas'], {
        queryParams: { saved: result.gameId || result.id, action: this.editing ? 'updated' : 'published' }
      });
    } catch (error) {
      this.saveError = (error as Error)?.message || (this.editing
        ? 'No pudimos actualizar la partida. Intentá nuevamente.'
        : 'No pudimos crear la partida. Intentá nuevamente.');
    } finally {
      this.saving = false;
    }
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
