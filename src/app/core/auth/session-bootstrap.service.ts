import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { finalize, firstValueFrom, from, map, Observable, shareReplay } from 'rxjs';

import { AUTH_API } from '../api/api-endpoints';
import { AccessTokenResponse } from '../../features/auth/models/auth';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { SKIP_AUTH_INTERCEPTOR } from '../tokens/http-context.tokens';
import { AUTH_CONTEXT, AuthContextType } from './auth-context';
import { AuthSessionService } from './auth-session.service';
import { getAuthContextFromPayload } from './jwt-utils';

function resolveUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = baseUrl.replace(/\/$/, '');
  return `${base}${normalizedPath}`;
}

/**
 * The single place that calls POST /api/auth/refresh. There is exactly one refresh cookie shared
 * across both auth contexts (customer/admin are mutually exclusive in one tab — logging in as one
 * clears the other), so this call is deliberately context-agnostic: it asks the backend "whatever
 * cookie you have, refresh it", then reads the auth_context claim off the *returned* access token
 * to learn which context it actually belongs to, rather than a caller assuming one in advance.
 * Goes through the normal injected HttpClient (not a raw HttpBackend client) so Angular's
 * withXsrfConfiguration interceptor still attaches the X-XSRF-TOKEN header — SKIP_AUTH_INTERCEPTOR
 * plus authInterceptor's own isAuthEndpoint check keep this from recursively triggering its own
 * 401 handling or getting a stale Bearer header attached.
 */
@Injectable({
  providedIn: 'root',
})
export class SessionBootstrapService {
  private readonly session = inject(AuthSessionService);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly http = inject(HttpClient);

  private bootstrapPromise: Promise<AuthContextType | null> | null = null;
  private inFlightRefresh$: Observable<AccessTokenResponse> | null = null;

  /**
   * Called once at app boot (see app.config.ts's provideAppInitializer) and, defensively, by
   * whichever route guard runs first if the initializer hasn't resolved yet — concurrent/repeated
   * calls all share this same promise rather than each firing their own refresh request. Resolves
   * both contexts' `initialized` flag together: since there's only one cookie, learning the answer
   * for one context *is* learning the answer for both ("it's the customer session" also means "and
   * definitely not the admin session").
   */
  bootstrapOnce(): Promise<AuthContextType | null> {
    this.bootstrapPromise ??= this.callRefreshEndpoint()
      .then(({ context, tokens }) => {
        this.session.setSession(context, tokens);
        return context;
      })
      .catch(() => {
        this.session.clearAllSessions();
        return null;
      })
      .finally(() => {
        this.session.markInitialized(AUTH_CONTEXT.Customer);
        this.session.markInitialized(AUTH_CONTEXT.Admin);
      });

    return this.bootstrapPromise;
  }

  /**
   * Used by authInterceptor on a 401. Concurrent callers share the same in-flight Observable
   * (shareReplay) instead of each independently POSTing to /api/auth/refresh — the backend
   * single-use-rotates the refresh token on every call, so two concurrent refreshes would race and
   * the second would fail against an already-rotated-away token. The cache is cleared once the
   * call settles (success or failure) so the *next* expiry gets a fresh refresh, not a stale one.
   */
  refresh(): Observable<AccessTokenResponse> {
    this.inFlightRefresh$ ??= from(this.callRefreshEndpoint()).pipe(
      map(({ context, tokens }) => {
        this.session.setSession(context, tokens);
        return tokens;
      }),
      shareReplay(1),
      finalize(() => {
        this.inFlightRefresh$ = null;
      }),
    );

    return this.inFlightRefresh$;
  }

  private async callRefreshEndpoint(): Promise<{ context: AuthContextType; tokens: AccessTokenResponse }> {
    const tokens = await firstValueFrom(
      this.http.post<AccessTokenResponse>(resolveUrl(this.apiBaseUrl, AUTH_API.refresh), null, {
        withCredentials: true,
        context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
      }),
    );

    return { context: getAuthContextFromPayload(tokens.accessToken) ?? AUTH_CONTEXT.Customer, tokens };
  }
}
