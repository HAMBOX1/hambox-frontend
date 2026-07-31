import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/roles-list-page/roles-list-page.component').then(
        (c) => c.RolesListPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Roles.View])],
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/role-edit-page/role-edit-page.component').then(
        (c) => c.RoleEditPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Roles.Create])],
  },
  {
    path: 'compare',
    loadComponent: () =>
      import('./pages/role-compare-page/role-compare-page.component').then(
        (c) => c.RoleComparePageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Roles.View])],
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/role-edit-page/role-edit-page.component').then(
        (c) => c.RoleEditPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Roles.View])],
  },
];
