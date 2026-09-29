import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/payment-gateways-list-page/payment-gateways-list-page.component').then(
        (c) => c.PaymentGatewaysListPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.PaymentGateways.View])],
  },
  {
    path: ':gatewayKey',
    loadComponent: () =>
      import('./pages/payment-gateway-detail-page/payment-gateway-detail-page.component').then(
        (c) => c.PaymentGatewayDetailPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.PaymentGateways.View])],
  },
];
