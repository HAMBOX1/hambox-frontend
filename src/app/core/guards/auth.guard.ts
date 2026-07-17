import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '../auth/auth-session.service';
import { AUTH_CONTEXT } from '../auth/auth-context';
import { Auth } from '../../features/auth/services/auth';

export const authGuard: CanActivateFn = async (_route, state) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);

  if (!session.initialized(AUTH_CONTEXT.Customer)) {
    await inject(Auth).restoreSession();
    session.markInitialized(AUTH_CONTEXT.Customer);
  }

  if (session.isAdminAuthenticated()) {
    return router.createUrlTree(['/access-denied'], {
      queryParams: { context: 'admin-on-customer' },
    });
  }

  if (session.isCustomerAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};
