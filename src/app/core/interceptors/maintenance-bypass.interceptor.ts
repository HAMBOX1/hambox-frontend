import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { MaintenanceBypassService } from '../maintenance/maintenance-bypass.service';

const BYPASS_HEADER = 'X-Maintenance-Bypass';

export const maintenanceBypassInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(MaintenanceBypassService).getToken();
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        [BYPASS_HEADER]: token,
      },
    }),
  );
};
