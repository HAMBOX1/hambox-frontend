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
import { SKIP_AUTH_INTERCEPTOR } from '../../../core/tokens/http-context.tokens';
import { UserProfileApiDto } from '../../account/models/account-api.model';
import {
  AdminLoginChallengeResponse,
  AuthTokenResponse,
  LoginRequest,
  LogoutRequest,
  RefreshTokenRequest,
  UserSession,
  VerifyAdminOtpRequest,
} from '../models/auth';

@Injectable({
  providedIn: 'root',
})
export class AdminAuth {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly permissions = inject(PermissionService);

  readonly user = this.session.adminUser;
  readonly isAuthenticated = this.session.isAdminAuthenticated;
  readonly accessToken = computed(() => this.session.getAccessToken(AUTH_CONTEXT.Admin));

  login(request: LoginRequest): Observable<AdminLoginChallengeResponse> {
    return this.api.post<AdminLoginChallengeResponse>(AUTH_API.adminLogin, request, {
      context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
    });
  }

  /**
   * Completes an admin login that skipped the OTP step (Admin OTP disabled via
   * Platform Settings) — mirrors the session bootstrap done after OTP verification.
   */
  async completeLoginWithToken(token: AuthTokenResponse): Promise<void> {
    this.session.setSession(AUTH_CONTEXT.Admin, token);
    this.session.markInitialized(AUTH_CONTEXT.Admin);
    await this.syncAccessFromProfile();
  }

  verifyOtp(request: VerifyAdminOtpRequest): Observable<AuthTokenResponse> {
    return this.api
      .post<AuthTokenResponse>(AUTH_API.adminVerifyOtp, request, {
        context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
      })
      .pipe(
        tap((tokens) => {
          this.session.setSession(AUTH_CONTEXT.Admin, tokens);
          this.session.markInitialized(AUTH_CONTEXT.Admin);
          void this.syncAccessFromProfile();
        }),
      );
  }

  resendOtp(challengeId: string): Observable<AdminLoginChallengeResponse> {
    return this.api.post<AdminLoginChallengeResponse>(
      AUTH_API.adminResendOtp,
      { challengeId },
      { context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true) },
    );
  }

  refresh(): Observable<AuthTokenResponse> {
    const refreshToken =
      this.session.getSession(AUTH_CONTEXT.Admin)?.refreshToken ??
      this.tokenStorage.getRefreshToken(AUTH_CONTEXT.Admin);
    if (!refreshToken) {
      throw new Error('No refresh token is available.');
    }

    return this.api
      .post<AuthTokenResponse>(AUTH_API.refresh, { refreshToken } satisfies RefreshTokenRequest, {
        context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
      })
      .pipe(
        tap((tokens) => {
          this.session.setSession(AUTH_CONTEXT.Admin, tokens);
          void this.syncAccessFromProfile();
        }),
      );
  }

  logout(): Observable<void> {
    const refreshToken = this.session.getSession(AUTH_CONTEXT.Admin)?.refreshToken;
    const logout$ = refreshToken
      ? this.api
          .post<void>(AUTH_API.logout, { refreshToken } satisfies LogoutRequest)
          .pipe(catchError(() => of(void 0)))
      : of(void 0);

    return logout$.pipe(finalize(() => this.session.clearSession(AUTH_CONTEXT.Admin)));
  }

  restoreSession(): Promise<UserSession | null> {
    const restored = this.session.tryRestoreFromStorage(AUTH_CONTEXT.Admin);
    if (restored && this.session.isAdminAuthenticated()) {
      return Promise.resolve(restored);
    }

    if (!this.session.hasRefreshToken(AUTH_CONTEXT.Admin)) {
      this.session.clearSession(AUTH_CONTEXT.Admin);
      return Promise.resolve(null);
    }

    return firstValueFrom(
      this.refresh().pipe(
        catchError(() => {
          this.session.clearSession(AUTH_CONTEXT.Admin);
          return of(null);
        }),
      ),
    ).then(async (tokens) => {
      if (tokens) {
        await this.syncAccessFromProfile();
      }
      return tokens ? this.session.getSession(AUTH_CONTEXT.Admin) : null;
    });
  }

  async syncAccessFromProfile(): Promise<void> {
    if (!this.session.isAdminAuthenticated()) {
      return;
    }

    try {
      const profile = await firstValueFrom(this.api.get<UserProfileApiDto>(AUTH_API.me));
      this.permissions.syncFromProfile(AUTH_CONTEXT.Admin, {
        roles: profile.roles ?? [],
        permissions: profile.permissions ?? [],
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        this.session.clearSession(AUTH_CONTEXT.Admin);
      }
    }
  }
}
