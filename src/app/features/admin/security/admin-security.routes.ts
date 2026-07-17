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
];
