import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/page-builder-page/page-builder-page.component').then(
        (c) => c.PageBuilderPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.PageBuilder.View])],
  },
];
