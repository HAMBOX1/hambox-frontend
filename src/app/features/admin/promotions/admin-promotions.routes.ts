import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/promotions-list-page/promotions-list-page.component').then(
        (c) => c.PromotionsListPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Promotions.View])],
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/promotion-edit-page/promotion-edit-page.component').then(
        (c) => c.PromotionEditPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Promotions.Create])],
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/promotion-edit-page/promotion-edit-page.component').then(
        (c) => c.PromotionEditPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Promotions.Edit])],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/promotion-detail-page/promotion-detail-page.component').then(
        (c) => c.PromotionDetailPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Promotions.View])],
  },
];
