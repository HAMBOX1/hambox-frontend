import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';

import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { CartFacade } from '../../cart/services/cart.facade';
import { CheckoutFacade } from './checkout.facade';
import { CheckoutService } from './checkout.service';

describe('CheckoutFacade', () => {
  let facade: CheckoutFacade;

  beforeEach(() => {
    const cartFacade = {
      items: signal([]),
      summary: signal({
        subtotal: 0,
        totalDiscount: 0,
        tax: 0,
        total: 0,
        itemCount: 0,
        appliedPromotions: [],
        validationErrors: [],
        appliedCouponCode: null,
      }),
      load: vi.fn().mockResolvedValue(undefined),
      isEmpty: () => true,
    };

    TestBed.configureTestingModule({
      providers: [
        CheckoutFacade,
        AuthSessionService,
        { provide: CartFacade, useValue: cartFacade },
        {
          provide: CheckoutService,
          useValue: { checkout: vi.fn(), getOrder: vi.fn() },
        },
      ],
    });

    facade = TestBed.inject(CheckoutFacade);
  });

  it('should initialize with card payment selected', () => {
    expect(facade.paymentMethod()).toBe('card');
  });

  it('should update billing fields', () => {
    facade.updateBillingField('email', 'jane@example.com');

    expect(facade.billingDetails().email).toBe('jane@example.com');
  });

  it('should reset to initial state', () => {
    facade.selectPaymentMethod('crypto');
    facade.reset();

    expect(facade.paymentMethod()).toBe('card');
  });
});
