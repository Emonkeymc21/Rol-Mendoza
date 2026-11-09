import { bindFilterUrl } from '../../core/data/filter-url-state';
import { Component, DestroyRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { matchesLocation, MENDOZA_LOCATIONS, normalizeSearch } from '../../core/data/mendoza-locations';
import { Player } from '../../core/models/player.model';
import { CommunityService } from '../../core/services/community.service';

@Component({
    selector: 'app-players', templateUrl: './players.component.html', styleUrls: ['./players.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class PlayersComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly loading$ = this.community.playersLoading$;
  readonly error$ = this.community.playersError$;
  allPlayers: Player[] = [];
  players: Player[] = [];
  filters = this.fb.nonNullable.group({ q: '', role: 'Todos', mode: 'Todas', city: 'Todas' });
  readonly cities = ['Todas', ...MENDOZA_LOCATIONS];

  constructor(private fb: FormBuilder, private community: CommunityService, route: ActivatedRoute, router: Router) {
    this.community.getPlayers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(players => { this.allPlayers = players; this.applyFilters(); });
    bindFilterUrl(this.filters, route, router, this.destroyRef, { q: null, city: ['Todas', ...MENDOZA_LOCATIONS], mode: ['Todas', 'Presencial', 'Online', 'Mixto'], role: ['Todos', 'Jugador/a', 'Máster', 'Ambos'] }, () => this.applyFilters());
    this.filters.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.applyFilters());
  }

  reset(): void { this.filters.reset({ q: '', role: 'Todos', mode: 'Todas', city: 'Todas' }); }
  trackPlayer(_index: number, player: Player): string { return player.id; }
  private applyFilters(): void {
    const { q, role, mode, city } = this.filters.getRawValue();
    const term = normalizeSearch(q);
    this.players = this.allPlayers.filter(player =>
      (!term || normalizeSearch(`${player.name} ${player.city} ${player.systems.join(' ')}`).includes(term)) &&
      (role === 'Todos' || player.role === role || player.role === 'Ambos') &&
      (mode === 'Todas' || player.mode === mode || player.mode === 'Mixto') &&
      matchesLocation(player.city, city)
    );
  }
}
