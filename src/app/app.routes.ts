import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then(
        (c) => c.LoginPageComponent,
      ),
  },
  {
    path: 'auth/register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/register-page/register-page.component').then(
        (c) => c.RegisterPageComponent,
      ),
  },
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component').then(c => c.AuthLayoutComponent),
    children: [
      {
        path: '',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.routes)
      }
    ]
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(c => c.MainLayoutComponent),
    children: [
      {
        path: 'home',
        loadChildren: () => import('./features/home/home.routes').then(m => m.routes)
      },
      {
        path: 'products',
        loadChildren: () => import('./features/products/products.routes').then(m => m.routes)
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
        loadChildren: () => import('./features/cart/cart.routes').then(m => m.routes)
      },
      {
        path: 'checkout',
        canActivate: [authGuard],
        loadChildren: () => import('./features/checkout/checkout.routes').then(m => m.routes)
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
        loadChildren: () => import('./features/support-chat/support-chat.routes').then(m => m.routes)
      },
      {
        path: 'customers',
        loadChildren: () => import('./features/customers/customers.routes').then(m => m.routes)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
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
    redirectTo: ''
  }
];
