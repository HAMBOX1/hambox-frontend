import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/customers-page/customers-page.component').then(c => c.CustomersPageComponent)
  }
];
