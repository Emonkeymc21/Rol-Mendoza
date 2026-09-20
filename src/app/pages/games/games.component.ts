import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Game } from '../../core/models/game.model';
import { CommunityService } from '../../core/services/community.service';

@Component({ selector: 'app-games', templateUrl: './games.component.html', styleUrls: ['./games.component.scss'] })
export class GamesComponent {
  allGames: Game[] = [];
  games: Game[] = [];
  filters = this.fb.nonNullable.group({ q: '', mode: 'Todas', frequency: 'Todas', level: 'Todos' });

  constructor(private fb: FormBuilder, community: CommunityService, route: ActivatedRoute) {
    community.getGames().subscribe(games => { this.allGames = games; this.applyFilters(); });
    route.queryParamMap.subscribe(params => {
      this.filters.patchValue({ q: params.get('q') ?? '', mode: params.get('mode') ?? 'Todas' }, { emitEvent: false });
      this.applyFilters();
    });
    this.filters.valueChanges.subscribe(() => this.applyFilters());
  }

  reset(): void { this.filters.reset({ q: '', mode: 'Todas', frequency: 'Todas', level: 'Todos' }); }
  private applyFilters(): void {
    const { q, mode, frequency, level } = this.filters.getRawValue();
    const term = q.trim().toLowerCase();
    this.games = this.allGames.filter(game =>
      (!term || `${game.title} ${game.system} ${game.location} ${game.tags.join(' ')}`.toLowerCase().includes(term)) &&
      (mode === 'Todas' || game.mode === mode || game.mode === 'Mixto') &&
      (frequency === 'Todas' || game.frequency === frequency) &&
      (level === 'Todos' || game.level.toLowerCase().includes(level.toLowerCase()))
    );
  }
}
