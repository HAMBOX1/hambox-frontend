import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { unsavedChangesGuard } from '../../../core/guards/unsaved-changes.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/faq-list-page/faq-list-page.component').then((c) => c.FaqListPageComponent),
    canActivate: [permissionGuard([PERMISSIONS.Faq.View])],
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/faq-edit-page/faq-edit-page.component').then((c) => c.FaqEditPageComponent),
    canActivate: [permissionGuard([PERMISSIONS.Faq.Create])],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/faq-edit-page/faq-edit-page.component').then((c) => c.FaqEditPageComponent),
    canActivate: [permissionGuard([PERMISSIONS.Faq.Edit])],
    canDeactivate: [unsavedChangesGuard],
  },
];
