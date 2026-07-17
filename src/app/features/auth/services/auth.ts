import { HttpContext } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { catchError, finalize, firstValueFrom, Observable, of, tap } from 'rxjs';

import { AUTH_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { ApiError } from '../../../core/models/api-error.model';
import { AUTH_CONTEXT } from '../../../core/auth/auth-context';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { TokenStorageService } from '../../../core/auth/token-storage.service';
import { PermissionService } from '../../../core/permissions/permission.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { CurrencyService } from '../../../core/currency/currency.service';
import { SKIP_AUTH_INTERCEPTOR } from '../../../core/tokens/http-context.tokens';
import { UserProfileApiDto } from '../../account/models/account-api.model';
import {
  AuthTokenResponse,
  ForgotPasswordRequest,
  GoogleLoginRequest,
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
  private readonly permissions = inject(PermissionService);
  private readonly translation = inject(TranslationService);
  private readonly currency = inject(CurrencyService);

  readonly user = this.session.customerUser;
  readonly isAuthenticated = this.session.isCustomerAuthenticated;
  readonly isAdmin = computed(() => false);
  readonly accessToken = computed(() => this.session.getAccessToken(AUTH_CONTEXT.Customer));
  readonly initialized = computed(() => this.session.initialized(AUTH_CONTEXT.Customer));

  login(request: LoginRequest): Observable<AuthTokenResponse> {
    return this.api
      .post<AuthTokenResponse>(AUTH_API.login, request, {
        context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
      })
      .pipe(
        tap((tokens) => {
          this.session.setSession(AUTH_CONTEXT.Customer, tokens);
          void this.syncAccessFromProfile();
          void this.translation.syncFromAuthenticatedUser();
          void this.currency.syncFromAuthenticatedUser();
        }),
      );
  }

  loginWithGoogle(idToken: string): Observable<AuthTokenResponse> {
    return this.api
      .post<AuthTokenResponse>(AUTH_API.google, { idToken } satisfies GoogleLoginRequest, {
        context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
      })
      .pipe(
        tap((tokens) => {
          this.session.setSession(AUTH_CONTEXT.Customer, tokens);
          void this.syncAccessFromProfile();
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
      this.session.getSession(AUTH_CONTEXT.Customer)?.refreshToken ??
      this.tokenStorage.getRefreshToken(AUTH_CONTEXT.Customer);
    if (!refreshToken) {
      throw new Error('No refresh token is available.');
    }

    const request: RefreshTokenRequest = { refreshToken };
    return this.api
      .post<AuthTokenResponse>(AUTH_API.refresh, request, {
        context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
      })
      .pipe(
        tap((tokens) => {
          this.session.setSession(AUTH_CONTEXT.Customer, tokens);
          void this.syncAccessFromProfile();
        }),
      );
  }

  logout(): Observable<void> {
    const refreshToken = this.session.getSession(AUTH_CONTEXT.Customer)?.refreshToken;

    const logout$ = refreshToken
      ? this.api
          .post<void>(AUTH_API.logout, { refreshToken } satisfies LogoutRequest)
          .pipe(catchError(() => of(void 0)))
      : of(void 0);

    return logout$.pipe(finalize(() => this.session.clearSession(AUTH_CONTEXT.Customer)));
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
    const restored = this.session.tryRestoreFromStorage(AUTH_CONTEXT.Customer);
    if (restored) {
      this.session.markInitialized(AUTH_CONTEXT.Customer);
      return Promise.resolve(restored);
    }

    if (!this.session.hasRefreshToken(AUTH_CONTEXT.Customer)) {
      this.session.clearSession(AUTH_CONTEXT.Customer);
      this.session.markInitialized(AUTH_CONTEXT.Customer);
      return Promise.resolve(null);
    }

    return firstValueFrom(
      this.refresh().pipe(
        catchError(() => {
          this.session.clearSession(AUTH_CONTEXT.Customer);
          return of(null);
        }),
      ),
    ).then(async (tokens) => {
      this.session.markInitialized(AUTH_CONTEXT.Customer);
      if (tokens) {
        await this.syncAccessFromProfile();
      }
      return tokens ? this.session.getSession(AUTH_CONTEXT.Customer) : null;
    });
  }

  async syncAccessFromProfile(): Promise<void> {
    if (!this.session.isCustomerAuthenticated()) {
      return;
    }

    try {
      const profile = await firstValueFrom(this.api.get<UserProfileApiDto>(AUTH_API.me));
      this.permissions.syncFromProfile(AUTH_CONTEXT.Customer, {
        roles: profile.roles ?? [],
        permissions: profile.permissions ?? [],
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        this.session.clearSession(AUTH_CONTEXT.Customer);
      }
    }
  }

  clearSession(): void {
    this.session.clearSession(AUTH_CONTEXT.Customer);
  }
}
