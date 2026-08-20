import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/checkout-page/checkout-page.component').then((c) => c.CheckoutPageComponent),
  },
  {
    path: 'membership',
    loadComponent: () =>
      import('./pages/membership-checkout-page/membership-checkout-page.component').then(
        (c) => c.MembershipCheckoutPageComponent,
      ),
  },
  {
    path: 'processing',
    loadComponent: () =>
      import('./pages/payment-processing-page/payment-processing-page.component').then(
        (c) => c.PaymentProcessingPageComponent,
      ),
  },
  {
    path: 'dot/result',
    loadComponent: () =>
      import('./pages/dot-payment-result-page/dot-payment-result-page.component').then(
        (c) => c.DotPaymentResultPageComponent,
      ),
  },
  {
    path: 'dot-fawry/result',
    loadComponent: () =>
      import('./pages/dot-fawry-payment-result-page/dot-fawry-payment-result-page.component').then(
        (c) => c.DotFawryPaymentResultPageComponent,
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
