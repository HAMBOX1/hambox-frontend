import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/floating-ads-page/floating-ads-page.component').then((c) => c.FloatingAdsPageComponent),
    canActivate: [permissionGuard([PERMISSIONS.Promotions.View])],
  },
];
