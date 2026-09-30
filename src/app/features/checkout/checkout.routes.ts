import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/checkout-page/checkout-page.component').then((c) => c.CheckoutPageComponent),
  },
  {
    path: 'membership',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/membership-checkout-page/membership-checkout-page.component').then(
        (c) => c.MembershipCheckoutPageComponent,
      ),
  },
  {
    path: 'processing',
    canActivate: [authGuard],
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
    // No authGuard here either — same reasoning as 'dot/result': Cryptomus's own hosted page
    // redirects the browser back with no HAMBOX session attached, which can reload the SPA from
    // scratch. Authorizes via the opaque paymentAttemptId in the URL instead of a live session.
    path: 'cryptomus/result',
    loadComponent: () =>
      import('./pages/cryptomus-payment-result-page/cryptomus-payment-result-page.component').then(
        (c) => c.CryptomusPaymentResultPageComponent,
      ),
  },
  {
    // No authGuard here either — same reasoning as 'cryptomus/result': OxaPay's own hosted page
    // redirects the browser back with no HAMBOX session attached, which can reload the SPA from
    // scratch. Authorizes via the opaque paymentAttemptId in the URL instead of a live session.
    path: 'oxapay/result',
    loadComponent: () =>
      import('./pages/oxapay-payment-result-page/oxapay-payment-result-page.component').then(
        (c) => c.OxaPayPaymentResultPageComponent,
      ),
  },
  {
    path: 'success/:orderId',
    canActivate: [authGuard],
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