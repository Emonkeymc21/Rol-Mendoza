import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MENDOZA_LOCATIONS, OTHER_LOCATION, resolveLocation, splitLocation } from '../../core/data/mendoza-locations';
import { Game } from '../../core/models/game.model';
import { AuthService } from '../../core/services/auth.service';
import { GameService } from '../../core/services/game.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({ selector: 'app-create-game', templateUrl: './create-game.component.html', styleUrls: ['./create-game.component.scss'] })
export class CreateGameComponent implements OnInit {
  readonly locations = MENDOZA_LOCATIONS;
  readonly otherLocation = OTHER_LOCATION;
  readonly gameLocations = ['Discord', 'A definir', 'Aquí hay Dragones'];
  legacyGameLocation = '';
  submitted = false;
  saving = false;
  loading = false;
  saveError = '';
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
    safety: ['Líneas y velos + tarjeta X', Validators.required],
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
    this.form.controls.totalSeats.valueChanges.subscribe(() => this.syncAvailableSeats());
    this.form.controls.currentPlayers.valueChanges.subscribe(() => this.syncAvailableSeats());
  }

  async ngOnInit(): Promise<void> {
    if (this.editing) {
      this.loading = true;
      this.games.getOwnedGame(this.gameId).subscribe({
        next: game => {
          const selectedLocation = splitLocation(game.city);
          this.legacyGameLocation = game.location && !this.gameLocations.includes(game.location)
            ? game.location
            : '';
          this.form.patchValue({
            title: game.title, system: game.system, city: selectedLocation.city, otherCity: selectedLocation.otherCity, location: game.location,
            mode: game.mode, date: game.date, time: game.time, schedule: game.schedule,
            frequency: game.frequency, seats: game.seats, totalSeats: game.totalSeats,
            currentPlayers: game.currentPlayers, level: game.level,
            ageRequirement: game.ageRequirement, contactMethod: game.contactMethod,
            summary: game.summary, tone: game.tone, safety: game.safety,
            tags: game.tags.join(', ')
          });
          this.updateOtherCityValidation();
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
      this.syncAvailableSeats();
    } catch (error) {
      console.error('No se pudo precargar la ciudad del perfil.', error);
    }
  }

  save(): void {
    if (this.saving) return;
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
    const { otherCity, ...gameValues } = value;
    const game: Game = {
      ...gameValues,
      city: resolveLocation(value.city, otherCity),
      id: this.gameId,
      gm: user.displayName || user.email?.split('@')[0] || 'Máster de la comunidad',
      masterUserId: user.uid,
      creatorEmail: user.email || '',
      tags: value.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      status: 'ACTIVE',
      featured: false
    };
    const operation = this.editing ? this.games.updateGame(game) : this.games.createGame(game);
    operation.subscribe({
      next: async result => {
        this.saving = false;
        await this.router.navigate(['/mis-partidas'], {
          queryParams: { saved: result.id, action: this.editing ? 'updated' : 'published' }
        });
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

  private syncAvailableSeats(): void {
    const total = Number(this.form.controls.totalSeats.value) || 0;
    const current = Number(this.form.controls.currentPlayers.value) || 0;
    this.form.controls.seats.setValue(Math.max(0, total - current), { emitEvent: false });
  }
}
