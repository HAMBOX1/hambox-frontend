import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/products-page/products-page.component').then((c) => c.ProductsPageComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('../product-details/pages/product-details-page/product-details-page.component').then(
        (c) => c.ProductDetailsPageComponent,
      ),
  },
];
