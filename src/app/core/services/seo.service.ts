import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly siteUrl = 'https://rol-mendoza-2026.vercel.app';
  private readonly defaultDescription = 'Cumbre20 conecta jugadores, másters y partidas de rol en Mendoza. Encontrá y organizá tu próxima mesa.';
  private started = false;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.updateMetadata());
  }

  private updateMetadata(): void {
    let route = this.activatedRoute;
    while (route.firstChild) route = route.firstChild;

    const description = route.snapshot.data['description'] || this.defaultDescription;
    const robots = route.snapshot.data['robots'] || 'index,follow';
    const title = route.snapshot.title || 'Cumbre20 | Encontrá tu próxima mesa';
    const cleanPath = this.router.url.split(/[?#]/)[0];
    const canonicalUrl = `${this.siteUrl}${cleanPath === '/' ? '' : cleanPath}`;

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: robots });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.setCanonical(canonicalUrl);
  }

  private setCanonical(url: string): void {
    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = url;
  }
}
