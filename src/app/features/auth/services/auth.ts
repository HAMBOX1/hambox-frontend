import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, finalize, firstValueFrom, Observable, of, tap } from 'rxjs';

import { AUTH_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { TokenStorageService } from '../../../core/auth/token-storage.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { CurrencyService } from '../../../core/currency/currency.service';
import { SKIP_AUTH_INTERCEPTOR } from '../../../core/tokens/http-context.tokens';
import {
  AuthTokenResponse,
  ForgotPasswordRequest,
  LoginRequest,
  LogoutRequest,
  RefreshTokenRequest,
  RegisterRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  UserSession,
} from '../models/auth';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly translation = inject(TranslationService);
  private readonly currency = inject(CurrencyService);

  readonly user = this.session.user;
  readonly isAuthenticated = this.session.isAuthenticated;
  readonly isAdmin = this.session.isAdmin;
  readonly accessToken = this.session.accessToken;
  readonly initialized = this.session.initialized;

  login(request: LoginRequest): Observable<AuthTokenResponse> {
    return this.api
      .post<AuthTokenResponse>(AUTH_API.login, request, {
        context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
      })
      .pipe(
        tap((tokens) => {
          this.session.setSession(tokens);
          void this.translation.syncFromAuthenticatedUser();
          void this.currency.syncFromAuthenticatedUser();
        }),
      );
  }

  register(request: RegisterRequest): Observable<void> {
    return this.api.post<void>(AUTH_API.register, request, {
      context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
    });
  }

  refresh(): Observable<AuthTokenResponse> {
    const refreshToken =
      this.session.session()?.refreshToken ?? this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token is available.');
    }

    const request: RefreshTokenRequest = { refreshToken };
    return this.api
      .post<AuthTokenResponse>(AUTH_API.refresh, request, {
        context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
      })
      .pipe(tap((tokens) => this.session.setSession(tokens)));
  }

  logout(): Observable<void> {
    const refreshToken = this.session.session()?.refreshToken;

    const logout$ = refreshToken
      ? this.api
          .post<void>(AUTH_API.logout, { refreshToken } satisfies LogoutRequest)
          .pipe(catchError(() => of(void 0)))
      : of(void 0);

    return logout$.pipe(finalize(() => this.session.clearSession()));
  }

  verifyEmail(token: string): Observable<void> {
    return this.api.post<void>(AUTH_API.verifyEmail, null, {
      params: { token },
    });
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.api.post<void>(AUTH_API.forgotPassword, request);
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.api.post<void>(AUTH_API.resetPassword, request);
  }

  resendVerification(request: ResendVerificationRequest): Observable<void> {
    return this.api.post<void>(AUTH_API.resendVerification, request);
  }

  restoreSession(): Promise<UserSession | null> {
    const restored = this.session.tryRestoreFromStorage();
    if (restored) {
      this.session.markInitialized();
      return Promise.resolve(restored);
    }

    if (!this.session.hasRefreshToken()) {
      this.session.clearSession();
      this.session.markInitialized();
      return Promise.resolve(null);
    }

    return firstValueFrom(
      this.refresh().pipe(
        catchError(() => {
          this.session.clearSession();
          return of(null);
        }),
      ),
    ).then((tokens) => {
      this.session.markInitialized();
      return tokens ? this.session.session() : null;
    });
  }

  clearSession(): void {
    this.session.clearSession();
  }
}
