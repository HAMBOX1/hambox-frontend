import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/faq-page/faq-page.component').then((c) => c.FaqPageComponent),
  },
];
