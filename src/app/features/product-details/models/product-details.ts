export interface ProductDetailsTrustFeature {
  iconSrc: string;
  label: string;
}

export interface ProductDetailsRedeemStep {
  id: string;
  title: string;
  description: string;
}

export interface ProductDetailsItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  galleryImages: readonly string[];
  rating?: number;
  reviewCount?: number;
  priceUsd: number;
  originalPriceUsd: number;
  discountLabel: string;
  categoryId: string;
  categoryName?: string;
  trustFeatures: readonly ProductDetailsTrustFeature[];
  redeemSteps: readonly ProductDetailsRedeemStep[];
  /** Null if already public; a future date if gated behind the Early Access membership benefit. */
  publicReleaseOnUtc: string | null;
  /** True if any membership plan restricts purchase of this product (Exclusive Products benefit). */
  isMembersOnly: boolean;
  /** True if the current viewer may purchase this product right now. */
  canPurchase: boolean;
  /** When isMembersOnly is true, the plan(s) that grant access — drives the upgrade CTA copy. */
  requiredPlanNames: readonly string[];
}
