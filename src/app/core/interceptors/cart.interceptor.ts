import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { COMMERCE_API, GUEST_CART_HEADER } from '../api/api-endpoints';
import { GuestCartSessionService } from '../cart/guest-cart-session.service';

function isCommerceRequest(url: string): boolean {
  return (
    url.includes(COMMERCE_API.cart) ||
    url.includes(COMMERCE_API.checkout) ||
    url.includes('/api/v1/orders/') ||
    url.includes('/cart/promotions')
  );
}

export const cartInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isCommerceRequest(req.url)) {
    return next(req);
  }

  const guestSessionId = inject(GuestCartSessionService).getGuestSessionId();
  if (!guestSessionId) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        [GUEST_CART_HEADER]: guestSessionId,
      },
    }),
  );
};
