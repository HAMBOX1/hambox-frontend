import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/orders-list-page/orders-list-page.component').then(
        (c) => c.OrdersListPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Orders.View])],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/order-detail-page/order-detail-page.component').then(
        (c) => c.OrderDetailPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Orders.View])],
  },
];
