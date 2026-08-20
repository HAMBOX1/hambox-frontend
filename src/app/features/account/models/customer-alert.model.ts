export type CustomerAlertType = 'BackInStock' | 'PriceDrop';

/** Mirrors the backend's CustomerAlertSubscriptionDto. */
export interface CustomerAlertSubscriptionApiDto {
  readonly id: string;
  readonly alertType: CustomerAlertType;
  readonly productId: string;
  readonly productNameEn: string;
  readonly variantId: string;
  readonly variantSku: string | null;
  readonly productImageUrl: string | null;
  readonly lastObservedPrice: number | null;
  readonly createdOnUtc: string;
}

export interface CreateAlertSubscriptionRequest {
  readonly variantId: string;
  readonly alertType: CustomerAlertType;
}
