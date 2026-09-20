import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MENDOZA_LOCATIONS } from '../../core/data/mendoza-locations';
import { Player } from '../../core/models/player.model';
import { CommunityService } from '../../core/services/community.service';

@Component({ selector: 'app-players', templateUrl: './players.component.html', styleUrls: ['./players.component.scss'] })
export class PlayersComponent {
  allPlayers: Player[] = [];
  players: Player[] = [];
  filters = this.fb.nonNullable.group({ q: '', role: 'Todos', mode: 'Todas', city: 'Todas' });
  readonly cities = ['Todas', ...MENDOZA_LOCATIONS];

  constructor(private fb: FormBuilder, private community: CommunityService, route: ActivatedRoute) {
    this.community.getPlayers().subscribe(players => { this.allPlayers = players; this.applyFilters(); });
    route.queryParamMap.subscribe(params => {
      this.filters.patchValue({ q: params.get('q') ?? '', mode: params.get('mode') ?? 'Todas' }, { emitEvent: false });
      this.applyFilters();
    });
    this.filters.valueChanges.subscribe(() => this.applyFilters());
  }

  reset(): void { this.filters.reset({ q: '', role: 'Todos', mode: 'Todas', city: 'Todas' }); }
  private applyFilters(): void {
    const { q, role, mode, city } = this.filters.getRawValue();
    const term = q.trim().toLowerCase();
    this.players = this.allPlayers.filter(player =>
      (!term || `${player.name} ${player.city} ${player.systems.join(' ')}`.toLowerCase().includes(term)) &&
      (role === 'Todos' || player.role === role || player.role === 'Ambos') &&
      (mode === 'Todas' || player.mode === mode || player.mode === 'Mixto') &&
      (city === 'Todas' || player.city === city)
    );
  }
}
