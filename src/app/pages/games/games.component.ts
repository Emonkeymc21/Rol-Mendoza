import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MENDOZA_LOCATIONS } from '../../core/data/mendoza-locations';
import { Game } from '../../core/models/game.model';
import { GameService } from '../../core/services/game.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({ selector: 'app-games', templateUrl: './games.component.html', styleUrls: ['./games.component.scss'] })
export class GamesComponent {
  readonly locations = MENDOZA_LOCATIONS;
  readonly loading$ = this.gameService.loading$;
  readonly error$ = this.gameService.error$;
  allGames: Game[] = [];
  games: Game[] = [];
  canCreate = false;
  filters = this.fb.nonNullable.group({ q: '', city: 'Todas', mode: 'Todas', frequency: 'Todas', level: 'Todos' });

  constructor(private fb: FormBuilder, private gameService: GameService, profiles: ProfileService, route: ActivatedRoute) {
    gameService.getGames().subscribe(games => { this.allGames = games; this.applyFilters(); });
    void profiles.getOwnProfile().then(profile => this.canCreate = profile?.role === 'DM' || profile?.role === 'BOTH');
    route.queryParamMap.subscribe(params => {
      this.filters.patchValue({ q: params.get('q') ?? '', mode: params.get('mode') ?? 'Todas' }, { emitEvent: false });
      this.applyFilters();
    });
    this.filters.valueChanges.subscribe(() => this.applyFilters());
  }

  reset(): void { this.filters.reset({ q: '', city: 'Todas', mode: 'Todas', frequency: 'Todas', level: 'Todos' }); }
  retry(): void { this.gameService.refresh(); }
  private applyFilters(): void {
    const { q, city, mode, frequency, level } = this.filters.getRawValue();
    const term = q.trim().toLowerCase();
    this.games = this.allGames.filter(game =>
      (!term || `${game.title} ${game.system} ${game.location} ${game.tags.join(' ')}`.toLowerCase().includes(term)) &&
      (city === 'Todas' || game.city === city) &&
      (mode === 'Todas' || game.mode === mode || game.mode === 'Mixto') &&
      (frequency === 'Todas' || game.frequency === frequency) &&
      (level === 'Todos' || game.level.toLowerCase().includes(level.toLowerCase()))
    );
  }
}
