import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { parseApiError } from '../models/api-error.model';
import { MaintenanceService } from '../maintenance/maintenance.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const maintenance = inject(MaintenanceService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const body = error.error as { code?: string; message?: string } | null;
        if (error.status === 503 && body?.code === 'MAINTENANCE') {
          maintenance.markEnabled(body.message);
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
