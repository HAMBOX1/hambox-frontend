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
        path: 'library',
        loadComponent: () =>
          import('./pages/library-page/account-library-page.component').then(
            (c) => c.AccountLibraryPageComponent,
          ),
      },
      {
        path: 'library/:orderItemId/instructions',
        loadComponent: () =>
          import('./pages/library-instructions-page/account-library-instructions-page.component').then(
            (c) => c.AccountLibraryInstructionsPageComponent,
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
        path: 'membership',
        loadComponent: () =>
          import('./pages/membership-page/account-membership-page.component').then(
            (c) => c.AccountMembershipPageComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile-page/account-profile-page.component').then(
            (c) => c.AccountProfilePageComponent,
          ),
      },
      {
        path: 'support',
        loadComponent: () =>
          import('./support/pages/support-home-page/account-support-home-page.component').then(
            (c) => c.AccountSupportHomePageComponent,
          ),
      },
      {
        path: 'support/tickets/open',
        data: { statusGroup: 'open' },
        loadComponent: () =>
          import('./support/pages/tickets-list-page/account-support-tickets-list-page.component').then(
            (c) => c.AccountSupportTicketsListPageComponent,
          ),
      },
      {
        path: 'support/tickets/closed',
        data: { statusGroup: 'closed' },
        loadComponent: () =>
          import('./support/pages/tickets-list-page/account-support-tickets-list-page.component').then(
            (c) => c.AccountSupportTicketsListPageComponent,
          ),
      },
      {
        path: 'support/tickets/new',
        loadComponent: () =>
          import('./support/pages/create-ticket-page/account-create-ticket-page.component').then(
            (c) => c.AccountCreateTicketPageComponent,
          ),
      },
      {
        path: 'support/tickets/:ticketId',
        loadComponent: () =>
          import('./support/pages/ticket-detail-page/account-ticket-detail-page.component').then(
            (c) => c.AccountTicketDetailPageComponent,
          ),
      },
      {
        path: 'support/knowledge-base',
        loadComponent: () =>
          import('./support/pages/knowledge-base-page/account-knowledge-base-page.component').then(
            (c) => c.AccountKnowledgeBasePageComponent,
          ),
      },
    ],
  },
];
