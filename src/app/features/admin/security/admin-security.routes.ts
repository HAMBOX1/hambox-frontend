import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/security-center-page/security-center-page.component').then(
        (c) => c.SecurityCenterPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Security.View])],
  },
  {
    // Self-service "my own sessions" — no permission gate beyond being an authenticated admin
    // (already enforced by the parent /admin route's adminAuthenticationGuard), since this is
    // account-level, not a managed resource like the Security.View-gated investigator tool above.
    path: 'my-sessions',
    loadComponent: () =>
      import('./pages/my-sessions-page/my-sessions-page.component').then((c) => c.MySessionsPageComponent),
  },
];
