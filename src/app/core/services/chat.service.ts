import { Injectable } from '@angular/core';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  Firestore,
  getDoc,
  getFirestore,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatConversation, ChatMessage, ChatUser } from '../models/chat.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly db: Firestore;

  constructor(private auth: AuthService) {
    const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(environment.firebase);
    this.db = getFirestore(app);
  }

  listenUsers(): Observable<ChatUser[]> {
    return new Observable(subscriber => {
      const usersQuery = query(collection(this.db, 'users'), orderBy('displayName'));
      return onSnapshot(usersQuery, snapshot => {
        const users = snapshot.docs
          .map(item => ({ uid: item.id, ...item.data() } as ChatUser))
          .filter(user => user.active !== false && user.uid !== this.auth.currentUser?.uid);
        subscriber.next(users);
      }, error => subscriber.error(error));
    });
  }

  listenConversations(): Observable<ChatConversation[]> {
    const uid = this.requireUser().uid;
    return new Observable(subscriber => {
      const conversationsQuery = query(
        collection(this.db, 'conversations'),
        where('participants', 'array-contains', uid)
      );
      return onSnapshot(conversationsQuery, snapshot => {
        const conversations = snapshot.docs
          .map(item => ({ id: item.id, ...item.data() } as ChatConversation))
          .sort((left, right) => this.millis(right.updatedAt) - this.millis(left.updatedAt));
        subscriber.next(conversations);
      }, error => subscriber.error(error));
    });
  }

  listenMessages(conversationId: string): Observable<ChatMessage[]> {
    return new Observable(subscriber => {
      const messagesQuery = query(
        collection(this.db, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'asc'),
        limitToLast(150)
      );
      return onSnapshot(messagesQuery, snapshot => {
        subscriber.next(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as ChatMessage)));
      }, error => subscriber.error(error));
    });
  }

  async ensureDirectConversation(user: Pick<ChatUser, 'uid' | 'displayName' | 'photoURL'>, game?: { id: string; title: string }): Promise<string> {
    const current = this.requireUser();
    if (current.uid === user.uid) throw new Error('No podés iniciar un chat con tu propia cuenta.');

    const participants = [current.uid, user.uid].sort();
    const conversationId = participants.join('__');
    const conversationRef = doc(this.db, 'conversations', conversationId);
    const existing = await getDoc(conversationRef);

    if (!existing.exists()) {
      await setDoc(conversationRef, {
        participants,
        participantNames: {
          [current.uid]: current.displayName || 'Aventurero/a',
          [user.uid]: user.displayName || 'Aventurero/a'
        },
        participantPhotos: {
          [current.uid]: current.photoURL || '',
          [user.uid]: user.photoURL || ''
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: '',
        lastSenderId: '',
        contextGameId: game?.id || '',
        contextGameTitle: game?.title || ''
      });
    }

    return conversationId;
  }

  async sendMessage(conversationId: string, rawText: string): Promise<void> {
    const current = this.requireUser();
    const text = rawText.trim();
    if (!text) return;
    if (text.length > 1000) throw new Error('El mensaje no puede superar los 1000 caracteres.');

    const conversationRef = doc(this.db, 'conversations', conversationId);
    const conversation = await getDoc(conversationRef);
    if (!conversation.exists()) throw new Error('La conversación ya no está disponible.');
    const participants = conversation.data()['participants'] as string[];
    if (!participants.includes(current.uid)) throw new Error('No tenés acceso a esta conversación.');

    const messageRef = doc(collection(this.db, 'conversations', conversationId, 'messages'));
    const batch = writeBatch(this.db);
    batch.set(messageRef, {
      senderId: current.uid,
      senderName: current.displayName || 'Aventurero/a',
      text,
      createdAt: serverTimestamp()
    });
    batch.update(conversationRef, {
      lastMessage: text.slice(0, 180),
      lastSenderId: current.uid,
      updatedAt: serverTimestamp()
    });
    await batch.commit();
  }

  friendlyError(error: unknown): string {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code.includes('permission-denied')) return 'No tenés permiso para abrir esta conversación.';
    if (code.includes('unavailable')) return 'El chat está temporalmente sin conexión.';
    return error instanceof Error ? error.message : 'No pudimos completar la acción en el chat.';
  }

  private requireUser() {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Necesitás iniciar sesión para usar el chat.');
    return user;
  }

  private millis(value: unknown): number {
    const timestamp = value as { toMillis?: () => number } | null;
    return timestamp && typeof timestamp.toMillis === 'function' ? timestamp.toMillis() : 0;
  }
}
