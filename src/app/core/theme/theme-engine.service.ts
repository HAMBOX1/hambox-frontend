import { DOCUMENT } from '@angular/common';

import { HttpContext } from '@angular/common/http';

import { Injectable, computed, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';



import { THEMES_API } from '../api/api-endpoints';

import { ApiClientService } from '../api/api-client.service';

import { AUTH_CONTEXT } from '../auth/auth-context';
import { AuthSessionService } from '../auth/auth-session.service';

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

/**
 * Resolution sources whose `tokens` are a real themed override to apply as live CSS custom
 * properties on the storefront. `schedule` is the same kind of time-boxed override as `campaign`
 * (see ThemeEngine.ResolveScheduledThemeIdAsync) and must apply tokens too — omitting it here
 * silently discarded a resolved scheduled theme, the same class of bug the Campaign Phase 2 audit
 * already fixed for `campaign`. `store`/`default`/`preview` (preview has its own unconditional
 * `activatePreview` path and never reaches this check) mean "this is just the site's normal
 * look", so no override applies for those. Centralized here so the decision is made once — see
 * `hasThemedOverride` — instead of duplicated per call site, which is exactly how
 * `resolutionSource === 'membership'` and `'campaign'` drifted apart before.
 */
const TOKEN_OVERRIDE_SOURCES = new Set(['membership', 'campaign', 'schedule']);



const PUBLIC_HTTP_CONTEXT = new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true);



@Injectable({ providedIn: 'root' })

export class ThemeEngineService {

  private readonly document = inject(DOCUMENT);

  private readonly api = inject(ApiClientService);

  private readonly themeService = inject(ThemeService);

  private readonly authSession = inject(AuthSessionService);



  private readonly activeThemeState = signal<ActiveThemePayload | null>(null);

  private readonly previewModeState = signal(false);

  private readonly previewTokenState = signal<string | null>(null);

  private readonly overrideSnapshot = new Map<string, string>();

  /**
   * App bootstrap fires an anonymous resolve while `restoreSession()` fires an authenticated one,
   * and login/logout can add more mid-flight. Only the newest request may touch the DOM — otherwise
   * a slow anonymous response lands last and clears a member's theme.
   */
  private loadSequence = 0;



  readonly activeTheme = this.activeThemeState.asReadonly();

  readonly previewMode = this.previewModeState.asReadonly();

  readonly previewToken = this.previewTokenState.asReadonly();

  readonly baseTheme = computed(() => this.themeService.theme());

  /** True while a themed override (membership perk or active campaign) is driving the page's
   *  colors — the site-wide dark/light toggle conflicts with those (mode-specific) tokens, so
   *  callers should hide it. Was membership-only; a campaign is exactly the same kind of
   *  conflict and must be included here too, not just in `loadActiveTheme`'s apply/clear branch. */
  readonly hasActiveTokenOverride = computed(
    () => this.hasThemedOverride(this.activeThemeState()?.resolutionSource),
  );

  /** Initialize theme metadata without overriding SCSS base themes on the storefront. */

  async init(membershipPlanSlug?: string): Promise<void> {

    // A `?themePreview=<token>` URL param is an explicit, one-time preview request (the admin
    // just opened this tab from the theme/campaign editor's "Preview" action) — activate it
    // unconditionally, unlike the cached-token path below which deliberately refuses to reapply
    // outside `/admin` to avoid a forgotten session bleeding into real storefront traffic.
    const urlPreviewToken = this.readPreviewTokenFromUrl();
    if (urlPreviewToken && (await this.activatePreview(urlPreviewToken))) {
      return;
    }

    const previewToken = this.readPreviewTokenCache();

    if (previewToken) {

      // A cached preview token must never reapply outside an admin route — otherwise a preview
      // session an admin forgot to exit would silently override real storefront traffic the next
      // time this tab loads any non-admin page.
      if (this.isAdminRoute()) {

        const activated = await this.activatePreview(previewToken);

        if (activated) {

          return;

        }

      } else {

        this.clearPreviewTokenCache();

      }

    }



    // Clear any stale inline --theme-* overrides left from a previous session before resolving.
    this.respectUserBaseTheme();

    const cached = this.readActiveThemeCache();

    if (cached) {

      this.activeThemeState.set(cached);

    }



    await this.loadActiveTheme(membershipPlanSlug);

  }



  /** Clear inline token overrides so `html[data-theme]` SCSS tokens apply (production behavior). */

  respectUserBaseTheme(): void {

    this.clearOverrides();

  }



  /** Load the active theme from the public API (metadata only unless preview mode). */

  async loadActiveTheme(membershipPlanSlug?: string): Promise<void> {

    const sequence = ++this.loadSequence;

    // This call must skip the interceptor's route-based auth-context guess (it would attach the
    // Admin token while browsing /admin routes) but still identify a signed-in customer server-side
    // so membership-linked themes resolve — so the Customer token, if any, is attached explicitly.
    const customerToken = this.authSession.getAccessToken(AUTH_CONTEXT.Customer);

    try {

      const active = await firstValueFrom(

        this.api.get<ActiveThemePayload>(THEMES_API.active, {

          context: PUBLIC_HTTP_CONTEXT,

          params: membershipPlanSlug ? { membershipPlanSlug } : {},

          headers: customerToken ? { Authorization: `Bearer ${customerToken}` } : undefined,

        }),

      );



      if (sequence !== this.loadSequence) {

        return;

      }



      this.activeThemeState.set(active);

      this.writeActiveThemeCache(active);



      if (this.previewModeState()) {

        return;

      }



      // Base mode (light/dark) always stays under the user's own toggle; only design tokens
      // (accent/primary/etc.) come from a resolved membership theme or active campaign, and only
      // when one applies. Both are storefront concepts — never let either bleed into the admin
      // dashboard (e.g. an admin who still has a stale customer session/token from earlier
      // storefront use).
      if (this.hasThemedOverride(active.resolutionSource) && !this.isAdminRoute()) {

        this.applyTokenOverrides(active.tokens, true);

      } else {

        this.clearOverrides();

      }

    } catch {

      if (sequence !== this.loadSequence) {

        return;

      }

      // An anonymous re-resolution (no customer token — this is exactly what logout looks like,
      // since the session is cleared before this call fires) that fails must never leave a
      // previous session's theme applied: drop the stale state, clear the cached payload, and let
      // the base SCSS light/dark theme take over. An authenticated re-resolution that fails keeps
      // whatever was already applied instead — that's normally a transient blip mid-session, not a
      // session boundary, and clearing it would cause a jarring flash back to the unbranded theme.
      if (!customerToken && !this.previewModeState()) {

        this.activeThemeState.set(null);

        this.clearActiveThemeCache();

        this.clearOverrides();

      }

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

  private isAdminRoute(): boolean {
    return (this.document.defaultView?.location.pathname ?? '').startsWith('/admin');
  }

  private readPreviewTokenFromUrl(): string | null {
    const search = this.document.defaultView?.location.search;
    if (!search) {
      return null;
    }

    const token = new URLSearchParams(search).get('themePreview');
    return token?.trim() ? token : null;
  }

  /** The single "does this resolution source carry themed tokens to apply" decision — see
   *  `TOKEN_OVERRIDE_SOURCES`. Never duplicate this check inline; both `loadActiveTheme` and
   *  `hasActiveTokenOverride` must always agree on the same answer. */
  private hasThemedOverride(source: string | undefined): boolean {
    return !!source && TOKEN_OVERRIDE_SOURCES.has(source);
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



  private clearActiveThemeCache(): void {

    if (typeof sessionStorage === 'undefined') {

      return;

    }



    sessionStorage.removeItem(ACTIVE_THEME_CACHE_KEY);

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


