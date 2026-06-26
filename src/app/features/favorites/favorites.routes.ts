import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/favorites-page/favorites-page.component').then(c => c.FavoritesPageComponent)
  }
];
