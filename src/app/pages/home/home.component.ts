import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Game } from '../../core/models/game.model';
import { Player } from '../../core/models/player.model';
import { CommunityService } from '../../core/services/community.service';

@Component({ selector: 'app-home', templateUrl: './home.component.html', styleUrls: ['./home.component.scss'] })
export class HomeComponent {
  players: Player[] = [];
  games: Game[] = [];
  playerCount = 0;
  gameCount = 0;
  systemCount = 0;
  private allPlayers: Player[] = [];
  private allGames: Game[] = [];
  searchForm = this.fb.nonNullable.group({ type: 'partidas', query: '', mode: 'Cualquier modalidad' });

  constructor(private fb: FormBuilder, private community: CommunityService, private router: Router) {
    this.community.getPlayers().subscribe(players => {
      this.allPlayers = players;
      this.playerCount = players.length;
      this.players = players.slice(0, 3);
      this.updateSystemCount();
    });
    this.community.getGames().subscribe(games => {
      this.allGames = games;
      this.gameCount = games.length;
      this.games = games.slice(0, 3);
      this.updateSystemCount();
    });
  }

  search(): void {
    const { type, query, mode } = this.searchForm.getRawValue();
    this.router.navigate([type === 'personas' ? '/jugadores' : '/partidas'], { queryParams: { q: query || null, mode: mode === 'Cualquier modalidad' ? null : mode } });
  }

  private updateSystemCount(): void {
    const systems = [
      ...this.allPlayers.flatMap(player => player.systems),
      ...this.allGames.map(game => game.system)
    ].map(system => system.trim().toLowerCase()).filter(Boolean);
    this.systemCount = new Set(systems).size;
  }
}
