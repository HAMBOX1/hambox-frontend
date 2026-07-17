import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/communication-dashboard-page/communication-dashboard-page.component').then(
        (c) => c.CommunicationDashboardPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Communication.View])],
  },
  {
    path: 'templates',
    loadComponent: () =>
      import('./pages/communication-templates-page/communication-templates-page.component').then(
        (c) => c.CommunicationTemplatesPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Communication.View])],
  },
  {
    path: 'messages',
    loadComponent: () =>
      import('./pages/communication-messages-page/communication-messages-page.component').then(
        (c) => c.CommunicationMessagesPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Communication.View])],
  },
  {
    path: 'failed-deliveries',
    loadComponent: () =>
      import('./pages/communication-failed-deliveries-page/communication-failed-deliveries-page.component').then(
        (c) => c.CommunicationFailedDeliveriesPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Communication.View])],
  },
  {
    path: 'providers',
    loadComponent: () =>
      import('./pages/communication-providers-page/communication-providers-page.component').then(
        (c) => c.CommunicationProvidersPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Communication.View])],
  },
];
