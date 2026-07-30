import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tickets',
    pathMatch: 'full',
  },
  {
    path: 'tickets',
    canActivate: [permissionGuard([PERMISSIONS.Support.View])],
    loadComponent: () =>
      import('./pages/tickets-page/admin-support-tickets-page.component').then(
        (c) => c.AdminSupportTicketsPageComponent,
      ),
  },
];
