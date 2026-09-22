import { Injectable } from '@angular/core';
import { catchError, combineLatest, from, map, Observable, of, ReplaySubject, switchMap } from 'rxjs';
import {
  ApiMutationResult,
  PublicComment
} from '../models/community-api.model';
import { Game } from '../models/game.model';
import { Player, PlayerRole } from '../models/player.model';
import { UserProfile } from '../models/user-profile.model';
import { GoogleAppsScriptService } from './google-apps-script.service';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';
import { GameService } from './game.service';

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private readonly playersSubject = new ReplaySubject<Player[]>(1);
  readonly gamesLoading$ = this.games.loading$;

  constructor(
    private api: GoogleAppsScriptService,
    private auth: AuthService,
    private profiles: ProfileService,
    private games: GameService
  ) {
    this.auth.user$.pipe(switchMap(user => user
      ? this.profiles.watchOwnProfile().pipe(switchMap(own => this.profiles.isComplete(own)
        ? combineLatest([
            this.profiles.watchProfiles(),
            this.profiles.watchExcludedUserIds()
          ]).pipe(map(([profiles, excluded]) => profiles
            .filter(profile => !excluded.has(profile.uid))
            .map(profile => this.mapProfile(profile, own))
            .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))))
        : of([])
      ))
      : of([])
    ), catchError(() => of([]))).subscribe(players => this.playersSubject.next(players));
  }

  isConnected(): boolean { return this.api.enabled; }

  getPlayers(): Observable<Player[]> { return this.playersSubject.asObservable(); }
  getPlayer(id: string): Observable<Player | undefined> {
    if (this.auth.currentUser?.uid === id) {
      return from(this.profiles.getOwnProfile()).pipe(map(profile => profile ? this.mapProfile(profile, profile) : undefined));
    }
    return this.playersSubject.pipe(map(players => players.find(player => player.id === id)));
  }

  getGames(): Observable<Game[]> { return this.games.getGames(); }
  getGame(id: string): Observable<Game | undefined> { return this.games.getGame(id); }

  addGame(game: Game): Observable<ApiMutationResult> {
    return this.games.createGame(game);
  }

  getComments(gameId: string): Observable<PublicComment[]> {
    if (!this.api.enabled) return of([]);
    return this.api.getComments(gameId);
  }

  requestJoin(gameId: string, message: string): Observable<ApiMutationResult> {
    return from(this.auth.getIdToken()).pipe(switchMap(token => this.api.joinGame(gameId, message, token)));
  }

  addComment(gameId: string, comment: string): Observable<ApiMutationResult> {
    return from(this.auth.getIdToken()).pipe(switchMap(token => this.api.createComment(gameId, comment, token)));
  }

  private mapProfile(profile: UserProfile, own: UserProfile | null): Player {
    const name = profile.displayName || 'Aventurero/a';
    return {
      id: profile.uid,
      name,
      initials: this.initials(name),
      role: this.role(profile.role),
      roleCode: profile.role,
      city: profile.city,
      systems: profile.preferences.systems,
      availability: profile.preferences.availability,
      mode: profile.preferences.mode,
      experience: profile.preferences.experience,
      frequency: profile.preferences.frequency,
      atmosphere: profile.preferences.atmosphere,
      bio: profile.preferences.bio,
      lookingFor: `${profile.preferences.atmosphere}. Busca jugar con frecuencia ${profile.preferences.frequency.toLowerCase()}.`,
      accent: this.colorFor(profile.uid || name),
      avatarClass: profile.avatarClass,
      matchScore: this.compatibility(profile, own),
      verified: profile.profileCompleted
    };
  }

  private role(value: UserProfile['role']): PlayerRole {
    if (value === 'BOTH') return 'Ambos';
    if (value === 'DM') return 'Máster';
    return 'Jugador/a';
  }

  private initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'RM';
  }

  private colorFor(value: string): string {
    const palette = ['#a5363f', '#507aa1', '#8d6cb0', '#317c72', '#ba762f', '#6c7c3c'];
    const hash = Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0);
    return palette[hash % palette.length];
  }

  private normalize(value: string): string {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private compatibility(profile: UserProfile, own: UserProfile | null): number {
    if (!own) return 0;
    let score = 0;
    if (profile.city === own.city) score += 30;
    if (profile.preferences.mode === own.preferences.mode || profile.preferences.mode === 'Mixto' || own.preferences.mode === 'Mixto') score += 20;
    if (profile.preferences.frequency === own.preferences.frequency) score += 10;
    if (this.normalize(profile.preferences.atmosphere) === this.normalize(own.preferences.atmosphere)) score += 10;
    const ownSystems = new Set(own.preferences.systems.map(system => this.normalize(system)));
    score += Math.min(30, profile.preferences.systems.filter(system => ownSystems.has(this.normalize(system))).length * 15);
    return score;
  }
}
