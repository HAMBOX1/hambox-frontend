import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AUTH_API } from '../api/api-endpoints';
import { AUTH_CONTEXT, AuthContextType } from '../auth/auth-context';
import { AuthSessionService } from '../auth/auth-session.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { SKIP_AUTH_INTERCEPTOR } from '../tokens/http-context.tokens';
import { AuthTokenResponse } from '../../features/auth/models/auth';

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes(AUTH_API.login) ||
    url.includes(AUTH_API.google) ||
    url.includes(AUTH_API.adminLogin) ||
    url.includes(AUTH_API.adminVerifyOtp) ||
    url.includes(AUTH_API.adminResendOtp) ||
    url.includes(AUTH_API.register) ||
    url.includes(AUTH_API.refresh)
  );
}

function resolveUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = baseUrl.replace(/\/$/, '');
  return `${base}${normalizedPath}`;
}

function resolveAuthContext(routerUrl: string, requestUrl: string): AuthContextType {
  // The product-editor "Preview" button opens a storefront route (/products/:id?preview=1) in a
  // new tab, but the underlying configuration/preview endpoint is Admin-permission-gated — so that
  // one call needs the Admin token even though every other call on that page uses Customer context.
  if (routerUrl.startsWith('/admin') || requestUrl.includes('/configuration/preview')) {
    return AUTH_CONTEXT.Admin;
  }

  return AUTH_CONTEXT.Customer;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSessionService);
  const tokenStorage = inject(TokenStorageService);
  const apiBaseUrl = inject(API_BASE_URL);
  const httpBackend = inject(HttpBackend);
  const router = inject(Router);
  const rawHttp = new HttpClient(httpBackend);

  const context = resolveAuthContext(router.url, req.url);
  const skipAuth = req.context.get(SKIP_AUTH_INTERCEPTOR) || isAuthEndpoint(req.url);
  const accessToken = session.getAccessToken(context);

  const authReq =
    !skipAuth && accessToken
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || skipAuth) {
        return throwError(() => error);
      }

      const refreshToken =
        session.getSession(context)?.refreshToken ?? tokenStorage.getRefreshToken(context);
      if (!refreshToken) {
        session.clearSession(context);
        return throwError(() => error);
      }

      return rawHttp
        .post<AuthTokenResponse>(resolveUrl(apiBaseUrl, AUTH_API.refresh), {
          refreshToken,
        })
        .pipe(
          switchMap((tokens) => {
            session.setSession(context, tokens);
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${tokens.accessToken}`,
              },
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            session.clearSession(context);
            return throwError(() => refreshError);
          }),
        );
    }),
  );
};
