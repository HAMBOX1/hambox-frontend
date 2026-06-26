import { StorefrontSelectOption } from '../../../shared/components/storefront-field-select/storefront-field-select.component';

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
  rating: number;
  reviewCount: number;
  priceUsd: number;
  originalPriceUsd: number;
  discountLabel: string;
  categoryName?: string;
  regions: readonly StorefrontSelectOption[];
  values: readonly StorefrontSelectOption[];
  defaultRegion: string;
  defaultValue: string;
  trustFeatures: readonly ProductDetailsTrustFeature[];
  redeemSteps: readonly ProductDetailsRedeemStep[];
}
