import { Routes } from '@angular/router';

import { permissionGuard } from '../../../core/guards/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    canActivate: [permissionGuard([PERMISSIONS.Analytics.View])],
    loadComponent: () =>
      import('./pages/analytics-shell-page/analytics-shell-page.component').then(
        (c) => c.AnalyticsShellPageComponent,
      ),
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full',
      },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/analytics-overview-page/analytics-overview-page.component').then(
            (c) => c.AnalyticsOverviewPageComponent,
          ),
      },
      {
        path: 'revenue',
        loadComponent: () =>
          import('./pages/analytics-revenue-page/analytics-revenue-page.component').then(
            (c) => c.AnalyticsRevenuePageComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/analytics-orders-page/analytics-orders-page.component').then(
            (c) => c.AnalyticsOrdersPageComponent,
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/analytics-products-page/analytics-products-page.component').then(
            (c) => c.AnalyticsProductsPageComponent,
          ),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/analytics-categories-page/analytics-categories-page.component').then(
            (c) => c.AnalyticsCategoriesPageComponent,
          ),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./pages/analytics-customers-page/analytics-customers-page.component').then(
            (c) => c.AnalyticsCustomersPageComponent,
          ),
      },
      {
        path: 'memberships',
        loadComponent: () =>
          import('./pages/analytics-memberships-page/analytics-memberships-page.component').then(
            (c) => c.AnalyticsMembershipsPageComponent,
          ),
      },
      {
        path: 'promotions',
        loadComponent: () =>
          import('./pages/analytics-promotions-page/analytics-promotions-page.component').then(
            (c) => c.AnalyticsPromotionsPageComponent,
          ),
      },
      {
        path: 'referrals',
        loadComponent: () =>
          import('./pages/analytics-referrals-page/analytics-referrals-page.component').then(
            (c) => c.AnalyticsReferralsPageComponent,
          ),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./pages/analytics-search-page/analytics-search-page.component').then(
            (c) => c.AnalyticsSearchPageComponent,
          ),
      },
      {
        path: 'operations',
        loadComponent: () =>
          import('./pages/analytics-operations-page/analytics-operations-page.component').then(
            (c) => c.AnalyticsOperationsPageComponent,
          ),
      },
    ],
  },
];