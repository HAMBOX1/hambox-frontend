import { computed, Injectable, signal } from '@angular/core';

import { AccessTokenResponse, AuthUser, UserSession } from '../../features/auth/models/auth';
import { isOtpVerified, mapTokenResponseToSession } from './jwt-utils';
import { AuthContextType, AUTH_CONTEXT } from './auth-context';

/** Keys the pre-cookie-auth TokenStorageService used to persist tokens to. Nothing reads these
 * any more — purged on construction so a token issued before this migration can't linger in a
 * browser's localStorage indefinitely. */
const LEGACY_TOKEN_STORAGE_KEYS = [
  'hambox.customer.accessToken',
  'hambox.customer.refreshToken',
  'hambox.customer.expiresAt',
  'hambox.admin.accessToken',
  'hambox.admin.refreshToken',
  'hambox.admin.expiresAt',
];

/**
 * Holds the access token — and only the access token — in memory. Session state itself never reads
 * or writes localStorage/sessionStorage/any browser persistence mechanism (the one-time legacy-key
 * purge above is cleanup, not storage): a full page reload always starts with empty state here, and
 * the app must call SessionBootstrapService to repopulate it via the HttpOnly refresh cookie (see
 * app.config.ts's provideAppInitializer). The refresh token itself is never held anywhere in Angular
 * state, not even transiently — the backend never returns it in a JSON body, so there is nothing
 * here to store.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private readonly customerSessionState = signal<UserSession | null>(null);
  private readonly adminSessionState = signal<UserSession | null>(null);
  private readonly customerInitializedState = signal(false);
  private readonly adminInitializedState = signal(false);

  readonly customerSession = this.customerSessionState.asReadonly();
  readonly adminSession = this.adminSessionState.asReadonly();

  readonly customerUser = computed(() => this.customerSessionState()?.user ?? null);
  readonly adminUser = computed(() => this.adminSessionState()?.user ?? null);

  readonly isCustomerAuthenticated = computed(() => this.customerSessionState() !== null);
  readonly isAdminAuthenticated = computed(
    () =>
      this.adminSessionState() !== null &&
      isOtpVerified(this.adminSessionState()?.accessToken ?? ''),
  );

  /** @deprecated Use customerUser or adminUser */
  readonly user = this.customerUser;
  /** @deprecated Use isCustomerAuthenticated */
  readonly isAuthenticated = this.isCustomerAuthenticated;
  readonly isAdmin = computed(() => this.isAdminAuthenticated());
  readonly accessToken = computed(() => this.getAccessToken(AUTH_CONTEXT.Customer));
  readonly session = this.customerSession;

  constructor() {
    for (const key of LEGACY_TOKEN_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  }

  setSession(context: AuthContextType, tokens: AccessTokenResponse): UserSession {
    const session = mapTokenResponseToSession(tokens, context);

    if (context === AUTH_CONTEXT.Admin) {
      this.customerSessionState.set(null);
      this.adminSessionState.set(session);
    } else {
      this.adminSessionState.set(null);
      this.customerSessionState.set(session);
    }

    return session;
  }

  getSession(context: AuthContextType): UserSession | null {
    return context === AUTH_CONTEXT.Admin
      ? this.adminSessionState()
      : this.customerSessionState();
  }

  getAccessToken(context: AuthContextType): string | null {
    return this.getSession(context)?.accessToken ?? null;
  }

  clearSession(context: AuthContextType): void {
    if (context === AUTH_CONTEXT.Admin) {
      this.adminSessionState.set(null);
    } else {
      this.customerSessionState.set(null);
    }
  }

  clearAllSessions(): void {
    this.customerSessionState.set(null);
    this.adminSessionState.set(null);
  }

  updateUserAccess(
    context: AuthContextType,
    roles: readonly string[],
    permissions: readonly string[],
  ): void {
    const current =
      context === AUTH_CONTEXT.Admin
        ? this.adminSessionState()
        : this.customerSessionState();

    if (!current) {
      return;
    }

    const updated: UserSession = {
      ...current,
      user: { ...current.user, roles, permissions },
    };

    if (context === AUTH_CONTEXT.Admin) {
      this.adminSessionState.set(updated);
    } else {
      this.customerSessionState.set(updated);
    }
  }

  initialized(context: AuthContextType): boolean {
    return context === AUTH_CONTEXT.Admin
      ? this.adminInitializedState()
      : this.customerInitializedState();
  }

  markInitialized(context: AuthContextType): void {
    if (context === AUTH_CONTEXT.Admin) {
      this.adminInitializedState.set(true);
    } else {
      this.customerInitializedState.set(true);
    }
  }
}

// Backward-compatible aliases for storefront code paths.
export type { AuthUser, UserSession };
