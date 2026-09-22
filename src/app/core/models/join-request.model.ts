export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';

export interface GameJoinRequest {
  id: string;
  gameId: string;
  gameTitle: string;
  playerUid: string;
  playerName: string;
  dmUid: string;
  dmName: string;
  message: string;
  status: JoinRequestStatus;
  seenByDm: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  seenAt?: Date;
  resolvedAt?: Date;
}

export type NotificationType = 'JOIN_REQUEST' | 'REQUEST_APPROVED' | 'REQUEST_REJECTED' | 'GAME_CANCELLED' | 'PLAYER_REMOVED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  gameId: string;
  gameTitle: string;
  requestId: string;
  actorUid: string;
  read: boolean;
  createdAt?: Date;
  readAt?: Date;
}

export function requestStatusLabel(request: GameJoinRequest): string {
  if (request.status === 'APPROVED') return 'Aprobada';
  if (request.status === 'REJECTED') return 'No aceptada';
  if (request.status === 'REMOVED') return 'Removido de la mesa';
  return request.seenByDm ? 'Vista por el DM' : 'Pendiente';
}
