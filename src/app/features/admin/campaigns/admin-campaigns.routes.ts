import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/campaigns-list-page/campaigns-list-page.component').then(
        (c) => c.CampaignsListPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Campaigns.View])],
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/campaign-form-page/campaign-form-page.component').then(
        (c) => c.CampaignFormPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Campaigns.Create])],
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/campaign-form-page/campaign-form-page.component').then(
        (c) => c.CampaignFormPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Campaigns.Edit])],
  },
];
