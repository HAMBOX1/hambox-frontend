import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AUTH_API } from '../api/api-endpoints';
import { AUTH_CONTEXT, AuthContextType } from '../auth/auth-context';
import { AuthSessionService } from '../auth/auth-session.service';
import { SessionBootstrapService } from '../auth/session-bootstrap.service';
import { SKIP_AUTH_INTERCEPTOR } from '../tokens/http-context.tokens';

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
  const bootstrap = inject(SessionBootstrapService);
  const router = inject(Router);

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

      // SessionBootstrapService.refresh() coalesces concurrent 401s into a single POST
      // /api/auth/refresh call (the HttpOnly cookie is sent automatically) — every request that
      // 401'd around the same moment shares this one refresh, then each retries with the new token.
      return bootstrap.refresh().pipe(
        switchMap((tokens) => {
          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          });
          return next(retryReq);
        }),
        catchError((refreshError) => {
          // Refresh itself failed (cookie missing/expired/reused) — the session is gone; clear it
          // once here rather than once per failed request, and never retry, avoiding any loop.
          session.clearSession(context);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
