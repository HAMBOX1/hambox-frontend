import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AUTH_API } from '../api/api-endpoints';
import { ApiClientService } from '../api/api-client.service';
import { AuthSessionService } from '../auth/auth-session.service';
import {
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE_ID,
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_STORAGE_KEY,
  LanguageDefinition,
  SupportedLanguageId,
  isSupportedLanguageId,
  languageDefinition,
} from './locale.model';

interface UserLocaleProfile {
  readonly firstName: string;
  readonly lastName: string;
  readonly phoneNumber: string | null;
  readonly preferredLanguage: string;
  readonly preferredCurrency: string;
}

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly document = inject(DOCUMENT);
  private readonly translate = inject(TranslateService);
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);

  private readonly languageState = signal<SupportedLanguageId>(DEFAULT_LANGUAGE_ID);
  private readonly readyState = signal(false);
  private readonly revisionState = signal(0);

  readonly language = this.languageState.asReadonly();
  /** Bumped on every locale switch so templates can force refresh. */
  readonly revision = this.revisionState.asReadonly();
  readonly languages: readonly LanguageDefinition[] = AVAILABLE_LANGUAGES;
  readonly isReady = this.readyState.asReadonly();
  readonly isRtl = computed(() => this.languageState() === 'ar');
  readonly currentLanguage = computed(() => languageDefinition(this.languageState()));
  readonly acceptLanguageHeader = computed(() => this.languageState());

  /** Initialize language from storage, cookie, or browser preference. */
  async init(): Promise<void> {
    const initial = this.resolveInitialLanguage();
    await this.applyLanguage(initial, false);
    this.readyState.set(true);
  }

  /** Switch UI language instantly and persist preference. */
  async setLanguage(languageId: SupportedLanguageId): Promise<void> {
    if (languageId === this.languageState()) {
      return;
    }

    await this.applyLanguage(languageId, true);
  }

  /** Apply saved server preference after authentication. */
  async syncFromAuthenticatedUser(): Promise<void> {
    if (!this.session.isAuthenticated()) {
      return;
    }

    try {
      const profile = await firstValueFrom(this.api.get<UserLocaleProfile>(AUTH_API.me));
      if (!isSupportedLanguageId(profile.preferredLanguage)) {
        return;
      }

      if (this.hasPersistedLanguagePreference()) {
        if (profile.preferredLanguage !== this.languageState()) {
          void this.syncPreferredLanguageToServer(this.languageState());
        }
        return;
      }

      await this.applyLanguage(profile.preferredLanguage, true);
    } catch {
      // Keep client-side preference when profile sync fails.
    }
  }

  /** Translate a key synchronously (after translations are loaded). */
  instant(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  /** Observable translation stream for async templates. */
  stream(key: string | string[], params?: Record<string, unknown>) {
    return this.translate.stream(key, params);
  }

  private async applyLanguage(languageId: SupportedLanguageId, persist: boolean): Promise<void> {
    await firstValueFrom(this.translate.use(languageId));
    this.languageState.set(languageId);
    this.revisionState.update((value) => value + 1);
    this.applyDocument(languageId);

    if (persist) {
      this.persistLanguage(languageId);
      void this.syncPreferredLanguageToServer(languageId);
    }
  }

  private applyDocument(languageId: SupportedLanguageId): void {
    const definition = languageDefinition(languageId);
    const root = this.document.documentElement;

    root.lang = languageId;
    root.dir = definition.direction;
    root.dataset['lang'] = languageId;
    root.classList.toggle('hambox-rtl', definition.direction === 'rtl');
    root.classList.toggle('hambox-ltr', definition.direction === 'ltr');
  }

  private persistLanguage(languageId: SupportedLanguageId): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, languageId);
    }

    if (typeof document !== 'undefined') {
      const maxAge = 60 * 60 * 24 * 365;
      document.cookie = `${LANGUAGE_COOKIE_NAME}=${languageId};path=/;max-age=${maxAge};SameSite=Lax`;
    }
  }

  private hasPersistedLanguagePreference(): boolean {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isSupportedLanguageId(stored)) {
        return true;
      }
    }

    return this.readCookieLanguage() !== null;
  }

  private resolveInitialLanguage(): SupportedLanguageId {
    const stored = typeof localStorage !== 'undefined'
      ? localStorage.getItem(LANGUAGE_STORAGE_KEY)
      : null;

    if (isSupportedLanguageId(stored)) {
      return stored;
    }

    const cookieLang = this.readCookieLanguage();
    if (cookieLang) {
      return cookieLang;
    }

    if (typeof navigator !== 'undefined') {
      const browser = navigator.language?.split('-')[0]?.toLowerCase();
      if (isSupportedLanguageId(browser)) {
        return browser;
      }
    }

    return DEFAULT_LANGUAGE_ID;
  }

  private readCookieLanguage(): SupportedLanguageId | null {
    if (typeof document === 'undefined') {
      return null;
    }

    const match = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${LANGUAGE_COOKIE_NAME}=`));

    if (!match) {
      return null;
    }

    const value = match.split('=')[1];
    return isSupportedLanguageId(value) ? value : null;
  }

  private async syncPreferredLanguageToServer(languageId: SupportedLanguageId): Promise<void> {
    if (!this.session.isAuthenticated()) {
      return;
    }

    try {
      const profile = await firstValueFrom(this.api.get<UserLocaleProfile>(AUTH_API.me));
      await firstValueFrom(
        this.api.patch(AUTH_API.me, {
          firstName: profile.firstName,
          lastName: profile.lastName,
          phoneNumber: profile.phoneNumber,
          preferredLanguage: languageId,
          preferredCurrency: profile.preferredCurrency,
        }),
      );
    } catch {
      // Language still applies locally; server sync can retry on next profile save.
    }
  }
}
