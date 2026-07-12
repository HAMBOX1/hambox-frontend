import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/memberships-list-page/memberships-list-page.component').then(
        (c) => c.MembershipsListPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Memberships.View])],
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/membership-edit-page/membership-edit-page.component').then(
        (c) => c.MembershipEditPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Memberships.Create])],
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/membership-edit-page/membership-edit-page.component').then(
        (c) => c.MembershipEditPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Memberships.Edit])],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/membership-detail-page/membership-detail-page.component').then(
        (c) => c.MembershipDetailPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Memberships.View])],
  },
];
