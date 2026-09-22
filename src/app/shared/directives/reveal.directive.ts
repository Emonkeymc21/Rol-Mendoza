import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy } from '@angular/core';

@Directive({ selector: '[appReveal]' })
export class RevealDirective implements AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;

  constructor(private element: ElementRef<HTMLElement>, private zone: NgZone) {}

  ngAfterViewInit(): void {
    const node = this.element.nativeElement;
    node.classList.add('reveal-on-scroll');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.classList.add('is-visible');
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        node.classList.add('is-visible');
        this.observer?.disconnect();
      }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
      this.observer.observe(node);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
