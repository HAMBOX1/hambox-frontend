import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { PROMOTIONS_API } from '../api/api-endpoints';

/** A promo code the admin chose to show on a product's page. */
export interface ProductCoupon {
  readonly code: string;
  readonly discountType: 'Percentage' | 'FixedAmount' | string;
  readonly discountValue: number;
}

/** The promo codes shown on a product page ("With coupon code: X"). Never throws: no codes is a normal answer. */
@Injectable({ providedIn: 'root' })
export class ProductCouponService {
  private readonly api = inject(ApiClientService);

  async forProduct(productId: string, categoryId?: string | null): Promise<readonly ProductCoupon[]> {
    try {
      const params: Record<string, string> = { productId };
      if (categoryId) {
        params['categoryId'] = categoryId;
      }
      return await firstValueFrom(this.api.get<readonly ProductCoupon[]>(PROMOTIONS_API.productCoupons, { params }));
    } catch {
      return [];
    }
  }
}
