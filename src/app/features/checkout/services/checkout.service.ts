import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { COMMERCE_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { CheckoutRequest, OrderApiDto } from '../../cart/models/cart-api.model';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private readonly api = inject(ApiClientService);

  checkout(request: CheckoutRequest): Observable<OrderApiDto> {
    return this.api.post<OrderApiDto>(COMMERCE_API.checkout, request);
  }

  getOrder(orderId: string): Observable<OrderApiDto> {
    return this.api.get<OrderApiDto>(COMMERCE_API.order(orderId));
  }
}
