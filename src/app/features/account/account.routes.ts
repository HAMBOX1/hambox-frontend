import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/account-layout/account-layout.component').then((c) => c.AccountLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard-page/account-dashboard-page.component').then(
            (c) => c.AccountDashboardPageComponent,
          ),
      },
      {
        path: 'wishlist',
        loadComponent: () =>
          import('./pages/wishlist-page/account-wishlist-page.component').then(
            (c) => c.AccountWishlistPageComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/orders-page/account-orders-page.component').then(
            (c) => c.AccountOrdersPageComponent,
          ),
      },
      {
        path: 'orders/:orderId',
        loadComponent: () =>
          import('./pages/order-detail-page/account-order-detail-page.component').then(
            (c) => c.AccountOrderDetailPageComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications-page/account-notifications-page.component').then(
            (c) => c.AccountNotificationsPageComponent,
          ),
      },
      {
        path: 'referral',
        loadComponent: () =>
          import('./pages/referral-page/account-referral-page.component').then(
            (c) => c.AccountReferralPageComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile-page/account-profile-page.component').then(
            (c) => c.AccountProfilePageComponent,
          ),
      },
    ],
  },
];
