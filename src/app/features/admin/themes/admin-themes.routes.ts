import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/themes-list-page/themes-list-page.component').then(
        (c) => c.ThemesListPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Themes.View])],
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/theme-editor-page/theme-editor-page.component').then(
        (c) => c.ThemeEditorPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Themes.Create])],
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/theme-editor-page/theme-editor-page.component').then(
        (c) => c.ThemeEditorPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Themes.Edit])],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/theme-detail-page/theme-detail-page.component').then(
        (c) => c.ThemeDetailPageComponent,
      ),
    canActivate: [permissionGuard([PERMISSIONS.Themes.View])],
  },
];
