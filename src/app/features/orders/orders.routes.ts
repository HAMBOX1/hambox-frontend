import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/orders-page/orders-page.component').then(c => c.OrdersPageComponent)
  }
];
