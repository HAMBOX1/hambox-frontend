import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { COMMERCE_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import {
  AddCartItemRequest,
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

  updateItem(productId: string, request: UpdateCartItemRequest): Observable<CartApiDto> {
    return this.api.put<CartApiDto>(COMMERCE_API.cartItem(productId), request);
  }

  removeItem(productId: string): Observable<CartApiDto> {
    return this.api.delete<CartApiDto>(COMMERCE_API.cartItem(productId));
  }

  clearCart(): Observable<void> {
    return this.api.delete<void>(COMMERCE_API.cart);
  }

  mergeGuestCart(request: MergeCartRequest): Observable<CartApiDto> {
    return this.api.post<CartApiDto>(COMMERCE_API.mergeCart, request);
  }
}
