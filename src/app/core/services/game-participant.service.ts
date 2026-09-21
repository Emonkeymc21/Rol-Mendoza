import { Injectable } from '@angular/core';
import type { DocumentData, QueryFieldFilterConstraint } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { GameParticipant, GameParticipantView } from '../models/game-participant.model';
import { FirebaseService } from './firebase.service';
import { ProfileService } from './profile.service';

@Injectable({ providedIn: 'root' })
export class GameParticipantService {
  constructor(private firebase: FirebaseService, private profiles: ProfileService) {}

  watchGame(gameId: string): Observable<GameParticipantView[]> {
    return this.watch('gameId', gameId);
  }

  watchOwned(dmUid: string): Observable<GameParticipantView[]> {
    return this.watch('dmUid', dmUid);
  }

  private watch(field: 'gameId' | 'dmUid', value: string): Observable<GameParticipantView[]> {
    return new Observable(subscriber => {
      let stopped = false;
      let unsubscribe: (() => void) | undefined;
      let revision = 0;
      void this.loadFirestore().then(({ api, database }) => {
        if (stopped) return;
        const filter = api.where(field, '==', value) as QueryFieldFilterConstraint;
        const participants = api.query(api.collection(database, 'gameParticipants'), filter);
        unsubscribe = api.onSnapshot(participants, snapshot => {
          const currentRevision = ++revision;
          const items = snapshot.docs.map(item => this.mapParticipant(item.data()));
          void Promise.all(items.map(async participant => ({
            participant,
            profile: await this.profiles.getProfile(participant.playerUid)
          }))).then(views => {
            if (!stopped && currentRevision === revision) {
              views.sort((a, b) => (a.participant.joinedAt?.getTime() || 0) - (b.participant.joinedAt?.getTime() || 0));
              subscriber.next(views);
            }
          }).catch(error => subscriber.error(error));
        }, error => subscriber.error(error));
      }).catch(error => subscriber.error(error));
      return () => { stopped = true; unsubscribe?.(); };
    });
  }

  private mapParticipant(data: DocumentData): GameParticipant {
    return {
      id: String(data['id'] || ''),
      gameId: String(data['gameId'] || ''),
      playerUid: String(data['playerUid'] || ''),
      dmUid: String(data['dmUid'] || ''),
      requestId: String(data['requestId'] || ''),
      joinedAt: this.toDate(data['joinedAt'])
    };
  }

  private toDate(value: unknown): Date | undefined {
    if (value && typeof value === 'object' && 'toDate' in value) {
      const timestamp = value as { toDate?: () => Date };
      if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    }
    return value instanceof Date ? value : undefined;
  }

  private async loadFirestore() {
    if (!this.firebase.app) throw new Error('Firestore no está disponible en este momento.');
    const api = await import('firebase/firestore');
    return { api, database: api.getFirestore(this.firebase.app) };
  }
}
