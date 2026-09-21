import { UserProfile } from './user-profile.model';

export interface GameParticipant {
  id: string;
  gameId: string;
  playerUid: string;
  dmUid: string;
  requestId: string;
  joinedAt?: Date;
}

export interface GameParticipantView {
  participant: GameParticipant;
  profile: UserProfile | null;
}
