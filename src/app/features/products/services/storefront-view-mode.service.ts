import { Injectable, signal } from '@angular/core';

export type StorefrontViewMode = 'comfortable' | 'compact' | 'list';

const STORAGE_KEY = 'hambox.storefront.viewMode';

@Injectable({ providedIn: 'root' })
export class StorefrontViewModeService {
  private readonly modeState = signal<StorefrontViewMode>(this.readInitialMode());

  readonly mode = this.modeState.asReadonly();

  setMode(mode: StorefrontViewMode): void {
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    this.modeState.set(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0 });
      });
    }
  }

  private readInitialMode(): StorefrontViewMode {
    if (typeof localStorage === 'undefined') {
      return 'comfortable';
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    // 'large' is a legacy stored value from before the comfortable/compact
    // rename — treat it as comfortable rather than losing the preference.
    if (stored === 'large') {
      return 'comfortable';
    }
    if (stored === 'comfortable' || stored === 'compact' || stored === 'list') {
      return stored;
    }

    return 'comfortable';
  }
}
