import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, shareReplay, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Game } from '../models/game.model';
import {
  ApiMutationResult,
  PublicComment,
  PublicGameRow
} from '../models/community-api.model';

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface ApiHealth {
  service: string;
  version: string;
  auth: string;
  timestamp: string;
}

const API_VERSION = '6.0.0';
const API_ACTION = Object.freeze({
  health: 'health',
  games: 'games',
  game: 'game',
  comments: 'comments',
  myGames: 'myGames',
  ownedGame: 'ownedGame',
  createGame: 'createGame',
  updateGame: 'updateGame',
  setGameStatus: 'setGameStatus',
  deleteGame: 'deleteGame',
  joinGame: 'joinGame',
  createComment: 'createComment'
});

@Injectable({ providedIn: 'root' })
export class GoogleAppsScriptService {
  private readonly webAppUrl = environment.appsScript.webAppUrl.trim().replace(/\/$/, '');
  private readonly clientId = this.getClientId();
  private compatibilityCheck$?: Observable<void>;

  constructor(private http: HttpClient) {}

  get enabled(): boolean {
    return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(this.webAppUrl);
  }

  getGames(): Observable<PublicGameRow[]> {
    return this.compatibleRequest(() => this.get<PublicGameRow[]>(API_ACTION.games));
  }

  getGame(gameId: string): Observable<PublicGameRow> {
    return this.compatibleRequest(() => this.get<PublicGameRow>(API_ACTION.game, { gameId }));
  }

  getMyGames(idToken: string): Observable<PublicGameRow[]> {
    return this.post<PublicGameRow[]>(API_ACTION.myGames, {}, idToken);
  }

  getOwnedGame(gameId: string, idToken: string): Observable<PublicGameRow> {
    return this.post<PublicGameRow>(API_ACTION.ownedGame, { gameId }, idToken);
  }

  getComments(gameId: string): Observable<PublicComment[]> {
    return this.compatibleRequest(() => this.get<PublicComment[]>(API_ACTION.comments, { gameId }));
  }

  createGame(game: Game, idToken: string): Observable<ApiMutationResult> {
    return this.post<ApiMutationResult>(API_ACTION.createGame, game, idToken);
  }

  updateGame(game: Game, idToken: string): Observable<ApiMutationResult> {
    return this.post<ApiMutationResult>(API_ACTION.updateGame, game, idToken);
  }

  setGameStatus(gameId: string, status: Game['status'], idToken: string): Observable<ApiMutationResult> {
    return this.post<ApiMutationResult>(API_ACTION.setGameStatus, { gameId, status }, idToken);
  }

  deleteGame(gameId: string, idToken: string): Observable<ApiMutationResult> {
    return this.post<ApiMutationResult>(API_ACTION.deleteGame, { gameId }, idToken);
  }

  joinGame(gameId: string, message: string, idToken: string): Observable<ApiMutationResult> {
    return this.post<ApiMutationResult>(API_ACTION.joinGame, { gameId, message }, idToken);
  }

  createComment(gameId: string, comment: string, idToken: string): Observable<ApiMutationResult> {
    return this.post<ApiMutationResult>(API_ACTION.createComment, { gameId, comment }, idToken);
  }

  private get<T>(action: string, values: Record<string, string> = {}): Observable<T> {
    this.assertEnabled();
    let params = new HttpParams().set('action', action);
    Object.entries(values).forEach(([key, value]) => params = params.set(key, value));
    return this.http.get<ApiResponse<T>>(this.webAppUrl, { params }).pipe(map(response => this.unwrap(response, action)));
  }

  private post<T>(action: string, payload: unknown, idToken = ''): Observable<T> {
    this.assertEnabled();
    const headers = new HttpHeaders({ 'Content-Type': 'text/plain;charset=utf-8' });
    const body = JSON.stringify({ apiVersion: API_VERSION, action, payload, idToken, clientId: this.clientId });
    return this.compatibleRequest(() =>
      this.http.post<ApiResponse<T>>(this.webAppUrl, body, { headers }).pipe(map(response => this.unwrap(response, action)))
    );
  }

  private compatibleRequest<T>(request: () => Observable<T>): Observable<T> {
    return this.ensureCompatible().pipe(switchMap(request));
  }

  private ensureCompatible(): Observable<void> {
    if (!this.compatibilityCheck$) {
      this.compatibilityCheck$ = this.get<ApiHealth>(API_ACTION.health).pipe(
        map(health => {
          if (health.version !== API_VERSION) {
            console.error('Versión incompatible de la API de partidas.', {
              expected: API_VERSION,
              received: health.version
            });
            throw new Error('El servicio de partidas se está actualizando. Intentá nuevamente en unos minutos.');
          }
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.compatibilityCheck$;
  }

  private unwrap<T>(response: ApiResponse<T>, action: string): T {
    if (!response.ok || response.data === undefined) {
      const error = response.error || 'La API no respondió correctamente.';
      if (/Acción (GET|POST) no válida/i.test(error)) {
        console.error('La API rechazó una acción conocida por el cliente.', { action, error });
        throw new Error('No pudimos completar la operación con la partida. Intentá nuevamente.');
      }
      throw new Error(error);
    }
    return response.data;
  }

  private assertEnabled(): void {
    if (!this.enabled) throw new Error('El servicio no está disponible en este momento.');
  }

  private getClientId(): string {
    const key = 'rol-mendoza-client-id';
    const saved = localStorage.getItem(key);
    if (saved) return saved;
    const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `browser-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, value);
    return value;
  }
}
