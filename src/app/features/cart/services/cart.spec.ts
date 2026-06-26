import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { GuestCartSessionService } from '../../../core/cart/guest-cart-session.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { CartApiDto } from '../models/cart-api.model';
import { CartFacade } from './cart.facade';
import { CartService } from './cart.service';

const EMPTY_CART: CartApiDto = {
  cartId: null,
  guestSessionId: 'guest-1',
  items: [],
  totals: {
    subtotal: 0,
    memberDiscount: 0,
    tax: 0,
    total: 0,
    itemCount: 0,
  },
};

const POPULATED_CART: CartApiDto = {
  cartId: 'cart-1',
  guestSessionId: 'guest-1',
  items: [
    {
      productId: 'product-1',
      productNameEn: 'Test Product',
      quantity: 2,
      unitPrice: 25,
      lineTotal: 50,
    },
  ],
  totals: {
    subtotal: 50,
    memberDiscount: 5,
    tax: 2.25,
    total: 47.25,
    itemCount: 2,
  },
};

describe('CartFacade', () => {
  let facade: CartFacade;
  let cartService: jasmine.SpyObj<CartService>;

  beforeEach(() => {
    cartService = jasmine.createSpyObj<CartService>('CartService', [
      'getCart',
      'addItem',
      'updateItem',
      'removeItem',
      'clearCart',
      'mergeGuestCart',
    ]);

    TestBed.configureTestingModule({
      providers: [
        CartFacade,
        GuestCartSessionService,
        AuthSessionService,
        { provide: CartService, useValue: cartService },
      ],
    });

    facade = TestBed.inject(CartFacade);
    cartService.getCart.and.returnValue(of(EMPTY_CART));
  });

  it('should load an empty cart', async () => {
    await facade.load();

    expect(facade.isEmpty()).toBeTrue();
    expect(facade.itemCount()).toBe(0);
  });

  it('should map cart items and totals from the API', async () => {
    cartService.getCart.and.returnValue(of(POPULATED_CART));

    await facade.load();

    expect(facade.items().length).toBe(1);
    expect(facade.summary().subtotal).toBe(50);
    expect(facade.summary().total).toBe(47.25);
  });

  it('should surface API errors when loading fails', async () => {
    cartService.getCart.and.returnValue(throwError(() => new Error('network')));

    await facade.load();

    expect(facade.error()).toBe('Failed to load your cart.');
    expect(facade.isEmpty()).toBeTrue();
  });
});
