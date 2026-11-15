import { Game } from '../models/game.model';

export function gameCoverUrl(game: Game, variant: 'card' | 'detail'): string {
  if (!game.coverVersion) return '';
  return '/portadas/' + encodeURIComponent(game.id) + '/' + game.coverVersion + '/' + variant;
}
