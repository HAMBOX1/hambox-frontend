import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '../auth/auth-session.service';
import { Auth } from '../../features/auth/services/auth';

export const adminGuard: CanActivateFn = async (_route, state) => {
  const session = inject(AuthSessionService);
  const auth = inject(Auth);
  const router = inject(Router);

  if (!session.initialized()) {
    await auth.restoreSession();
  }

  if (!session.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  if (session.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
