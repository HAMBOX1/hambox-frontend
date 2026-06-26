import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/profile-page/profile-page.component').then(c => c.ProfilePageComponent)
  }
];
