import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '../auth/auth-session.service';
import { PermissionService } from '../permissions/permission.service';
import { AdminAuth } from '../../features/auth/services/admin-auth';

export function permissionGuard(
  permissions: string | readonly string[],
): CanActivateFn {
  const required = Array.isArray(permissions) ? permissions : [permissions];

  return async (_route, state) => {
    const session = inject(AuthSessionService);
    const adminAuth = inject(AdminAuth);
    const permissionService = inject(PermissionService);
    const router = inject(Router);

    if (!session.initialized()) {
      await adminAuth.restoreSession();
      session.markInitialized();
    }

    if (!session.isAdminAuthenticated()) {
      return router.createUrlTree(['/admin/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    if (permissionService.isOwner() || permissionService.hasAnyPermission(...required)) {
      return true;
    }

    return router.createUrlTree(['/admin/dashboard']);
  };
}
