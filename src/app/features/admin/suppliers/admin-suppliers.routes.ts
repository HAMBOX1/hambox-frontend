import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { unsavedChangesGuard } from '../../../core/guards/unsaved-changes.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/suppliers-list-page/suppliers-list-page.component').then(
        (c) => c.SuppliersListPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Suppliers.View])],
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/supplier-detail-page/supplier-detail-page.component').then(
        (c) => c.SupplierDetailPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Suppliers.Create])],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':id/mappings',
    loadComponent: () =>
      import('./pages/supplier-mappings-page/supplier-mappings-page.component').then(
        (c) => c.SupplierMappingsPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Suppliers.View])],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/supplier-detail-page/supplier-detail-page.component').then(
        (c) => c.SupplierDetailPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Suppliers.View])],
    canDeactivate: [unsavedChangesGuard],
  },
];
