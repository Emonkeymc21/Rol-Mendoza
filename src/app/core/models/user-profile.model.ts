import type { AvatarType } from '../data/avatar-options';

export type CommunityRole = 'DM' | 'PLAYER' | 'BOTH';
export type PlayMode = 'Presencial' | 'Online' | 'Mixto';

export interface UserPreferences {
  systems: string[];
  experience: string;
  mode: PlayMode;
  frequency: string;
  availability: string;
  atmosphere: string;
  bio: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  firstName: string;
  lastName: string;
  role: CommunityRole;
  province: 'Mendoza';
  city: string;
  photoURL: string;
  avatarType: AvatarType;
  active: boolean;
  profileCompleted: boolean;
  preferences: UserPreferences;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserPrivateProfile {
  uid: string;
  whatsappNumber: string;
  whatsappUrl: string;
  instagramUsername: string;
  instagramUrl: string;
  alternatePhone: string;
  privacyConsent: boolean;
  privacyConsentAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProfileInput {
  firstName: string;
  lastName: string;
  city: string;
  role: CommunityRole;
  avatarType: AvatarType;
  whatsapp: string;
  instagram: string;
  alternatePhone: string;
  preferences: UserPreferences;
  privacyConsent: boolean;
}

export interface BlockedUser {
  uid: string;
  displayName: string;
  createdAt?: unknown;
}

export function roleLabel(role: CommunityRole): string {
  if (role === 'DM') return 'Dungeon Master / DM';
  if (role === 'BOTH') return 'Ambos';
  return 'Jugador/a';
}
