import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/checkout-page/checkout-page.component').then((c) => c.CheckoutPageComponent),
  },
  {
    path: 'processing',
    loadComponent: () =>
      import('./pages/payment-processing-page/payment-processing-page.component').then(
        (c) => c.PaymentProcessingPageComponent,
      ),
  },
  {
    path: 'success/:orderId',
    loadComponent: () =>
      import('./pages/order-success-page/order-success-page.component').then(
        (c) => c.OrderSuccessPageComponent,
      ),
  },
  {
    path: 'success',
    redirectTo: '/home',
    pathMatch: 'full',
  },
];
