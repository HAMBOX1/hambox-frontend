import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import { PROMOTIONS_API } from '../../../core/api/api-endpoints';
import {
  CreatePromotionRequest,
  PromotionListItemDto,
  PromotionListResult,
} from '../../admin/promotions/models/promotion-api.model';

export interface PromoTargets {
  readonly productIds: readonly string[];
  readonly categoryIds: readonly string[];
}

export interface PromoApplyResult {
  readonly productsAdded: number;
  readonly categoriesAdded: number;
  readonly alreadyTargeted: number;
}

export interface NewPromoCode {
  readonly code: string;
  readonly discountType: 'Percentage' | 'FixedAmount';
  readonly discountValue: number;
}

/**
 * The products page's shortcut to promo codes: attach products (or a whole category) to a code that already exists, or
 * create a new code for them in one step — instead of opening Promotions and picking them from a long product list.
 */
@Injectable({ providedIn: 'root' })
export class ProductPromoService {
  private readonly api = inject(ApiClientService);

  /** The promo-code promotions an admin can attach products to (archived ones are left out). */
  async listCodePromotions(): Promise<readonly PromotionListItemDto[]> {
    const result = await firstValueFrom(
      this.api.get<PromotionListResult>(PROMOTIONS_API.promotions, {
        params: { pageNumber: 1, pageSize: 100, type: 'CouponCode' },
      }),
    );
    return (result.items ?? []).filter((promotion) => promotion.status !== 'Archived');
  }

  /** Attaches the products/categories to an existing promotion (already-attached ones are skipped). */
  async addTargets(promotionId: string, targets: PromoTargets): Promise<PromoApplyResult> {
    return firstValueFrom(
      this.api.post<PromoApplyResult>(PROMOTIONS_API.targets(promotionId), {
        productIds: targets.productIds,
        categoryIds: targets.categoryIds,
      }),
    );
  }

  /**
   * Creates a new promo code that discounts only the given products/categories. A new promotion starts as a draft, so it
   * is published right away when `publish` is true (otherwise the code would not work yet).
   */
  async createCode(code: NewPromoCode, targets: PromoTargets, publish: boolean): Promise<PromoApplyResult> {
    const request: CreatePromotionRequest = {
      name: code.code,
      type: 'CouponCode',
      discountType: code.discountType,
      discountValue: code.discountValue,
      targets: [
        ...targets.productIds.map((targetId) => ({ type: 'Product', targetId })),
        ...targets.categoryIds.map((targetId) => ({ type: 'Category', targetId })),
      ],
      initialCouponCode: code.code,
    };

    const created = await firstValueFrom(
      this.api.post<{ readonly id: string } | string>(PROMOTIONS_API.promotions, request),
    );
    const promotionId = typeof created === 'string' ? created : created.id;

    if (publish) {
      await firstValueFrom(this.api.post<void>(PROMOTIONS_API.publish(promotionId), {}));
    }

    return {
      productsAdded: targets.productIds.length,
      categoriesAdded: targets.categoryIds.length,
      alreadyTargeted: 0,
    };
  }
}
