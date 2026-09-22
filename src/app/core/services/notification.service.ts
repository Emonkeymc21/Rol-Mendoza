import { Injectable } from '@angular/core';
import type { DocumentData } from 'firebase/firestore';
import { firstValueFrom, map, Observable, shareReplay } from 'rxjs';
import { AppNotification, GameJoinRequest, JoinRequestStatus } from '../models/join-request.model';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { GameService } from './game.service';
import { GoogleAppsScriptService } from './google-apps-script.service';
import { ApiMutationResult } from '../models/community-api.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notifications$: Observable<AppNotification[]>;
  readonly unreadCount$: Observable<number>;
  private myRequests$?: Observable<GameJoinRequest[]>;
  private dmRequests$?: Observable<GameJoinRequest[]>;
  private activeUid = '';

  constructor(
    private auth: AuthService,
    private firebase: FirebaseService,
    private api: GoogleAppsScriptService,
    private games: GameService
  ) {
    this.notifications$ = this.watchNotifications().pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.unreadCount$ = this.notifications$.pipe(map(items => items.filter(item => !item.read).length));
    this.auth.user$.subscribe(user => {
      const nextUid = user?.uid || '';
      if (nextUid === this.activeUid) return;
      this.activeUid = nextUid;
      this.myRequests$ = undefined;
      this.dmRequests$ = undefined;
    });
  }

  watchMyRequests(): Observable<GameJoinRequest[]> {
    if (!this.myRequests$) {
      this.myRequests$ = this.watchRequests('playerUid').pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }
    return this.myRequests$;
  }

  watchDmRequests(): Observable<GameJoinRequest[]> {
    if (!this.dmRequests$) {
      this.dmRequests$ = this.watchRequests('dmUid').pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }
    return this.dmRequests$;
  }

  watchNotifications(): Observable<AppNotification[]> {
    return new Observable(subscriber => {
      let stopped = false;
      let unsubscribe: (() => void) | undefined;
      void this.loadFirestore().then(({ api, database }) => {
        if (stopped) return;
        const uid = this.requireUid();
        const notifications = api.query(
          api.collection(database, 'users', uid, 'notifications'),
          api.orderBy('createdAt', 'desc'),
          api.limit(60)
        );
        unsubscribe = api.onSnapshot(notifications, snapshot => {
          subscriber.next(snapshot.docs.map(item => this.mapNotification(item.data())));
        }, error => subscriber.error(error));
      }).catch(error => subscriber.error(error));
      return () => { stopped = true; unsubscribe?.(); };
    });
  }

  async markSeen(request: GameJoinRequest): Promise<void> {
    if (request.seenByDm) return;
    const uid = this.requireUid();
    if (request.dmUid !== uid) throw new Error('No tenés permisos para abrir esta solicitud.');
    const { api, database } = await this.loadFirestore();
    await api.updateDoc(api.doc(database, 'gameJoinRequests', request.id), {
      seenByDm: true,
      seenAt: api.serverTimestamp(),
      updatedAt: api.serverTimestamp()
    });
  }

  async resolve(request: GameJoinRequest, status: Exclude<JoinRequestStatus, 'PENDING' | 'REMOVED'>): Promise<ApiMutationResult> {
    const uid = this.requireUid();
    if (request.dmUid !== uid) throw new Error('No tenés permisos para resolver esta solicitud.');
    if (request.status !== 'PENDING') throw new Error('Esta solicitud ya fue resuelta.');
    const token = await this.auth.getIdToken();
    const result = await firstValueFrom(this.api.resolveJoinRequest(request.id, status, token));
    this.games.refresh();
    return result;
  }

  async removeParticipant(gameId: string, playerUid: string): Promise<ApiMutationResult> {
    const uid = this.requireUid();
    if (!gameId || !playerUid) throw new Error('Faltan datos para remover al jugador.');
    if (playerUid === uid) throw new Error('No podés removerte de tu propia partida.');
    const token = await this.auth.getIdToken();
    const result = await firstValueFrom(this.api.removeParticipant(gameId, playerUid, token));
    this.games.refresh();
    return result;
  }

  async markRead(notification: AppNotification): Promise<void> {
    if (notification.read) return;
    const uid = this.requireUid();
    const { api, database } = await this.loadFirestore();
    await api.updateDoc(api.doc(database, 'users', uid, 'notifications', notification.id), {
      read: true,
      readAt: api.serverTimestamp()
    });
  }

  async markJoinNotificationRead(requestId: string): Promise<void> {
    const uid = this.requireUid();
    const { api, database } = await this.loadFirestore();
    const reference = api.doc(database, 'users', uid, 'notifications', `join-${requestId}`);
    const snapshot = await api.getDoc(reference);
    if (!snapshot.exists() || snapshot.data()['read'] === true) return;
    await api.updateDoc(reference, { read: true, readAt: api.serverTimestamp() });
  }

  async markAllRead(notifications: AppNotification[]): Promise<void> {
    const pending = notifications.filter(item => !item.read);
    if (!pending.length) return;
    const uid = this.requireUid();
    const { api, database } = await this.loadFirestore();
    const batch = api.writeBatch(database);
    pending.forEach(item => batch.update(api.doc(database, 'users', uid, 'notifications', item.id), {
      read: true,
      readAt: api.serverTimestamp()
    }));
    await batch.commit();
  }

  private watchRequests(field: 'playerUid' | 'dmUid'): Observable<GameJoinRequest[]> {
    return new Observable(subscriber => {
      let stopped = false;
      let unsubscribe: (() => void) | undefined;
      void this.loadFirestore().then(({ api, database }) => {
        if (stopped) return;
        const requests = api.query(
          api.collection(database, 'gameJoinRequests'),
          api.where(field, '==', this.requireUid())
        );
        unsubscribe = api.onSnapshot(requests, snapshot => {
          const items = snapshot.docs.map(item => this.mapRequest(item.data()));
          items.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
          subscriber.next(items);
        }, error => subscriber.error(error));
      }).catch(error => subscriber.error(error));
      return () => { stopped = true; unsubscribe?.(); };
    });
  }

  private mapRequest(data: DocumentData): GameJoinRequest {
    return {
      id: String(data['id'] || ''),
      gameId: String(data['gameId'] || ''),
      gameTitle: String(data['gameTitle'] || 'Partida'),
      playerUid: String(data['playerUid'] || ''),
      playerName: String(data['playerName'] || 'Jugador/a'),
      dmUid: String(data['dmUid'] || ''),
      dmName: String(data['dmName'] || 'Dungeon Master'),
      message: String(data['message'] || ''),
      status: data['status'] === 'APPROVED' || data['status'] === 'REJECTED' || data['status'] === 'REMOVED' ? data['status'] : 'PENDING',
      seenByDm: data['seenByDm'] === true,
      createdAt: this.toDate(data['createdAt']),
      updatedAt: this.toDate(data['updatedAt']),
      seenAt: this.toDate(data['seenAt']),
      resolvedAt: this.toDate(data['resolvedAt'])
    };
  }

  private mapNotification(data: DocumentData): AppNotification {
    const rawType = String(data['type'] || 'JOIN_REQUEST');
    const type = rawType === 'REQUEST_APPROVED' || rawType === 'REQUEST_REJECTED'
      || rawType === 'GAME_CANCELLED' || rawType === 'PLAYER_REMOVED'
      ? rawType : 'JOIN_REQUEST';
    return {
      id: String(data['id'] || ''), type,
      title: String(data['title'] || 'Nueva notificación'),
      message: String(data['message'] || ''),
      gameId: String(data['gameId'] || ''),
      gameTitle: String(data['gameTitle'] || ''),
      requestId: String(data['requestId'] || ''),
      actorUid: String(data['actorUid'] || ''),
      read: data['read'] === true,
      createdAt: this.toDate(data['createdAt']),
      readAt: this.toDate(data['readAt'])
    };
  }

  private toDate(value: unknown): Date | undefined {
    if (value && typeof value === 'object' && 'toDate' in value) {
      const timestamp = value as { toDate?: () => Date };
      if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    }
    if (value instanceof Date) return value;
    return undefined;
  }

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Necesitás iniciar sesión para continuar.');
    return uid;
  }

  private async loadFirestore() {
    if (!this.firebase.app) throw new Error('Firestore no está disponible en este momento.');
    const api = await import('firebase/firestore');
    return { api, database: api.getFirestore(this.firebase.app) };
  }
}
