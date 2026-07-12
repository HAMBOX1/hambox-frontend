import { computed, inject, Injectable, signal } from '@angular/core';

import {
  AuthTokenResponse,
  AuthUser,
  UserSession,
} from '../../features/auth/models/auth';
import {
  getAuthContextFromPayload,
  isAccessTokenExpired,
  isOtpVerified,
  mapTokenResponseToSession,
} from './jwt-utils';
import { AuthContextType, AUTH_CONTEXT } from './auth-context';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly customerSessionState = signal<UserSession | null>(null);
  private readonly adminSessionState = signal<UserSession | null>(null);
  private readonly initializedState = signal(false);

  readonly customerSession = this.customerSessionState.asReadonly();
  readonly adminSession = this.adminSessionState.asReadonly();
  readonly initialized = this.initializedState.asReadonly();

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

  setSession(context: AuthContextType, tokens: AuthTokenResponse): UserSession {
    const session = mapTokenResponseToSession(tokens, context);
    this.tokenStorage.saveTokens(context, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
    });

    if (context === AUTH_CONTEXT.Admin) {
      this.customerSessionState.set(null);
      this.tokenStorage.clearTokens(AUTH_CONTEXT.Customer);
      this.adminSessionState.set(session);
    } else {
      this.adminSessionState.set(null);
      this.tokenStorage.clearTokens(AUTH_CONTEXT.Admin);
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
    this.tokenStorage.clearTokens(context);
    if (context === AUTH_CONTEXT.Admin) {
      this.adminSessionState.set(null);
    } else {
      this.customerSessionState.set(null);
    }
  }

  clearAllSessions(): void {
    this.tokenStorage.clearAll();
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

  tryRestoreFromStorage(context: AuthContextType): UserSession | null {
    const stored = this.tokenStorage.getTokens(context);
    if (!stored) {
      return null;
    }

    if (isAccessTokenExpired(stored.accessToken, stored.expiresAt)) {
      return null;
    }

    const session = mapTokenResponseToSession(
      {
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        expiresAt: stored.expiresAt,
      },
      context,
    );

    const payloadContext = getAuthContextFromPayload(session.accessToken);
    if (payloadContext && payloadContext !== context) {
      this.tokenStorage.clearTokens(context);
      return null;
    }

    if (context === AUTH_CONTEXT.Admin) {
      this.adminSessionState.set(session);
    } else {
      this.customerSessionState.set(session);
    }

    return session;
  }

  hasRefreshToken(context: AuthContextType): boolean {
    return !!this.tokenStorage.getRefreshToken(context);
  }

  markInitialized(): void {
    this.initializedState.set(true);
  }

  restoreSession(context: AuthContextType): UserSession | null {
    return this.tryRestoreFromStorage(context);
  }
}

// Backward-compatible aliases for storefront code paths.
export type { AuthUser, UserSession };
