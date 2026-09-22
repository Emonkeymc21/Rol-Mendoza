import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { Game } from '../../core/models/game.model';
import { Player } from '../../core/models/player.model';
import { UserProfile } from '../../core/models/user-profile.model';
import { AuthService } from '../../core/services/auth.service';
import { CommunityService } from '../../core/services/community.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({ selector: 'app-home', templateUrl: './home.component.html', styleUrls: ['./home.component.scss'] })
export class HomeComponent {
  private readonly destroyRef = inject(DestroyRef);
  players: Player[] = [];
  games: Game[] = [];
  playerCount = 0;
  gameCount = 0;
  systemCount = 0;
  profile: UserProfile | null = null;
  isAuthenticated = false;
  private allPlayers: Player[] = [];
  private allGames: Game[] = [];
  readonly gamesLoading$ = this.community.gamesLoading$;
  searchForm = this.fb.nonNullable.group({ type: 'partidas', query: '', mode: 'Cualquier modalidad' });

  constructor(
    private fb: FormBuilder,
    private community: CommunityService,
    private router: Router,
    auth: AuthService,
    profiles: ProfileService
  ) {
    this.community.getPlayers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(players => {
      this.allPlayers = players;
      this.playerCount = players.length;
      this.players = players.slice(0, 3);
      this.updateSystemCount();
    });
    this.community.getGames().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(games => {
      this.allGames = games;
      this.gameCount = games.length;
      this.games = games.slice(0, 3);
      this.updateSystemCount();
    });
    auth.user$.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe(user => {
      this.isAuthenticated = Boolean(user);
      if (user) {
        profiles.watchOwnProfile().pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
          next: profile => this.profile = profile,
          error: () => this.profile = null
        });
      }
    });
  }

  canCreateGames(): boolean {
    return this.profile?.role === 'DM' || this.profile?.role === 'BOTH';
  }

  search(): void {
    const { type, query, mode } = this.searchForm.getRawValue();
    this.router.navigate([type === 'personas' ? '/jugadores' : '/partidas'], { queryParams: { q: query || null, mode: mode === 'Cualquier modalidad' ? null : mode } });
  }

  trackGame(_index: number, game: Game): string { return game.id; }
  trackPlayer(_index: number, player: Player): string { return player.id; }

  private updateSystemCount(): void {
    const systems = [
      ...this.allPlayers.flatMap(player => player.systems),
      ...this.allGames.map(game => game.system)
    ].map(system => system.trim().toLowerCase()).filter(Boolean);
    this.systemCount = new Set(systems).size;
  }
}
