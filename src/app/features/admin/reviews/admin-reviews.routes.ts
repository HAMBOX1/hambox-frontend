import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/admin-reviews-page.component').then((c) => c.AdminReviewsPageComponent),
    canActivate: [permissionGuard([PERMISSIONS.Reviews.View])],
  },
];
