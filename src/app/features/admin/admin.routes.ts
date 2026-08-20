import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/guards/permission.guard';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';
import { PERMISSIONS } from '../../core/permissions/permission.constants';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'products',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    canActivate: [permissionGuard([PERMISSIONS.Dashboard.View])],
    loadComponent: () =>
      import('./pages/admin-dashboard-page/admin-dashboard-page.component').then(
        (c) => c.AdminDashboardPageComponent,
      ),
  },
  {
    path: 'products',
    canActivate: [permissionGuard([PERMISSIONS.Catalog.Products.View])],
    loadComponent: () =>
      import('../catalog/pages/product-catalog-page/product-catalog-page.component').then(
        (c) => c.ProductCatalogPageComponent,
      ),
  },
  {
    path: 'products/new',
    canActivate: [permissionGuard([PERMISSIONS.Catalog.Products.Create])],
    loadComponent: () =>
      import('../catalog/pages/product-edit-page/product-edit-page.component').then(
        (c) => c.ProductEditPageComponent,
      ),
  },
  {
    path: 'products/export',
    canActivate: [permissionGuard([PERMISSIONS.Catalog.Products.Export])],
    loadComponent: () =>
      import('../catalog/import-export/pages/catalog-export-page/catalog-export-page.component').then(
        (c) => c.CatalogExportPageComponent,
      ),
  },
  {
    path: 'products/import',
    canActivate: [permissionGuard([PERMISSIONS.Catalog.Products.Import])],
    loadComponent: () =>
      import(
        '../catalog/import-export/pages/catalog-import-wizard-page/catalog-import-wizard-page.component'
      ).then((c) => c.CatalogImportWizardPageComponent),
  },
  {
    path: 'products/import-export/jobs',
    canActivate: [permissionGuard([PERMISSIONS.Catalog.Products.View])],
    loadComponent: () =>
      import(
        '../catalog/import-export/pages/import-export-jobs-page/import-export-jobs-page.component'
      ).then((c) => c.ImportExportJobsPageComponent),
  },
  {
    path: 'products/:id/edit',
    canActivate: [permissionGuard([PERMISSIONS.Catalog.Products.Edit])],
    loadComponent: () =>
      import('../catalog/pages/product-edit-page/product-edit-page.component').then(
        (c) => c.ProductEditPageComponent,
      ),
  },
  {
    path: 'inventory',
    redirectTo: 'products',
    pathMatch: 'full',
  },
  {
    path: 'inventory/:variantId',
    canActivate: [permissionGuard([PERMISSIONS.Catalog.Inventory.View])],
    loadComponent: () =>
      import('../catalog/pages/variant-inventory-page/variant-inventory-page.component').then(
        (c) => c.VariantInventoryPageComponent,
      ),
  },
  {
    path: 'inventory/dashboard',
    redirectTo: 'products',
    pathMatch: 'full',
  },
  {
    path: 'inventory/new',
    redirectTo: 'products/new',
    pathMatch: 'full',
  },
  {
    path: 'inventory/:id/edit',
    redirectTo: 'products/:id/edit',
  },
  {
    path: 'inventory/:productId/variants/:variantId/codes',
    redirectTo: 'inventory/:variantId',
  },
  {
    path: 'categories',
    canActivate: [permissionGuard([PERMISSIONS.Catalog.Categories.View])],
    loadComponent: () =>
      import('../catalog/pages/category-list-page/category-list-page.component').then(
        (c) => c.CategoryListPageComponent,
      ),
  },
  {
    path: 'collections',
    canActivate: [permissionGuard([PERMISSIONS.Catalog.Collections.View])],
    loadComponent: () =>
      import('../catalog/pages/collection-list-page/collection-list-page.component').then(
        (c) => c.CollectionListPageComponent,
      ),
  },
  {
    path: 'roles',
    loadChildren: () =>
      import('./roles/admin-roles.routes').then((m) => m.routes),
  },
  {
    path: 'security',
    loadChildren: () =>
      import('./security/admin-security.routes').then((m) => m.routes),
  },
  {
    path: 'promotions',
    loadChildren: () =>
      import('./promotions/admin-promotions.routes').then((m) => m.routes),
  },
  {
    path: 'memberships',
    loadChildren: () =>
      import('./memberships/admin-memberships.routes').then((m) => m.routes),
  },
  {
    path: 'themes',
    loadChildren: () =>
      import('./themes/admin-themes.routes').then((m) => m.routes),
  },
  {
    path: 'campaigns',
    loadChildren: () =>
      import('./campaigns/admin-campaigns.routes').then((m) => m.routes),
  },
  {
    path: 'page-builder',
    loadChildren: () =>
      import('./page-builder/admin-page-builder.routes').then((m) => m.routes),
  },
  {
    path: 'faqs',
    loadChildren: () =>
      import('./faq/admin-faq.routes').then((m) => m.routes),
  },
  {
    path: 'legal',
    loadChildren: () =>
      import('./legal/admin-legal.routes').then((m) => m.routes),
  },
  {
    path: 'suppliers',
    loadChildren: () =>
      import('./suppliers/admin-suppliers.routes').then((m) => m.routes),
  },
  {
    path: 'communication',
    loadChildren: () =>
      import('./communication/admin-communication.routes').then((m) => m.routes),
  },
  {
    path: 'orders',
    loadChildren: () =>
      import('./orders/admin-orders.routes').then((m) => m.routes),
  },
  {
    path: 'operations',
    loadChildren: () =>
      import('./operations/admin-operations.routes').then((m) => m.routes),
  },
  {
    path: 'support',
    loadChildren: () =>
      import('./support/admin-support.routes').then((m) => m.routes),
  },
  {
    path: 'analytics',
    loadChildren: () =>
      import('./analytics/admin-analytics.routes').then((m) => m.routes),
  },
  {
    path: 'reports',
    loadChildren: () =>
      import('./reports/admin-reports.routes').then((m) => m.routes),
  },
  {
    path: 'settings',
    canActivate: [permissionGuard([PERMISSIONS.Settings.View])],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./settings/pages/admin-settings-page/admin-settings-page.component').then(
        (c) => c.AdminSettingsPageComponent,
      ),
  },
  {
    path: 'whatsapp',
    canActivate: [permissionGuard([PERMISSIONS.WhatsAppBot.View])],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./whatsapp/pages/admin-whatsapp-page/admin-whatsapp-page.component').then(
        (c) => c.AdminWhatsAppPageComponent,
      ),
  },
];
