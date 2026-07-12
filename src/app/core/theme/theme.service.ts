import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

import {
  AVAILABLE_THEMES,
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  ThemeDefinition,
  ThemeId,
  isThemeId,
} from './theme.model';
import { stripInlineThemeTokenOverrides } from './theme-dom.util';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly themeState = signal<ThemeId>(DEFAULT_THEME_ID);

  readonly theme = this.themeState.asReadonly();
  readonly themes: readonly ThemeDefinition[] = AVAILABLE_THEMES;
  readonly isDark = computed(() => this.themeState() === 'hambox-dark');
  readonly isLight = computed(() => this.themeState() === 'hambox-light');

  /** Apply persisted or system preference on startup. */
  init(): void {
    const stored = this.readStoredTheme();

    if (stored) {
      this.apply(stored, false);
      return;
    }

    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    this.apply(prefersDark ? 'hambox-dark' : 'hambox-light', false);
  }

  setTheme(themeId: ThemeId): void {
    this.apply(themeId, true);
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'hambox-light' : 'hambox-dark');
  }

  hasStoredPreference(): boolean {
    return this.readStoredTheme() !== null;
  }

  private apply(themeId: ThemeId, persist: boolean): void {
    this.themeState.set(themeId);

    const root = this.document.documentElement;
    root.dataset['theme'] = themeId;
    root.style.colorScheme = themeId === 'hambox-dark' ? 'dark' : 'light';

    // SCSS `html[data-theme]` is the storefront source of truth — clear API inline overrides.
    stripInlineThemeTokenOverrides(root);

    if (persist && typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    }
  }

  private readStoredTheme(): ThemeId | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : null;
  }
}
