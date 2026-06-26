import { Routes } from '@angular/router';

import { guestGuard } from '../../core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/forgot-password-page/forgot-password-page.component').then(
        (c) => c.ForgotPasswordPageComponent,
      ),
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/reset-password-page/reset-password-page.component').then(
        (c) => c.ResetPasswordPageComponent,
      ),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/verify-email-page/verify-email-page.component').then(
        (c) => c.VerifyEmailPageComponent,
      ),
  },
  {
    path: 'resend-verification',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/resend-verification-page/resend-verification-page.component').then(
        (c) => c.ResendVerificationPageComponent,
      ),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
