import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/legal-landing-page/legal-landing-page.component').then(
        (c) => c.LegalLandingPageComponent,
      ),
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./pages/legal-page/legal-page.component').then((c) => c.LegalPageComponent),
  },
];
