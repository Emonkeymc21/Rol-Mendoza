import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';

@Component({
  selector: 'app-custom-cursor',
  templateUrl: './custom-cursor.component.html',
  styleUrls: ['./custom-cursor.component.scss']
})
export class CustomCursorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('dot', { static: true }) private dot!: ElementRef<HTMLElement>;
  @ViewChild('ring', { static: true }) private ring!: ElementRef<HTMLElement>;

  private targetX = -100;
  private targetY = -100;
  private ringX = -100;
  private ringY = -100;
  private frame = 0;
  private enabled = false;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    const media = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    if (!media.matches) return;
    this.enabled = true;
    document.documentElement.classList.add('cursor-enhanced');
    this.zone.runOutsideAngular(() => {
      window.addEventListener('pointermove', this.onMove, { passive: true });
      document.addEventListener('pointerover', this.onOver, { passive: true });
      document.addEventListener('pointerout', this.onOut, { passive: true });
      document.addEventListener('mouseleave', this.onLeave, { passive: true });
      this.frame = requestAnimationFrame(this.render);
    });
  }

  ngOnDestroy(): void {
    if (!this.enabled) return;
    document.documentElement.classList.remove('cursor-enhanced');
    window.removeEventListener('pointermove', this.onMove);
    document.removeEventListener('pointerover', this.onOver);
    document.removeEventListener('pointerout', this.onOut);
    document.removeEventListener('mouseleave', this.onLeave);
    cancelAnimationFrame(this.frame);
  }

  private readonly onMove = (event: PointerEvent): void => {
    this.targetX = event.clientX;
    this.targetY = event.clientY;
    this.dot.nativeElement.style.transform = `translate3d(${this.targetX}px,${this.targetY}px,0)`;
    this.dot.nativeElement.classList.add('is-visible');
    this.ring.nativeElement.classList.add('is-visible');
  };

  private readonly onOver = (event: PointerEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    this.ring.nativeElement.classList.toggle('is-interactive', Boolean(target?.closest('a, button, [role="button"]')));
  };

  private readonly onOut = (event: PointerEvent): void => {
    const target = event.relatedTarget instanceof Element ? event.relatedTarget : null;
    if (!target?.closest('a, button, [role="button"]')) this.ring.nativeElement.classList.remove('is-interactive');
  };

  private readonly onLeave = (): void => {
    this.dot.nativeElement.classList.remove('is-visible');
    this.ring.nativeElement.classList.remove('is-visible');
  };

  private readonly render = (): void => {
    this.ringX += (this.targetX - this.ringX) * 0.18;
    this.ringY += (this.targetY - this.ringY) * 0.18;
    this.ring.nativeElement.style.transform = `translate3d(${this.ringX}px,${this.ringY}px,0)`;
    this.frame = requestAnimationFrame(this.render);
  };
}
