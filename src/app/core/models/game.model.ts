export interface Game {
  id: string; title: string; system: string; gm: string; masterUserId?: string; location: string;
  mode: 'Presencial' | 'Online' | 'Mixto'; schedule: string; frequency: string;
  seats: number; totalSeats: number; level: string; summary: string; tags: string[];
  tone: string; safety: string; featured?: boolean;
}
