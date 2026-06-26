import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AUTH_API } from '../api/api-endpoints';
import { AuthSessionService } from '../auth/auth-session.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { SKIP_AUTH_INTERCEPTOR } from '../tokens/http-context.tokens';
import { AuthTokenResponse } from '../../features/auth/models/auth';

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes(AUTH_API.login) ||
    url.includes(AUTH_API.register) ||
    url.includes(AUTH_API.refresh)
  );
}

function resolveUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = baseUrl.replace(/\/$/, '');
  return `${base}${normalizedPath}`;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSessionService);
  const tokenStorage = inject(TokenStorageService);
  const apiBaseUrl = inject(API_BASE_URL);
  const httpBackend = inject(HttpBackend);
  const rawHttp = new HttpClient(httpBackend);

  const skipAuth = req.context.get(SKIP_AUTH_INTERCEPTOR) || isAuthEndpoint(req.url);
  const accessToken = session.accessToken();

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
        session.session()?.refreshToken ?? tokenStorage.getRefreshToken();
      if (!refreshToken) {
        session.clearSession();
        return throwError(() => error);
      }

      return rawHttp
        .post<AuthTokenResponse>(resolveUrl(apiBaseUrl, AUTH_API.refresh), {
          refreshToken,
        })
        .pipe(
          switchMap((tokens) => {
            session.setSession(tokens);
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${tokens.accessToken}`,
              },
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            session.clearSession();
            return throwError(() => refreshError);
          }),
        );
    }),
  );
};
