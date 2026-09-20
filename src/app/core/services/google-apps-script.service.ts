import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class GoogleAppsScriptService {
  private readonly webAppUrl = environment.appsScript.webAppUrl.trim().replace(/\/$/, '');
  private readonly clientId = this.getClientId();

  constructor(private http: HttpClient) {}

  get enabled(): boolean {
    return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(this.webAppUrl);
  }

  getGames(): Observable<PublicGameRow[]> {
    return this.get<PublicGameRow[]>('games');
  }

  getGame(gameId: string): Observable<PublicGameRow> {
    return this.get<PublicGameRow>('game', { gameId });
  }

  getMyGames(idToken: string): Observable<PublicGameRow[]> {
    return this.post<PublicGameRow[]>('myGames', {}, idToken);
  }

  getOwnedGame(gameId: string, idToken: string): Observable<PublicGameRow> {
    return this.post<PublicGameRow>('ownedGame', { gameId }, idToken);
  }

  getComments(gameId: string): Observable<PublicComment[]> {
    return this.get<PublicComment[]>('comments', { gameId });
  }

  createGame(game: Game, idToken: string): Observable<ApiMutationResult> {
    return this.post<ApiMutationResult>('createGame', game, idToken);
  }

  updateGame(game: Game, idToken: string): Observable<ApiMutationResult> {
    return this.post<ApiMutationResult>('updateGame', game, idToken);
  }

  setGameStatus(gameId: string, status: Game['status'], idToken: string): Observable<ApiMutationResult> {
    return this.post<ApiMutationResult>('setGameStatus', { gameId, status }, idToken);
  }

  deleteGame(gameId: string, idToken: string): Observable<ApiMutationResult> {
    return this.post<ApiMutationResult>('deleteGame', { gameId }, idToken);
  }

  joinGame(gameId: string, message: string, idToken: string): Observable<ApiMutationResult> {
    return this.post<ApiMutationResult>('joinGame', { gameId, message }, idToken);
  }

  createComment(gameId: string, comment: string, idToken: string): Observable<ApiMutationResult> {
    return this.post<ApiMutationResult>('createComment', { gameId, comment }, idToken);
  }

  private get<T>(action: string, values: Record<string, string> = {}): Observable<T> {
    this.assertEnabled();
    let params = new HttpParams().set('action', action);
    Object.entries(values).forEach(([key, value]) => params = params.set(key, value));
    return this.http.get<ApiResponse<T>>(this.webAppUrl, { params }).pipe(map(response => this.unwrap(response)));
  }

  private post<T>(action: string, payload: unknown, idToken = ''): Observable<T> {
    this.assertEnabled();
    const headers = new HttpHeaders({ 'Content-Type': 'text/plain;charset=utf-8' });
    const body = JSON.stringify({ action, payload, idToken, clientId: this.clientId });
    return this.http.post<ApiResponse<T>>(this.webAppUrl, body, { headers }).pipe(map(response => this.unwrap(response)));
  }

  private unwrap<T>(response: ApiResponse<T>): T {
    if (!response.ok || response.data === undefined) throw new Error(response.error || 'La API no respondió correctamente.');
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
