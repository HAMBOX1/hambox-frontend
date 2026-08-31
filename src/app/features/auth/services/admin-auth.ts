import { HttpContext } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { catchError, finalize, firstValueFrom, Observable, of, tap } from 'rxjs';

import { AUTH_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { ApiError } from '../../../core/models/api-error.model';
import { AUTH_CONTEXT } from '../../../core/auth/auth-context';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { SessionBootstrapService } from '../../../core/auth/session-bootstrap.service';
import { PermissionService } from '../../../core/permissions/permission.service';
import { SKIP_AUTH_INTERCEPTOR } from '../../../core/tokens/http-context.tokens';
import { UserProfileApiDto } from '../../account/models/account-api.model';
import {
  AccessTokenResponse,
  AdminLoginChallengeResponse,
  LoginRequest,
  UserSession,
  VerifyAdminOtpRequest,
} from '../models/auth';

@Injectable({
  providedIn: 'root',
})
export class AdminAuth {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  private readonly bootstrap = inject(SessionBootstrapService);
  private readonly permissions = inject(PermissionService);

  readonly user = this.session.adminUser;
  readonly isAuthenticated = this.session.isAdminAuthenticated;
  readonly accessToken = computed(() => this.session.getAccessToken(AUTH_CONTEXT.Admin));

  login(request: LoginRequest): Observable<AdminLoginChallengeResponse> {
    return this.api.post<AdminLoginChallengeResponse>(AUTH_API.adminLogin, request, {
      context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
      withCredentials: true,
    });
  }

  /**
   * Completes an admin login that skipped the OTP step (Admin OTP disabled via
   * Platform Settings) — mirrors the session bootstrap done after OTP verification.
   */
  async completeLoginWithToken(token: AccessTokenResponse): Promise<void> {
    this.session.setSession(AUTH_CONTEXT.Admin, token);
    this.session.markInitialized(AUTH_CONTEXT.Admin);
    await this.syncAccessFromProfile();
  }

  /** The caller (admin-otp-page) always awaits syncAccessFromProfile() itself right after
   * subscribing, so this doesn't call it too — that would just be a second, redundant /auth/me
   * request racing the caller's own. */
  verifyOtp(request: VerifyAdminOtpRequest): Observable<AccessTokenResponse> {
    return this.api
      .post<AccessTokenResponse>(AUTH_API.adminVerifyOtp, request, {
        context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
        withCredentials: true,
      })
      .pipe(
        tap((tokens) => {
          this.session.setSession(AUTH_CONTEXT.Admin, tokens);
          this.session.markInitialized(AUTH_CONTEXT.Admin);
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

  logout(): Observable<void> {
    return this.api
      .post<void>(AUTH_API.logout, null, { withCredentials: true })
      .pipe(
        catchError(() => of(void 0)),
        finalize(() => this.session.clearSession(AUTH_CONTEXT.Admin)),
      );
  }

  /**
   * Delegates to the shared, once-only SessionBootstrapService (see Auth.restoreSession — the two
   * are backed by the exact same underlying call, since there's only one refresh cookie).
   */
  async restoreSession(): Promise<UserSession | null> {
    await this.bootstrap.bootstrapOnce();
    if (this.session.isAdminAuthenticated()) {
      await this.syncAccessFromProfile();
    }
    return this.session.getSession(AUTH_CONTEXT.Admin);
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
