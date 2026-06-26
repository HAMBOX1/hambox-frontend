import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '../auth/auth-session.service';
import { Auth } from '../../features/auth/services/auth';

export const authGuard: CanActivateFn = async (_route, state) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);

  if (!session.initialized()) {
    await inject(Auth).restoreSession();
  }

  if (session.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};
