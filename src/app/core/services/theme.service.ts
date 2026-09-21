import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemePreference = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'cumbre20-theme';
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly preferenceState = new BehaviorSubject<ThemePreference>(this.savedPreference());
  readonly preference$ = this.preferenceState.asObservable();

  constructor() {
    this.apply(this.preferenceState.value);
    const updateFromSystem = (): void => {
      if (this.preferenceState.value === 'system') this.apply('system');
    };
    this.media.addEventListener('change', updateFromSystem);
  }

  get preference(): ThemePreference { return this.preferenceState.value; }

  setPreference(preference: ThemePreference): void {
    try { localStorage.setItem(this.storageKey, preference); } catch (error) {
      console.warn('No se pudo conservar la preferencia visual en este navegador.', error);
    }
    this.preferenceState.next(preference);
    this.apply(preference);
  }

  private savedPreference(): ThemePreference {
    let value: string | null = null;
    try { value = localStorage.getItem(this.storageKey); } catch { value = null; }
    return value === 'light' || value === 'dark' ? value : 'system';
  }

  private apply(preference: ThemePreference): void {
    const resolved: ResolvedTheme = preference === 'system'
      ? (this.media.matches ? 'dark' : 'light')
      : preference;
    const root = document.documentElement;
    root.dataset['theme'] = resolved;
    root.dataset['themePreference'] = preference;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = resolved === 'dark' ? '#130e10' : '#f6f0e7';
  }
}
