import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ADMIN_OTP_CHALLENGE_KEY, readAdminOtpChallenge } from '../../features/auth/services/admin-otp-state';

export const adminOtpGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (!readAdminOtpChallenge()) {
    return router.createUrlTree(['/admin/login']);
  }

  return true;
};
