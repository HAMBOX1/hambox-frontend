import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '../auth/auth-session.service';

export const customerGuard: CanActivateFn = () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);

  if (session.isAdminAuthenticated()) {
    return router.createUrlTree(['/access-denied'], {
      queryParams: { context: 'admin-on-customer' },
    });
  }

  return true;
};
