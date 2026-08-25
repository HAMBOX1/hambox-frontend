import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { GuestCartSessionService } from '../../../core/cart/guest-cart-session.service';
import { ApiError } from '../../../core/models/api-error.model';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { CartApiDto } from '../models/cart-api.model';
import { CartLineItem, CartSummary } from '../models/cart';
import { mapCartResponse } from '../utils/cart.mapper';
import { CartService } from './cart.service';

const EMPTY_SUMMARY: CartSummary = {
  subtotal: 0,
  totalDiscount: 0,
  tax: 0,
  total: 0,
  itemCount: 0,
  appliedPromotions: [],
  validationErrors: [],
  appliedCouponCode: null,
};

@Injectable({
  providedIn: 'root',
})
export class CartFacade {
  private readonly cartService = inject(CartService);
  private readonly guestSession = inject(GuestCartSessionService);
  private readonly authSession = inject(AuthSessionService);

  private readonly itemsState = signal<readonly CartLineItem[]>([]);
  private readonly summaryState = signal<CartSummary>(EMPTY_SUMMARY);
  private readonly loadingState = signal(false);
  private readonly mutatingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly addingProductIdState = signal<string | null>(null);
  private readonly couponApplyingState = signal(false);

  readonly items = this.itemsState.asReadonly();
  readonly summary = this.summaryState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly mutating = this.mutatingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly addingProductId = this.addingProductIdState.asReadonly();
  readonly couponApplying = this.couponApplyingState.asReadonly();

  readonly itemCount = computed(() => this.summaryState().itemCount);
  readonly isEmpty = computed(() => this.itemsState().length === 0);

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const cart = await firstValueFrom(this.cartService.getCart());
      await this.applyCartResponse(cart);
    } catch (error) {
      this.itemsState.set([]);
      this.summaryState.set(EMPTY_SUMMARY);
      this.errorState.set(this.toErrorMessage(error, 'Failed to load your cart.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  async addItem(productId: string, quantity = 1, productVariantId?: string | null): Promise<void> {
    this.addingProductIdState.set(productId);
    this.errorState.set(null);

    try {
      const cart = await firstValueFrom(
        this.cartService.addItem({ productId, quantity, productVariantId }),
      );
      await this.applyCartResponse(cart);
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to add this item to your cart.'));
      throw error;
    } finally {
      this.addingProductIdState.set(null);
    }
  }

  async removeItem(lineId: string): Promise<void> {
    const item = this.itemsState().find((entry) => entry.id === lineId);
    if (!item) {
      return;
    }

    await this.mutate(() => this.cartService.removeItem(item.productId, item.productVariantId));
  }

  async updateQuantity(lineId: string, quantity: number): Promise<void> {
    const item = this.itemsState().find((entry) => entry.id === lineId);
    if (!item) {
      return;
    }

    if (quantity < 1) {
      await this.removeItem(lineId);
      return;
    }

    await this.mutate(() =>
      this.cartService.updateItem(item.productId, { quantity }, item.productVariantId),
    );
  }

  async incrementQuantity(lineId: string): Promise<void> {
    const item = this.itemsState().find((entry) => entry.id === lineId);
    if (item) {
      await this.updateQuantity(lineId, item.quantity + 1);
    }
  }

  async decrementQuantity(lineId: string): Promise<void> {
    const item = this.itemsState().find((entry) => entry.id === lineId);
    if (item) {
      await this.updateQuantity(lineId, item.quantity - 1);
    }
  }

  async clearCart(): Promise<void> {
    this.mutatingState.set(true);
    this.errorState.set(null);

    try {
      await firstValueFrom(this.cartService.clearCart());
      this.itemsState.set([]);
      this.summaryState.set(EMPTY_SUMMARY);
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to clear your cart.'));
      throw error;
    } finally {
      this.mutatingState.set(false);
    }
  }

  async applyCoupon(couponCode: string, country?: string): Promise<void> {
    this.couponApplyingState.set(true);
    this.errorState.set(null);

    try {
      const cart = await firstValueFrom(
        this.cartService.applyCoupon({
          couponCode: couponCode.trim(),
          ...(country ? { country } : {}),
        }),
      );
      await this.applyCartResponse(cart);
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to apply this coupon.'));
      throw error;
    } finally {
      this.couponApplyingState.set(false);
    }
  }

  async removeCoupon(country?: string): Promise<void> {
    this.couponApplyingState.set(true);
    this.errorState.set(null);

    try {
      const cart = await firstValueFrom(this.cartService.removeCoupon(country));
      await this.applyCartResponse(cart);
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to remove the coupon.'));
      throw error;
    } finally {
      this.couponApplyingState.set(false);
    }
  }

  async mergeGuestCartIfNeeded(): Promise<void> {
    const guestSessionId = this.guestSession.getGuestSessionId();
    if (!guestSessionId || !this.authSession.isAuthenticated()) {
      return;
    }

    try {
      const cart = await firstValueFrom(
        this.cartService.mergeGuestCart({ guestSessionId }),
      );
      this.guestSession.clearGuestSessionId();
      await this.applyCartResponse(cart);
    } catch {
      // Keep guest session so a later login retry can merge again.
    }
  }

  private async mutate(request: () => import('rxjs').Observable<CartApiDto>): Promise<void> {
    this.mutatingState.set(true);
    this.errorState.set(null);

    try {
      const result = await firstValueFrom(request());
      await this.applyCartResponse(result);
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to update your cart.'));
      throw error;
    } finally {
      this.mutatingState.set(false);
    }
  }

  private async applyCartResponse(cart: CartApiDto): Promise<void> {
    if (cart.guestSessionId) {
      this.guestSession.setGuestSessionId(cart.guestSessionId);
    }

    const mapped = mapCartResponse(cart);

    this.itemsState.set(mapped.items);
    this.summaryState.set(mapped.summary);
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return fallback;
  }
}
