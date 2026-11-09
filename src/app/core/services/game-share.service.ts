
import { Inject, Injectable, DOCUMENT } from '@angular/core';
import { Game } from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class GameShareService {
  private readonly productionOrigin = 'https://rol-mendoza-2026.vercel.app';

  constructor(@Inject(DOCUMENT) private document: Document) {}

  publicUrl(gameId: string): string {
    const origin = this.document.location?.origin || this.productionOrigin;
    return `${origin}/compartir/partida/${encodeURIComponent(gameId)}`;
  }

  shareText(game: Game): string {
    const places = game.status === 'FULL' || game.seats <= 0
      ? 'Mesa completa'
      : `${game.seats} ${game.seats === 1 ? 'lugar disponible' : 'lugares disponibles'}`;
    return [
      `Buscamos aventureros para “${game.title}”`,
      `Sistema: ${game.system}`,
      `Modalidad: ${game.mode}`,
      `Ubicación: ${game.city}`,
      places,
      'Cumbre20 — Encontrá tu próxima mesa.'
    ].join('\n');
  }

  whatsappUrl(game: Game): string {
    return `https://wa.me/?text=${encodeURIComponent(`${this.shareText(game)}\n${this.publicUrl(game.id)}`)}`;
  }

  canUseNativeShare(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }

  async nativeShare(game: Game): Promise<void> {
    if (!this.canUseNativeShare()) throw new Error('El menú de compartir no está disponible.');
    await navigator.share({ title: `${game.title} | Cumbre20`, text: this.shareText(game), url: this.publicUrl(game.id) });
  }

  async copyLink(gameId: string): Promise<void> {
    const url = this.publicUrl(gameId);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }
    const field = this.document.createElement('textarea');
    field.value = url;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    this.document.body.appendChild(field);
    field.select();
    const copied = this.document.execCommand('copy');
    field.remove();
    if (!copied) throw new Error('No se pudo copiar el enlace.');
  }
}
