import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '../auth/auth-session.service';
import { AUTH_CONTEXT } from '../auth/auth-context';
import { PermissionService } from '../permissions/permission.service';
import { AdminAuth } from '../../features/auth/services/admin-auth';

/**
 * Only the primary admin (Owner) may open the route. For pages holding material that must not be delegated to
 * other roles even if they hold a related permission — e.g. the archive of deleted inventory codes.
 */
export const ownerOnlyGuard: CanActivateFn = async (_route, state) => {
  const session = inject(AuthSessionService);
  const adminAuth = inject(AdminAuth);
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  if (!session.initialized(AUTH_CONTEXT.Admin)) {
    await adminAuth.restoreSession();
    session.markInitialized(AUTH_CONTEXT.Admin);
  }

  if (!session.isAdminAuthenticated()) {
    return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
  }

  return permissionService.isOwner()
    ? true
    : router.createUrlTree(['/access-denied'], { queryParams: { context: 'permission' } });
};
