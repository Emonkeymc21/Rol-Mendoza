import { Timestamp } from 'firebase/firestore';

export interface ChatUser {
  uid: string;
  displayName: string;
  photoURL: string;
  active: boolean;
  createdAt?: Timestamp | null;
  lastSeen?: Timestamp | null;
}

export interface ChatConversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string>;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  lastMessage: string;
  lastSenderId: string;
  contextGameId?: string;
  contextGameTitle?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt?: Timestamp | null;
}
