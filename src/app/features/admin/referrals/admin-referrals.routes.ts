import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/referrals-list-page/admin-referrals-list-page.component').then(
        (c) => c.AdminReferralsListPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Referral.View])],
  },
];
