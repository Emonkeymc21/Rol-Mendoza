export type GameStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'FULL';

export interface PreparedGameCover {
  uploadId: string;
  expires: number;
  card: string;
  hero: string;
  proof: string;
}

export function gameCoverUrl(game: Game, variant: 'card' | 'hero'): string {
  return game.coverVersion
    ? '/api/game-cover?' + new URLSearchParams({ gameId: game.id, version: game.coverVersion, variant })
    : '';
}

export interface Game {
  id: string;
  title: string;
  system: string;
  gm: string;
  masterUserId?: string;
  creatorEmail?: string;
  city: string;
  location: string;
  mode: 'Presencial' | 'Online' | 'Mixto';
  date: string;
  time: string;
  schedule: string;
  frequency: string;
  seats: number;
  totalSeats: number;
  currentPlayers: number;
  level: string;
  ageRequirement: string;
  contactMethod: string;
  summary: string;
  tags: string[];
  tone: string;
  safety: string;
  status: GameStatus;
  createdAt?: string;
  updatedAt?: string;
  featured?: boolean;
  coverVersion?: string;
  coverPreview?: string;
}

export type GameDraft = Omit<Game, 'id' | 'gm' | 'masterUserId' | 'creatorEmail' | 'status' | 'createdAt' | 'updatedAt'>;
