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
        if (error.status === 503 && body?.code === 'MAINTENANCE' && !router.url.startsWith('/coming-soon')) {
          maintenance.markEnabled(body.message);
          void router.navigateByUrl('/coming-soon');
        }

        return throwError(() => parseApiError(error));
      }

      return throwError(() => error);
    }),
  );
};
