import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/inventory-page/inventory-page.component').then(c => c.InventoryPageComponent)
  }
];
