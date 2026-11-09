import { Component, DestroyRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, take } from 'rxjs';
import { Game } from '../../core/models/game.model';
import { Player } from '../../core/models/player.model';
import { UserProfile } from '../../core/models/user-profile.model';
import { AuthService } from '../../core/services/auth.service';
import { CommunityService } from '../../core/services/community.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({
    selector: 'app-home', templateUrl: './home.component.html', styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class HomeComponent {
  private readonly destroyRef = inject(DestroyRef);
  players: Player[] = [];
  games: Game[] = [];
  playerCount: number | null = null;
  gameCount: number | null = null;
  systemCount: number | null = null;
  profile: UserProfile | null = null;
  isAuthenticated = false;
  authReady = false;
  profileReady = false;
  private allPlayers: Player[] = [];
  private allGames: Game[] = [];
  readonly gamesError$ = this.community.gamesError$;
  readonly gamesLoading$ = typeof window === 'undefined' ? of(true) : this.community.gamesLoading$;
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
      if (this.isAuthenticated) this.playerCount = players.length;
      this.players = players.slice(0, 3);
      this.updateSystemCount();
    });
    this.community.playersLoading$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(loading => {
      if (!loading && this.isAuthenticated && !this.community.playersErrorState.value) this.playerCount = this.allPlayers.length;
    });
    // Home is static HTML with honest placeholders; live activity loads once in the browser.
    if (typeof window !== 'undefined') this.community.getGames().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(games => {
      this.allGames = games;
      this.gameCount = games.length;
      this.games = games.slice(0, 3);
      this.updateSystemCount();
    });
    auth.user$.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe(user => {
      this.isAuthenticated = Boolean(user);
      this.authReady = true;
      this.playerCount = null;
      if (user) {
        profiles.watchOwnProfile().pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
          next: profile => {
            this.profile = profile;
            this.profileReady = true;
          },
          error: () => {
            this.profile = null;
            this.profileReady = true;
          }
        });
      } else {
        this.profileReady = true;
      }
    });
  }

  retryGames(): void { this.community.refreshGames(); }

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
    this.systemCount = this.gameCount === null ? null : new Set(systems).size;
  }
}
