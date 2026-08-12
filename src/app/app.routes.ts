import { Routes } from '@angular/router';

import { adminAuthenticationGuard } from './core/guards/admin-authentication.guard';
import { adminGuestGuard } from './core/guards/admin-guest.guard';
import { adminOtpGuard } from './core/guards/admin-otp.guard';
import { authGuard } from './core/guards/auth.guard';
import { customerGuard } from './core/guards/customer.guard';
import { guestGuard } from './core/guards/guest.guard';
import { maintenanceGuard } from './core/guards/maintenance.guard';

export const routes: Routes = [
  {
    path: 'login',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  {
    path: 'register',
    redirectTo: 'auth/register',
    pathMatch: 'full',
  },
  {
    path: 'admin/login',
    canActivate: [adminGuestGuard],
    loadComponent: () =>
      import('./features/auth/pages/admin-login-page/admin-login-page.component').then(
        (c) => c.AdminLoginPageComponent,
      ),
  },
  {
    path: 'admin/login/verify-otp',
    canActivate: [adminOtpGuard],
    loadComponent: () =>
      import('./features/auth/pages/admin-otp-page/admin-otp-page.component').then(
        (c) => c.AdminOtpPageComponent,
      ),
  },
  {
    path: 'auth/login',
    canActivate: [maintenanceGuard, guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then(
        (c) => c.LoginPageComponent,
      ),
  },
  {
    path: 'auth/register',
    canActivate: [maintenanceGuard, guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/register-page/register-page.component').then(
        (c) => c.RegisterPageComponent,
      ),
  },
  {
    path: 'auth',
    canActivate: [maintenanceGuard],
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component').then((c) => c.AuthLayoutComponent),
    children: [
      {
        path: '',
        loadChildren: () => import('./features/auth/auth.routes').then((m) => m.routes),
      },
    ],
  },
  {
    path: 'access-denied',
    canActivate: [maintenanceGuard],
    loadComponent: () =>
      import('./features/auth/pages/access-denied-page/access-denied-page.component').then(
        (c) => c.AccessDeniedPageComponent,
      ),
  },
  {
    path: 'coming-soon',
    loadComponent: () =>
      import('./features/auth/pages/coming-soon-page/coming-soon-page.component').then(
        (c) => c.ComingSoonPageComponent,
      ),
  },
  {
    path: '',
    canActivate: [maintenanceGuard, customerGuard],
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then((c) => c.MainLayoutComponent),
    children: [
      {
        path: 'home',
        loadChildren: () => import('./features/home/home.routes').then((m) => m.routes),
      },
      {
        path: 'products',
        loadChildren: () => import('./features/products/products.routes').then((m) => m.routes),
      },
      {
        path: 'categories/:slug',
        loadComponent: () =>
          import('./features/products/pages/category-landing-page/category-landing-page.component').then(
            (c) => c.CategoryLandingPageComponent,
          ),
      },
      {
        path: 'product-details',
        redirectTo: 'products',
        pathMatch: 'full',
      },
      {
        path: 'product-details/:id',
        redirectTo: 'products/:id',
      },
      {
        path: 'cart',
        loadChildren: () => import('./features/cart/cart.routes').then((m) => m.routes),
      },
      {
        path: 'legal',
        loadChildren: () => import('./features/legal/legal.routes').then((m) => m.routes),
      },
      {
        path: 'faq',
        loadChildren: () => import('./features/faq/faq.routes').then((m) => m.routes),
      },
      {
        path: 'checkout',
        canActivate: [authGuard],
        loadChildren: () => import('./features/checkout/checkout.routes').then((m) => m.routes),
      },
      {
        path: 'favorites',
        redirectTo: 'account/wishlist',
        pathMatch: 'full',
      },
      {
        path: 'profile',
        redirectTo: 'account/profile',
        pathMatch: 'full',
      },
      {
        path: 'orders',
        redirectTo: 'account/orders',
        pathMatch: 'full',
      },
      {
        path: 'account',
        canActivate: [authGuard],
        loadChildren: () => import('./features/account/account.routes').then((m) => m.routes),
      },
      {
        path: 'support-chat',
        loadChildren: () =>
          import('./features/support-chat/support-chat.routes').then((m) => m.routes),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'page-builder/preview-section',
    loadComponent: () =>
      import('./features/home/section-registry/preview/section-preview-stage.component').then(
        (c) => c.SectionPreviewStageComponent,
      ),
  },
  {
    path: 'admin',
    canActivate: [adminAuthenticationGuard],
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout.component').then((c) => c.AdminLayoutComponent),
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.routes),
  },
  {
    path: 'dashboard',
    redirectTo: 'account/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'inventory',
    redirectTo: 'admin/inventory',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
