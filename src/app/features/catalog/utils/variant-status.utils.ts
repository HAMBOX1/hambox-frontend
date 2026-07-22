import { ProductVariantDto } from '../models/inventory-api.model';

/** The single definition of "active/sellable variant" — Active status and visible on the storefront. */
export function isVariantLive(variant: ProductVariantDto): boolean {
  return variant.status === 'Active' && variant.isVisible;
}
