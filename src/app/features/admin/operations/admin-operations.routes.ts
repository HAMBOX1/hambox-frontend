import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    canActivate: [permissionGuard([PERMISSIONS.Operations.View])],
    loadComponent: () =>
      import('./pages/operations-dashboard-page/operations-dashboard-page.component').then(
        (c) => c.OperationsDashboardPageComponent,
      ),
  },
  {
    path: 'jobs',
    canActivate: [permissionGuard([PERMISSIONS.Operations.View])],
    loadComponent: () =>
      import('./pages/operations-jobs-page/operations-jobs-page.component').then(
        (c) => c.OperationsJobsPageComponent,
      ),
  },
  {
    path: 'failed-jobs',
    canActivate: [permissionGuard([PERMISSIONS.Operations.View])],
    loadComponent: () =>
      import('./pages/operations-failed-jobs-page/operations-failed-jobs-page.component').then(
        (c) => c.OperationsFailedJobsPageComponent,
      ),
  },
  {
    path: 'delivery',
    canActivate: [permissionGuard([PERMISSIONS.Operations.View])],
    loadComponent: () =>
      import('./pages/operations-delivery-page/operations-delivery-page.component').then(
        (c) => c.OperationsDeliveryPageComponent,
      ),
  },
  {
    path: 'suppliers',
    canActivate: [permissionGuard([PERMISSIONS.Operations.View])],
    loadComponent: () =>
      import('./pages/operations-suppliers-page/operations-suppliers-page.component').then(
        (c) => c.OperationsSuppliersPageComponent,
      ),
  },
  {
    path: 'api-logs',
    canActivate: [permissionGuard([PERMISSIONS.Operations.View])],
    loadComponent: () =>
      import('./pages/operations-api-logs-page/operations-api-logs-page.component').then(
        (c) => c.OperationsApiLogsPageComponent,
      ),
  },
  {
    path: 'health',
    canActivate: [permissionGuard([PERMISSIONS.Operations.View])],
    loadComponent: () =>
      import('./pages/operations-health-page/operations-health-page.component').then(
        (c) => c.OperationsHealthPageComponent,
      ),
  },
];
