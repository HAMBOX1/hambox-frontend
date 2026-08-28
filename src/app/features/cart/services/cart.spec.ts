import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';

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
    totalDiscount: 0,
    tax: 0,
    total: 0,
    itemCount: 0,
    appliedPromotions: [],
    validationErrors: [],
    appliedCouponCode: null,
  },
};

const POPULATED_CART: CartApiDto = {
  cartId: 'cart-1',
  guestSessionId: 'guest-1',
  items: [
    {
      productId: 'product-1',
      productVariantId: null,
      variantSku: null,
      productNameEn: 'Test Product',
      quantity: 2,
      unitPrice: 25,
      lineTotal: 50,
    },
  ],
  totals: {
    subtotal: 50,
    totalDiscount: 5,
    tax: 2.25,
    total: 47.25,
    itemCount: 2,
    appliedPromotions: [],
    validationErrors: [],
    appliedCouponCode: null,
  },
};

describe('CartFacade', () => {
  let facade: CartFacade;
  let cartService: {
    getCart: ReturnType<typeof vi.fn>;
    addItem: ReturnType<typeof vi.fn>;
    updateItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clearCart: ReturnType<typeof vi.fn>;
    mergeGuestCart: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    cartService = {
      getCart: vi.fn(),
      addItem: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
      mergeGuestCart: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        CartFacade,
        GuestCartSessionService,
        AuthSessionService,
        { provide: CartService, useValue: cartService },
      ],
    });

    facade = TestBed.inject(CartFacade);
    cartService.getCart.mockReturnValue(of(EMPTY_CART));
  });

  it('should load an empty cart', async () => {
    await facade.load();

    expect(facade.isEmpty()).toBe(true);
    expect(facade.itemCount()).toBe(0);
  });

  it('should map cart items and totals from the API', async () => {
    cartService.getCart.mockReturnValue(of(POPULATED_CART));

    await facade.load();

    expect(facade.items().length).toBe(1);
    expect(facade.summary().subtotal).toBe(50);
    expect(facade.summary().total).toBe(47.25);
  });

  it('should surface API errors when loading fails', async () => {
    cartService.getCart.mockReturnValue(throwError(() => new Error('network')));

    await facade.load();

    expect(facade.error()).toBe('Failed to load your cart.');
    expect(facade.isEmpty()).toBe(true);
  });
});
