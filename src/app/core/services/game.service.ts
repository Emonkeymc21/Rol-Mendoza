import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, defer, from, map, Observable, of, ReplaySubject, switchMap, tap } from 'rxjs';
import { ApiMutationResult, PublicGameRow } from '../models/community-api.model';
import { Game } from '../models/game.model';
import { AuthService } from './auth.service';
import { GoogleAppsScriptService } from './google-apps-script.service';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly gamesState = new ReplaySubject<Game[]>(1);
  private readonly loadingState = new BehaviorSubject<boolean>(false);
  private readonly errorState = new BehaviorSubject<string>('');

  readonly loading$ = this.loadingState.asObservable();
  readonly error$ = this.errorState.asObservable();

  constructor(private api: GoogleAppsScriptService, private auth: AuthService) {
    this.refresh();
  }

  get enabled(): boolean {
    return this.api.enabled;
  }

  getGames(): Observable<Game[]> {
    return this.gamesState.asObservable();
  }

  getGame(id: string): Observable<Game | undefined> {
    return defer(() => this.api.getGame(id)).pipe(
      map(row => this.mapGame(row)),
      catchError(error => {
        console.error('No se pudo cargar la partida.', error);
        return of(undefined);
      })
    );
  }

  getMyGames(): Observable<Game[]> {
    return from(this.auth.getIdToken()).pipe(
      switchMap(token => this.api.getMyGames(token)),
      map(rows => rows.map(row => this.mapGame(row)))
    );
  }

  getOwnedGame(id: string): Observable<Game> {
    return from(this.auth.getIdToken()).pipe(
      switchMap(token => this.api.getOwnedGame(id, token)),
      map(row => this.mapGame(row))
    );
  }

  createGame(game: Game): Observable<ApiMutationResult> {
    return from(this.auth.getIdToken()).pipe(
      switchMap(token => this.api.createGame(game, token)),
      tap(() => this.refresh())
    );
  }

  updateGame(game: Game): Observable<ApiMutationResult> {
    return from(this.auth.getIdToken()).pipe(
      switchMap(token => this.api.updateGame(game, token)),
      tap(() => this.refresh())
    );
  }

  setStatus(gameId: string, status: Game['status']): Observable<ApiMutationResult> {
    return from(this.auth.getIdToken()).pipe(
      switchMap(token => this.api.setGameStatus(gameId, status, token)),
      tap(() => this.refresh())
    );
  }

  deleteGame(gameId: string): Observable<ApiMutationResult> {
    return from(this.auth.getIdToken()).pipe(
      switchMap(token => this.api.deleteGame(gameId, token)),
      tap(() => this.refresh())
    );
  }

  refresh(): void {
    if (!this.api.enabled) {
      this.gamesState.next([]);
      this.errorState.next('El servicio de partidas no está configurado.');
      return;
    }
    this.loadingState.next(true);
    this.errorState.next('');
    defer(() => this.api.getGames()).pipe(
      map(rows => rows.map(row => this.mapGame(row))),
      catchError(error => {
        console.error('No se pudo actualizar el listado de partidas.', error);
        this.errorState.next('No pudimos cargar las partidas. Intentá nuevamente.');
        return of([]);
      })
    ).subscribe(games => {
      this.gamesState.next(games);
      this.loadingState.next(false);
    });
  }

  private mapGame(row: PublicGameRow): Game {
    const frequency = row.frecuencia || 'A coordinar';
    const totalSeats = Number(row.cupos_totales) || 0;
    const freeSeats = Number(row.cupos_libres) || 0;
    const currentPlayers = row.jugadores_actuales === '' || row.jugadores_actuales === undefined
      ? Math.max(0, totalSeats - freeSeats)
      : Number(row.jugadores_actuales) || 0;
    return {
      id: row.partida_id,
      title: row.titulo,
      system: row.sistema,
      gm: row.master_nombre || row.master_usuario_id || 'Máster de la comunidad',
      masterUserId: row.master_usuario_id || undefined,
      creatorEmail: row.creador_email || undefined,
      city: row.ciudad || row.zona_plataforma || 'Mendoza',
      location: row.zona_plataforma,
      mode: this.mode(row.modalidad),
      date: row.fecha || '',
      time: row.hora || '',
      schedule: row.dia_horario,
      frequency,
      seats: freeSeats,
      totalSeats,
      currentPlayers,
      level: row.nivel || 'Todos los niveles',
      ageRequirement: row.edad_requerida || 'Sin requisito',
      contactMethod: row.metodo_contacto || 'Perfil del máster',
      summary: row.descripcion,
      tags: [row.sistema, this.mode(row.modalidad), frequency].filter(Boolean).slice(0, 3),
      tone: row.tono || 'A definir en sesión cero',
      safety: row.herramientas_cuidado || 'Acuerdos previos de mesa',
      status: this.status(row.estado),
      createdAt: row.creada_el,
      updatedAt: row.actualizada_el,
      featured: false
    };
  }

  private mode(value: string): Game['mode'] {
    const normalized = this.normalize(value);
    const hasOnline = normalized.includes('online') || normalized.includes('virtual') || normalized.includes('discord');
    const hasInPerson = normalized.includes('presencial');
    if (hasOnline && hasInPerson) return 'Mixto';
    if (hasOnline) return 'Online';
    return hasInPerson ? 'Presencial' : 'Mixto';
  }

  private status(value: string): Game['status'] {
    const normalized = this.normalize(value);
    if (normalized === 'active' || normalized === 'abierta') return 'ACTIVE';
    if (normalized === 'full' || normalized === 'completa') return 'FULL';
    if (normalized === 'cancelled' || normalized === 'cancelada') return 'CANCELLED';
    return 'PAUSED';
  }

  private normalize(value: string): string {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }
}
