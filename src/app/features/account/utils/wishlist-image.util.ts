import { resolveProductImageUrl } from '../../catalog/utils/product-image.utils';
import { productPlaceholderImage, resolveStorefrontImageUrl } from '../../home/utils/storefront-home.mapper';

export function resolveWishlistItemImageUrl(imageUrl?: string | null, index = 0): string {
  const resolved = resolveProductImageUrl(imageUrl ?? '');

  if (resolved) {
    return resolveStorefrontImageUrl(resolved, productPlaceholderImage(index));
  }

  return productPlaceholderImage(index);
}
