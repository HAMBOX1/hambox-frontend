import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/product-details-page/product-details-page.component').then(c => c.ProductDetailsPageComponent)
  }
];
