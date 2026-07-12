import { DOCUMENT } from '@angular/common';

import { HttpContext } from '@angular/common/http';

import { Injectable, computed, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';



import { THEMES_API } from '../api/api-endpoints';

import { ApiClientService } from '../api/api-client.service';

import { SKIP_AUTH_INTERCEPTOR } from '../tokens/http-context.tokens';

import { ThemeId } from './theme.model';
import { ThemeService } from './theme.service';
import { stripInlineThemeTokenOverrides } from './theme-dom.util';
import { THEME_TOKEN_CSS_VAR_MAP, ThemeSemanticTokenKey } from './theme-semantic-tokens';



export interface ActiveThemePayload {

  readonly themeId: string;

  readonly themeName: string;

  readonly slug: string;

  readonly baseMode: string;

  readonly versionId: string;

  readonly versionNumber: number;

  readonly tokens: Readonly<Record<string, string>>;

  readonly assets: readonly { assetType: string; url: string; altText: string | null }[];

  readonly resolutionSource: string;

}



export interface ThemePreviewPayload {

  readonly token: string;

  readonly expiresAtUtc: string;

  readonly themeId: string;

  readonly versionId: string;

}



const ACTIVE_THEME_CACHE_KEY = 'hambox.theme.active';

const PREVIEW_TOKEN_CACHE_KEY = 'hambox.theme.preview.token';



const PUBLIC_HTTP_CONTEXT = new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true);



@Injectable({ providedIn: 'root' })

export class ThemeEngineService {

  private readonly document = inject(DOCUMENT);

  private readonly api = inject(ApiClientService);

  private readonly themeService = inject(ThemeService);



  private readonly activeThemeState = signal<ActiveThemePayload | null>(null);

  private readonly previewModeState = signal(false);

  private readonly previewTokenState = signal<string | null>(null);

  private readonly overrideSnapshot = new Map<string, string>();



  readonly activeTheme = this.activeThemeState.asReadonly();

  readonly previewMode = this.previewModeState.asReadonly();

  readonly previewToken = this.previewTokenState.asReadonly();

  readonly baseTheme = computed(() => this.themeService.theme());



  /** Initialize theme metadata without overriding SCSS base themes on the storefront. */

  async init(membershipPlanSlug?: string): Promise<void> {

    const previewToken = this.readPreviewTokenCache();

    if (previewToken) {

      await this.activatePreview(previewToken);

      return;

    }



    const cached = this.readActiveThemeCache();

    if (cached) {

      this.activeThemeState.set(cached);

    }



    await this.loadActiveTheme(membershipPlanSlug);



    // Storefront: user preference + SCSS win. Never leave stale inline --theme-* from cache.

    if (!this.previewModeState()) {

      this.respectUserBaseTheme();

    }

  }



  /** Clear inline token overrides so `html[data-theme]` SCSS tokens apply (production behavior). */

  respectUserBaseTheme(): void {

    this.clearOverrides();

  }



  /** Load the active theme from the public API (metadata only unless preview mode). */

  async loadActiveTheme(membershipPlanSlug?: string): Promise<void> {

    try {

      const active = await firstValueFrom(

        this.api.get<ActiveThemePayload>(THEMES_API.active, {

          context: PUBLIC_HTTP_CONTEXT,

          params: membershipPlanSlug ? { membershipPlanSlug } : {},

        }),

      );



      this.activeThemeState.set(active);

      this.writeActiveThemeCache(active);



      if (this.previewModeState()) {

        this.applyBaseMode(active.baseMode);

        this.applyTokenOverrides(active.tokens, false);

      }

    } catch {

      // Keep local base theme when API is unavailable.

    }

  }



  /** Apply semantic token overrides as CSS custom properties on :root (preview / admin editor only). */

  applyTokenOverrides(

    tokens: Readonly<Record<string, string>>,

    trackOverrides = true,

  ): void {

    const root = this.document.documentElement;



    for (const [tokenKey, value] of Object.entries(tokens)) {

      const cssVar = THEME_TOKEN_CSS_VAR_MAP[tokenKey as ThemeSemanticTokenKey];

      if (!cssVar || !value) {

        continue;

      }



      if (trackOverrides && !this.overrideSnapshot.has(cssVar)) {

        this.overrideSnapshot.set(cssVar, root.style.getPropertyValue(cssVar));

      }



      root.style.setProperty(cssVar, value);

    }

  }



  /** Enter preview mode using a preview session token. */

  async activatePreview(token: string): Promise<boolean> {

    try {

      const preview = await firstValueFrom(

        this.api.get<ActiveThemePayload>(THEMES_API.preview(token), {

          context: PUBLIC_HTTP_CONTEXT,

        }),

      );



      this.previewModeState.set(true);

      this.previewTokenState.set(token);

      this.writePreviewTokenCache(token);

      this.applyBaseMode(preview.baseMode);

      this.applyTokenOverrides(preview.tokens);

      return true;

    } catch {

      this.clearPreviewTokenCache();

      return false;

    }

  }



  /** Request a preview session from the admin API and activate it locally. */

  async startPreviewSession(themeId: string, versionId?: string): Promise<ThemePreviewPayload | null> {

    try {

      const session = await firstValueFrom(

        this.api.post<ThemePreviewPayload>(THEMES_API.previewSession(themeId), versionId ?? null),

      );

      await this.activatePreview(session.token);

      return session;

    } catch {

      return null;

    }

  }



  /** Exit preview mode and restore active theme overrides. */

  deactivatePreview(): void {

    this.previewModeState.set(false);

    this.previewTokenState.set(null);

    this.clearPreviewTokenCache();

    this.respectUserBaseTheme();

  }



  /** Remove tracked CSS overrides from :root. */

  clearOverrides(): void {

    const root = this.document.documentElement;



    for (const [cssVar, previous] of this.overrideSnapshot.entries()) {

      if (previous) {

        root.style.setProperty(cssVar, previous);

      } else {

        root.style.removeProperty(cssVar);

      }

    }



    this.overrideSnapshot.clear();

    stripInlineThemeTokenOverrides(root);
  }



  /** Apply base mode + tokens for in-editor live preview (no preview session). */

  applyEditorPreview(baseMode: string, tokens: Readonly<Record<string, string>>): void {

    this.applyBaseMode(baseMode);

    this.applyTokenOverrides(tokens);

  }



  /** Restore cached active theme after local editor overrides. */

  restoreActiveTheme(): void {

    this.clearOverrides();

    const active = this.activeThemeState();

    if (active && this.previewModeState()) {

      this.applyBaseMode(active.baseMode);

      this.applyTokenOverrides(active.tokens, false);

      return;

    }



    this.respectUserBaseTheme();

  }



  private applyBaseMode(baseMode: string): void {

    const themeId = this.mapBaseModeToThemeId(baseMode);

    this.themeService.setTheme(themeId);

  }



  private mapBaseModeToThemeId(baseMode: string): ThemeId {

    const normalized = baseMode.trim().toLowerCase();



    if (normalized === 'light' || normalized === 'hambox-light') {

      return 'hambox-light';

    }



    return 'hambox-dark';

  }



  private readActiveThemeCache(): ActiveThemePayload | null {

    if (typeof sessionStorage === 'undefined') {

      return null;

    }



    const raw = sessionStorage.getItem(ACTIVE_THEME_CACHE_KEY);

    if (!raw) {

      return null;

    }



    try {

      return JSON.parse(raw) as ActiveThemePayload;

    } catch {

      return null;

    }

  }



  private writeActiveThemeCache(payload: ActiveThemePayload): void {

    if (typeof sessionStorage === 'undefined') {

      return;

    }



    sessionStorage.setItem(ACTIVE_THEME_CACHE_KEY, JSON.stringify(payload));

  }



  private readPreviewTokenCache(): string | null {

    if (typeof sessionStorage === 'undefined') {

      return null;

    }



    const token = sessionStorage.getItem(PREVIEW_TOKEN_CACHE_KEY);

    return token?.trim() ? token : null;

  }



  private writePreviewTokenCache(token: string): void {

    if (typeof sessionStorage === 'undefined') {

      return;

    }



    sessionStorage.setItem(PREVIEW_TOKEN_CACHE_KEY, token);

  }



  private clearPreviewTokenCache(): void {

    if (typeof sessionStorage === 'undefined') {

      return;

    }



    sessionStorage.removeItem(PREVIEW_TOKEN_CACHE_KEY);

  }

}


