import { HttpContext } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, finalize, Observable, of, tap } from 'rxjs';

import { AUTH_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { ApiError } from '../../../core/models/api-error.model';
import { AUTH_CONTEXT } from '../../../core/auth/auth-context';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { SessionBootstrapService } from '../../../core/auth/session-bootstrap.service';
import { PermissionService } from '../../../core/permissions/permission.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { CurrencyService } from '../../../core/currency/currency.service';
import { ThemeEngineService } from '../../../core/theme/theme-engine.service';
import { SKIP_AUTH_INTERCEPTOR } from '../../../core/tokens/http-context.tokens';
import { UserProfileApiDto } from '../../account/models/account-api.model';
import {
  AccessTokenResponse,
  ForgotPasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
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
  private readonly bootstrap = inject(SessionBootstrapService);
  private readonly permissions = inject(PermissionService);
  private readonly translation = inject(TranslationService);
  private readonly currency = inject(CurrencyService);
  private readonly themeEngine = inject(ThemeEngineService);

  readonly user = this.session.customerUser;
  readonly isAuthenticated = this.session.isCustomerAuthenticated;
  readonly isAdmin = computed(() => false);
  readonly accessToken = computed(() => this.session.getAccessToken(AUTH_CONTEXT.Customer));
  readonly initialized = computed(() => this.session.initialized(AUTH_CONTEXT.Customer));

  login(request: LoginRequest): Observable<AccessTokenResponse> {
    return this.api
      .post<AccessTokenResponse>(AUTH_API.login, request, {
        context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
        withCredentials: true,
      })
      .pipe(
        tap((tokens) => {
          this.session.setSession(AUTH_CONTEXT.Customer, tokens);
          void this.syncAccessFromProfile();
          void this.translation.syncFromAuthenticatedUser();
          void this.currency.syncFromAuthenticatedUser();
          void this.themeEngine.loadActiveTheme();
        }),
      );
  }

  loginWithGoogle(idToken: string): Observable<AccessTokenResponse> {
    return this.api
      .post<AccessTokenResponse>(AUTH_API.google, { idToken } satisfies GoogleLoginRequest, {
        context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
        withCredentials: true,
      })
      .pipe(
        tap((tokens) => {
          this.session.setSession(AUTH_CONTEXT.Customer, tokens);
          void this.syncAccessFromProfile();
          void this.translation.syncFromAuthenticatedUser();
          void this.currency.syncFromAuthenticatedUser();
          void this.themeEngine.loadActiveTheme();
        }),
      );
  }

  register(request: RegisterRequest): Observable<void> {
    return this.api.post<void>(AUTH_API.register, request, {
      context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true),
    });
  }

  logout(): Observable<void> {
    // No body, no refresh token to send — the backend identifies the session exclusively via the
    // HttpOnly cookie it already holds.
    return this.api
      .post<void>(AUTH_API.logout, null, { withCredentials: true })
      .pipe(
        catchError(() => of(void 0)),
        finalize(() => {
          this.session.clearSession(AUTH_CONTEXT.Customer);
          void this.themeEngine.loadActiveTheme();
        }),
      );
  }

  verifyEmail(token: string): Observable<void> {
    // Sent in the request body (not a query param) so the plaintext token never lands in
    // ApiRequestLogs' logged Path + QueryString, browser history for the API call, or referrer
    // headers. The page itself still reads the token from its own URL — see verify-email-page.
    return this.api.post<void>(AUTH_API.verifyEmail, { token });
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

  /**
   * Called at app boot (see app.config.ts) and defensively by authGuard/guestGuard if they run
   * first. Delegates to the shared, once-only SessionBootstrapService — there is exactly one
   * refresh cookie, so this call also determines (and populates) the *admin* session state as a
   * side effect when that's what the cookie turns out to belong to.
   */
  async restoreSession(): Promise<UserSession | null> {
    await this.bootstrap.bootstrapOnce();
    if (this.session.isCustomerAuthenticated()) {
      await this.syncAccessFromProfile();
    }
    return this.session.getSession(AUTH_CONTEXT.Customer);
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
