import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../../core/guards/unsaved-changes.guard';
import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/legal-dashboard-page/legal-dashboard-page.component').then(
        (c) => c.LegalDashboardPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Legal.View])],
  },
  {
    path: 'acceptance-tracking',
    loadComponent: () =>
      import('./pages/legal-acceptance-tracking-page/legal-acceptance-tracking-page.component').then(
        (c) => c.LegalAcceptanceTrackingPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Legal.View])],
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./pages/legal-section-detail-page/legal-section-detail-page.component').then(
        (c) => c.LegalSectionDetailPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Legal.View])],
    canDeactivate: [unsavedChangesGuard],
  },
];
