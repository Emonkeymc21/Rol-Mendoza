import type { AvatarClass } from '../data/avatar-classes';

export type PlayerRole = 'Jugador/a' | 'Máster' | 'Ambos';
export interface Player {
  id: string; name: string; initials: string; role: PlayerRole; roleCode: 'DM' | 'PLAYER' | 'BOTH'; city: string; systems: string[];
  availability: string; mode: 'Presencial' | 'Online' | 'Mixto'; experience: string;
  frequency: string; atmosphere: string; bio: string; lookingFor: string; accent: string; avatarClass: AvatarClass;
  matchScore?: number; verified?: boolean;
}
