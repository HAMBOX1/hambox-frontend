import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '../auth/auth-session.service';
import { AUTH_CONTEXT } from '../auth/auth-context';
import { PermissionService } from '../permissions/permission.service';
import { AdminAuth } from '../../features/auth/services/admin-auth';

export const adminAuthenticationGuard: CanActivateFn = async (_route, state) => {
  const session = inject(AuthSessionService);
  const adminAuth = inject(AdminAuth);
  const permissions = inject(PermissionService);
  const router = inject(Router);

  if (!session.initialized(AUTH_CONTEXT.Admin)) {
    await adminAuth.restoreSession();
    session.markInitialized(AUTH_CONTEXT.Admin);
  }

  if (!session.isAdminAuthenticated()) {
    return router.createUrlTree(['/admin/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  if (!permissions.hasAdminAccess()) {
    return router.createUrlTree(['/access-denied'], {
      queryParams: { context: 'admin-portal' },
    });
  }

  return true;
};

/** @deprecated Use adminAuthenticationGuard */
export const adminGuard = adminAuthenticationGuard;
