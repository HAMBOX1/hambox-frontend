export const PRODUCT_IMAGE_MAX_COUNT = 10;
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const PRODUCT_IMAGE_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export function isAllowedProductImage(file: File): boolean {
  return PRODUCT_IMAGE_ALLOWED_TYPES.includes(file.type as (typeof PRODUCT_IMAGE_ALLOWED_TYPES)[number]);
}

export function resolveProductImageUrl(imageUrl?: string | null): string {
  if (!imageUrl?.trim()) {
    return '';
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
}
