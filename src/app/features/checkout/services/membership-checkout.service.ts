import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { COMMERCE_API } from '../../../core/api/api-endpoints';
import { OrderApiDto } from '../../cart/models/cart-api.model';

export interface MembershipCheckoutPreviewApiDto {
  readonly planId: string;
  readonly planName: string;
  readonly action: string;
  readonly price: number;
  readonly durationDays: number;
  readonly badgeLabel: string | null;
  readonly benefitCount: number;
  readonly requiresPayment: boolean;
  readonly currentPlanName: string | null;
}

export interface MembershipCheckoutRequestApiDto {
  readonly planId: string;
  readonly action: string;
  readonly email: string;
  readonly country: string;
  readonly paymentMethod: string;
  readonly couponCode?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MembershipCheckoutService {
  private readonly http = inject(HttpClient);

  getPreview(planId: string, action: string, couponCode?: string | null) {
    let params = new HttpParams().set('planId', planId).set('action', action);
    if (couponCode?.trim()) {
      params = params.set('couponCode', couponCode.trim());
    }
    return this.http.get<MembershipCheckoutPreviewApiDto>(COMMERCE_API.membershipCheckoutPreview, { params });
  }

  checkout(body: MembershipCheckoutRequestApiDto, idempotencyKey: string) {
    return this.http.post<OrderApiDto>(COMMERCE_API.membershipCheckout, body, {
      headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
    });
  }
}
