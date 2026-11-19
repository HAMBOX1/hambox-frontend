import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/customers-page/customers-page.component').then((c) => c.CustomersPageComponent),
    canActivate: [permissionGuard([PERMISSIONS.Security.ManageUsers])],
  },
];
