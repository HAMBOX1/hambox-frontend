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

          // Admin-only: on the storefront, a 401 can legitimately happen for an anonymous guest
          // hitting a customer endpoint (no session to lose), so redirecting there would bounce
          // browsing guests to a login screen for no reason. In the admin portal every route
          // already requires a signed-in session, so a failed refresh always means that session
          // just expired/rotated out from under them. Without this, they're left staring at the
          // current screen with a raw, unrelated-looking backend error (e.g. a "publish" action
          // surfacing Identity's "token is invalid or has already been used" message) and no way
          // to recover short of manually navigating away — send them to sign back in instead.
          if (context === AUTH_CONTEXT.Admin && !router.url.startsWith('/admin/login')) {
            void router.navigate(['/admin/login'], { queryParams: { returnUrl: router.url } });
          }

          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
