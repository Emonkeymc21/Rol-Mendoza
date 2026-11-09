import { Component, HostListener, Input } from '@angular/core';
import { Game } from '../../../core/models/game.model';
import { GameShareService } from '../../../core/services/game-share.service';

@Component({
    selector: 'app-share-game',
    templateUrl: './share-game.component.html',
    styleUrls: ['./share-game.component.scss'],
    standalone: false
})
export class ShareGameComponent {
  @Input({ required: true }) game!: Game;
  @Input() compact = false;
  open = false;
  feedback = '';

  constructor(readonly sharing: GameShareService) {}

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.feedback = '';
    this.open = !this.open;
  }

  async shareNative(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    try {
      await this.sharing.nativeShare(this.game);
      this.open = false;
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') this.feedback = 'No pudimos abrir el menú. Podés copiar el enlace.';
    }
  }

  async copy(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    try {
      await this.sharing.copyLink(this.game.id);
      this.feedback = 'Enlace copiado';
    } catch {
      this.feedback = 'No pudimos copiarlo. Abrí el enlace y copialo desde el navegador.';
    }
  }

  stop(event: MouseEvent): void {
    event.stopPropagation();
  }

  @HostListener('document:click')
  close(): void {
    this.open = false;
  }

  @HostListener('document:keydown.escape')
  closeWithKeyboard(): void {
    this.open = false;
  }
}
