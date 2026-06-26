import { computed, inject, Injectable, signal } from '@angular/core';

import {
  AuthTokenResponse,
  AuthUser,
  UserSession,
} from '../../features/auth/models/auth';
import {
  hasAdminRole,
  isAccessTokenExpired,
  mapTokenResponseToSession,
} from './jwt-utils';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly sessionState = signal<UserSession | null>(null);
  private readonly initializedState = signal(false);

  readonly session = this.sessionState.asReadonly();
  readonly user = computed<AuthUser | null>(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly isAdmin = computed(() => hasAdminRole(this.user()?.roles ?? []));
  readonly accessToken = computed(() => this.sessionState()?.accessToken ?? null);
  readonly initialized = this.initializedState.asReadonly();

  setSession(tokens: AuthTokenResponse): UserSession {
    const session = mapTokenResponseToSession(tokens);
    this.tokenStorage.saveTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
    });
    this.sessionState.set(session);
    return session;
  }

  clearSession(): void {
    this.tokenStorage.clearTokens();
    this.sessionState.set(null);
  }

  tryRestoreFromStorage(): UserSession | null {
    const stored = this.tokenStorage.getTokens();
    if (!stored) {
      return null;
    }

    if (isAccessTokenExpired(stored.accessToken, stored.expiresAt)) {
      return null;
    }

    const session = mapTokenResponseToSession({
      accessToken: stored.accessToken,
      refreshToken: stored.refreshToken,
      expiresAt: stored.expiresAt,
    });
    this.sessionState.set(session);
    return session;
  }

  hasRefreshToken(): boolean {
    return !!this.tokenStorage.getRefreshToken();
  }

  markInitialized(): void {
    this.initializedState.set(true);
  }

  async restoreSession(): Promise<UserSession | null> {
    const restored = this.tryRestoreFromStorage();
    if (restored) {
      this.initializedState.set(true);
      return restored;
    }

    this.sessionState.set(null);
    this.initializedState.set(true);
    return null;
  }
}
