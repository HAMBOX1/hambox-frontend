import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { MaintenanceBypassService } from '../maintenance/maintenance-bypass.service';
import { MaintenanceService } from '../maintenance/maintenance.service';

export const maintenanceGuard: CanActivateFn = () => {
  const maintenance = inject(MaintenanceService);
  const bypass = inject(MaintenanceBypassService);
  const router = inject(Router);

  if (!maintenance.enabled() || bypass.hasValidToken()) {
    return true;
  }

  return router.createUrlTree(['/coming-soon']);
};
