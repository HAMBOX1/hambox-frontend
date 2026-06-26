import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

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
        discountLabel: 'Rebel Member Discount (10%)',
        discountAmount: 0,
        tax: 0,
        total: 0,
        itemCount: 0,
      }),
      load: jasmine.createSpy('load').and.resolveTo(),
      isEmpty: () => true,
    };

    TestBed.configureTestingModule({
      providers: [
        CheckoutFacade,
        AuthSessionService,
        { provide: CartFacade, useValue: cartFacade },
        {
          provide: CheckoutService,
          useValue: jasmine.createSpyObj<CheckoutService>('CheckoutService', [
            'checkout',
            'getOrder',
          ]),
        },
      ],
    });

    facade = TestBed.inject(CheckoutFacade);
  });

  it('should initialize with card payment selected', () => {
    expect(facade.paymentMethod()).toBe('card');
  });

  it('should update card and billing fields', () => {
    facade.updateCardField('cardholderName', 'Jane Doe');
    facade.updateBillingField('email', 'jane@example.com');

    expect(facade.cardDetails().cardholderName).toBe('Jane Doe');
    expect(facade.billingDetails().email).toBe('jane@example.com');
  });

  it('should reset to initial state', () => {
    facade.selectPaymentMethod('crypto');
    facade.updateCardField('cvc', '999');
    facade.reset();

    expect(facade.paymentMethod()).toBe('card');
    expect(facade.cardDetails().cvc).toBe('');
  });
});
