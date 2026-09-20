export type GameStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'FULL';

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
}

export type GameDraft = Omit<Game, 'id' | 'gm' | 'masterUserId' | 'creatorEmail' | 'status' | 'createdAt' | 'updatedAt'>;
