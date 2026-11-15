import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, HostListener, Inject, Input, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { Game } from '../../../core/models/game.model';
import { GameShareService } from '../../../core/services/game-share.service';

@Component({
    selector: 'app-share-game',
    templateUrl: './share-game.component.html',
    styleUrls: ['./share-game.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ShareGameComponent {
  @ViewChild('shareTrigger') private shareTrigger?: ElementRef<HTMLButtonElement>;
  @Input({ required: true }) game!: Game;
  @Input() compact = false;
  open = false;
  feedback = '';

  constructor(readonly sharing: GameShareService, private readonly element: ElementRef<HTMLElement>, @Inject(DOCUMENT) private readonly document: Document) {}

  private isMobileLayout(): boolean {
    const view = this.document.defaultView;
    return typeof view?.matchMedia === 'function' && view.matchMedia('(max-width: 767px), (min-width: 768px) and (max-width: 1023px) and (max-height: 500px) and (orientation: landscape) and (hover: none) and (pointer: coarse)').matches;
  }

  @HostListener('document:keydown', ['$event'])
  containMobileFocus(event: Event): void {
    const key = event as KeyboardEvent;
    if (!this.open || !this.isMobileLayout()) return;
    const items = Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>('.share-menu [role="menuitem"]'))
      .filter(item => item.getClientRects().length > 0 && !item.hasAttribute('disabled'));
    if (!items.length) return;
    const active = items.indexOf(this.document.activeElement as HTMLElement);
    let next: number;
    if (key.key === 'Tab') next = key.shiftKey ? (active <= 0 ? items.length - 1 : active - 1) : (active + 1) % items.length;
    else if (key.key === 'ArrowDown') next = (active + 1) % items.length;
    else if (key.key === 'ArrowUp') next = active <= 0 ? items.length - 1 : active - 1;
    else if (key.key === 'Home') next = 0;
    else if (key.key === 'End') next = items.length - 1;
    else return;
    key.preventDefault();
    items[next].focus();
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.feedback = '';
    this.open = !this.open;
    if (this.open && this.isMobileLayout()) {
      // Focus after Angular has rendered the conditional sheet.
      setTimeout(() => {
        if (this.open) this.element.nativeElement.querySelector<HTMLElement>('.share-menu [role="menuitem"]')?.focus();
      });
    }
  }

  async shareNative(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    try {
      await this.sharing.nativeShare(this.game);
      this.closeWithKeyboard();
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

  closeAndRestoreFocus(event: MouseEvent): void {
    event.stopPropagation();
    this.open = false;
    this.shareTrigger?.nativeElement.focus();
  }

  stop(event: MouseEvent): void {
    event.stopPropagation();
  }

  @HostListener('document:click')
  close(): void {
    const restore = this.open && this.isMobileLayout();
    this.open = false;
    if (restore) this.shareTrigger?.nativeElement.focus();
  }

  @HostListener('document:keydown.escape')
  closeWithKeyboard(): void {
    const wasOpen = this.open;
    this.open = false;
    if (wasOpen) this.shareTrigger?.nativeElement.focus();
  }
}
