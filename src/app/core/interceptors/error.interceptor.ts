import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { parseApiError } from '../models/api-error.model';
import { MaintenanceBypassService } from '../maintenance/maintenance-bypass.service';
import { MaintenanceService } from '../maintenance/maintenance.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const maintenance = inject(MaintenanceService);
  const bypass = inject(MaintenanceBypassService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const body = error.error as { code?: string; message?: string } | null;
        const gateReason =
          body?.code === 'MAINTENANCE'
            ? 'maintenance'
            : body?.code === 'STORE_CLOSED'
              ? 'closed'
              : body?.code === 'COMING_SOON'
                ? 'comingSoon'
                : null;

        if (error.status === 503 && gateReason) {
          // maintenanceBypassInterceptor attaches the stored bypass token to every API request,
          // so a 503 means the server refused it: its Data Protection key ring rotated, the app
          // restarted without persisted keys, or the token really has expired. Our copy carries
          // only a client-side expiry stamp and would keep claiming to be valid for up to 30
          // days — long enough for /coming-soon to bounce to the storefront, whose calls 503
          // straight back to /coming-soon, forever. Discard it and ask for the password again.
          bypass.clear();
          maintenance.markEnabled(gateReason, body?.message);
          // Admin routes are deliberately exempt from the maintenance redirect (maintenanceGuard
          // never gates them) so admins can still sign in and turn maintenance off. A background
          // 503 from an unrelated bootstrap call (theme/translation/currency init) must not force
          // navigation away from /admin — check the real URL, not router.url, since this can fire
          // before the router's initial navigation has settled.
          const onAdmin = window.location.pathname.startsWith('/admin');
          if (!router.url.startsWith('/coming-soon') && !onAdmin) {
            void router.navigateByUrl('/coming-soon');
          }
        }

        return throwError(() => parseApiError(error));
      }

      return throwError(() => error);
    }),
  );
};
