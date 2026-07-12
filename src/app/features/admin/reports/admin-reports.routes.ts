import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    canActivate: [permissionGuard([PERMISSIONS.Reports.View])],
    loadComponent: () =>
      import('./pages/reports-shell-page/reports-shell-page.component').then(
        (c) => c.ReportsShellPageComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/reports-library-page/reports-library-page.component').then(
            (c) => c.ReportsLibraryPageComponent,
          ),
      },
      {
        path: 'generate',
        loadComponent: () =>
          import('./pages/reports-generate-page/reports-generate-page.component').then(
            (c) => c.ReportsGeneratePageComponent,
          ),
      },
      {
        path: 'generate/:type',
        loadComponent: () =>
          import('./pages/reports-generate-page/reports-generate-page.component').then(
            (c) => c.ReportsGeneratePageComponent,
          ),
      },
      {
        path: 'downloads',
        loadComponent: () =>
          import('./pages/reports-downloads-page/reports-downloads-page.component').then(
            (c) => c.ReportsDownloadsPageComponent,
          ),
      },
      {
        path: 'schedules',
        loadComponent: () =>
          import('./pages/reports-schedules-page/reports-schedules-page.component').then(
            (c) => c.ReportsSchedulesPageComponent,
          ),
      },
    ],
  },
];