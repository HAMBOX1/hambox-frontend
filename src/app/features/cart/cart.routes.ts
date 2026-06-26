import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/cart-page/cart-page.component').then(c => c.CartPageComponent)
  }
];
