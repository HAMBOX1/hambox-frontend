import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '../auth/auth-session.service';
import { MaintenanceBypassService } from '../maintenance/maintenance-bypass.service';
import { MaintenanceService } from '../maintenance/maintenance.service';

export const maintenanceGuard: CanActivateFn = () => {
  const maintenance = inject(MaintenanceService);
  const bypass = inject(MaintenanceBypassService);
  const session = inject(AuthSessionService);
  const router = inject(Router);

  // An administrator signed in to the portal can always look at the store, even while it is on "Coming soon".
  if (!maintenance.enabled() || bypass.hasValidToken() || session.isAdminAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/coming-soon']);
};
