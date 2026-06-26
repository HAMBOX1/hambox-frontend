import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'inventory',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/admin-stub-page/admin-stub-page.component').then(
        (c) => c.AdminStubPageComponent,
      ),
    data: {
      title: 'Dashboard',
      description: 'Overview of catalog performance, orders, and inventory health.',
    },
  },
  {
    path: 'inventory',
    loadComponent: () =>
      import('../catalog/pages/product-catalog-page/product-catalog-page.component').then(
        (c) => c.ProductCatalogPageComponent,
      ),
  },
  {
    path: 'inventory/new',
    loadComponent: () =>
      import('../catalog/pages/product-create-page/product-create-page.component').then(
        (c) => c.ProductCreatePageComponent,
      ),
  },
  {
    path: 'inventory/:id/edit',
    loadComponent: () =>
      import('../catalog/pages/product-edit-page/product-edit-page.component').then(
        (c) => c.ProductEditPageComponent,
      ),
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('../catalog/pages/category-list-page/category-list-page.component').then(
        (c) => c.CategoryListPageComponent,
      ),
  },
  {
    path: 'orders',
    loadComponent: () =>
      import('./pages/admin-stub-page/admin-stub-page.component').then(
        (c) => c.AdminStubPageComponent,
      ),
    data: {
      title: 'Orders',
      description: 'Review and fulfill customer orders from the storefront.',
    },
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./pages/admin-stub-page/admin-stub-page.component').then(
        (c) => c.AdminStubPageComponent,
      ),
    data: {
      title: 'Analytics',
      description: 'Review sales velocity, margins, and operational KPIs.',
    },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/admin-stub-page/admin-stub-page.component').then(
        (c) => c.AdminStubPageComponent,
      ),
    data: {
      title: 'Settings',
      description: 'Configure admin preferences and platform controls.',
    },
  },
];
