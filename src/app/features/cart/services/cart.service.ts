import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { COMMERCE_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import {
  AddCartItemRequest,
  ApplyCartCouponRequest,
  CartApiDto,
  MergeCartRequest,
  UpdateCartItemRequest,
} from '../models/cart-api.model';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly api = inject(ApiClientService);

  getCart(): Observable<CartApiDto> {
    return this.api.get<CartApiDto>(COMMERCE_API.cart);
  }

  addItem(request: AddCartItemRequest): Observable<CartApiDto> {
    return this.api.post<CartApiDto>(COMMERCE_API.cartItems, request);
  }

  updateItem(productId: string, request: UpdateCartItemRequest, variantId?: string | null): Observable<CartApiDto> {
    return this.api.put<CartApiDto>(COMMERCE_API.cartItem(productId, variantId), request);
  }

  removeItem(productId: string, variantId?: string | null): Observable<CartApiDto> {
    return this.api.delete<CartApiDto>(COMMERCE_API.cartItem(productId, variantId));
  }

  clearCart(): Observable<void> {
    return this.api.delete<void>(COMMERCE_API.cart);
  }

  mergeGuestCart(request: MergeCartRequest): Observable<CartApiDto> {
    return this.api.post<CartApiDto>(COMMERCE_API.mergeCart, request);
  }

  applyCoupon(request: ApplyCartCouponRequest): Observable<CartApiDto> {
    return this.api.post<CartApiDto>(COMMERCE_API.cartPromotionsApply, request);
  }

  removeCoupon(country?: string): Observable<CartApiDto> {
    return this.api.delete<CartApiDto>(COMMERCE_API.cartPromotions, {
      params: country ? { country } : {},
    });
  }
}
