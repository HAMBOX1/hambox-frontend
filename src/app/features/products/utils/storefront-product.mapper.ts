import { Product } from '../../catalog/models/product.model';
import { resolveProductImageUrl } from '../../catalog/utils/product-image.utils';
import { productPlaceholderImage, resolveStorefrontImageUrl } from '../../home/utils/storefront-home.mapper';
import { ProductDetailsItem } from '../../product-details/models/product-details';
import { DEFAULT_PRODUCT_DETAILS_EXTRAS } from '../services/storefront-products-data';
import { StoreProduct, StorePlatformTone } from '../models/product';

function resolveImageUrl(imageUrl?: string | null, index = 0): string {
  const resolved = resolveProductImageUrl(imageUrl ?? '');

  if (resolved) {
    return resolveStorefrontImageUrl(resolved, productPlaceholderImage(index));
  }

  return productPlaceholderImage(index);
}

function resolveGalleryImages(product: Product): readonly string[] {
  if (product.images?.length) {
    return product.images
      .slice()
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((image) => resolveImageUrl(image.url));
  }

  const primary = resolveImageUrl(product.primaryImageUrl);
  return primary ? [primary] : [];
}

function resolvePlatformTone(categoryName: string): StorePlatformTone {
  const normalized = categoryName.toLowerCase();

  if (normalized.includes('xbox')) {
    return 'xbox';
  }

  if (normalized.includes('playstation') || normalized.includes('psn')) {
    return 'psn';
  }

  if (normalized.includes('nintendo')) {
    return 'nintendo';
  }

  return 'pc';
}

export function mapProductToStoreProduct(product: Product, index = 0): StoreProduct {
  const isActive = product.status === 'Active';

  return {
    id: product.id,
    title: product.nameEn,
    imageUrl: resolveImageUrl(product.primaryImageUrl, index),
    platformLabel: product.categoryName,
    platformTone: resolvePlatformTone(product.categoryName),
    instantDigital: isActive,
    priceUsd: product.price,
    cta: isActive ? 'cart' : 'notify-me',
    outOfStock: !isActive,
    highlighted: isActive,
  };
}

export function mapProductToDetailsItem(product: Product): ProductDetailsItem {
  const galleryImages = resolveGalleryImages(product);
  const primaryImage = galleryImages[0] ?? productPlaceholderImage(0);

  return {
    id: product.id,
    title: product.nameEn,
    description: product.descriptionEn,
    imageUrl: primaryImage,
    thumbnailUrl: primaryImage,
    galleryImages,
    rating: 4.8,
    reviewCount: 0,
    priceUsd: product.price,
    originalPriceUsd: product.price,
    discountLabel: '',
    categoryName: product.categoryName,
    ...DEFAULT_PRODUCT_DETAILS_EXTRAS,
  };
}
