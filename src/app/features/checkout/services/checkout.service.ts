import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { COMMERCE_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { CheckoutRequest, OrderApiDto } from '../../cart/models/cart-api.model';
import {
  CheckoutConfigurationDto,
  DotCheckoutInitiationDto,
  DotFawryCheckoutInitiationDto,
  DotFawryPaymentStatusDto,
  DotPaymentStatusDto,
} from '../models/checkout';

interface InitiateDotCheckoutRequest {
  email: string;
  country: string;
  wallet: string;
}

interface InitiateDotFawryCheckoutRequest {
  email: string;
  country: string;
  phoneNumber: string;
  customerName: string | null;
  wallet: string;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private readonly api = inject(ApiClientService);

  checkout(request: CheckoutRequest, idempotencyKey: string): Observable<OrderApiDto> {
    return this.api.post<OrderApiDto>(COMMERCE_API.checkout, request, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  getConfiguration(): Observable<CheckoutConfigurationDto> {
    return this.api.get<CheckoutConfigurationDto>(COMMERCE_API.checkoutConfiguration);
  }

  getOrder(orderId: string): Observable<OrderApiDto> {
    return this.api.get<OrderApiDto>(COMMERCE_API.order(orderId));
  }

  initiateDotCheckout(
    request: InitiateDotCheckoutRequest,
    idempotencyKey: string,
  ): Observable<DotCheckoutInitiationDto> {
    return this.api.post<DotCheckoutInitiationDto>(COMMERCE_API.checkoutDot, request, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  getDotPaymentStatus(paymentAttemptId: string): Observable<DotPaymentStatusDto> {
    return this.api.get<DotPaymentStatusDto>(COMMERCE_API.dotPaymentStatus(paymentAttemptId));
  }

  initiateDotFawryCheckout(
    request: InitiateDotFawryCheckoutRequest,
    idempotencyKey: string,
  ): Observable<DotFawryCheckoutInitiationDto> {
    return this.api.post<DotFawryCheckoutInitiationDto>(COMMERCE_API.checkoutDotFawry, request, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  getDotFawryPaymentStatus(paymentAttemptId: string): Observable<DotFawryPaymentStatusDto> {
    return this.api.get<DotFawryPaymentStatusDto>(COMMERCE_API.dotFawryPaymentStatus(paymentAttemptId));
  }
}
