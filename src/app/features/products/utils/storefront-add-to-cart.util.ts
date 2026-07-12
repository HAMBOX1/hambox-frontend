import { Router } from '@angular/router';

import { StorefrontProductConfigurationDto } from '../../catalog/models/inventory-api.model';
import { CartFacade } from '../../cart/services/cart.facade';
import { isPurchasableVariant } from './storefront-product-stock.util';

export function productRequiresOptionSelection(
  configuration: StorefrontProductConfigurationDto | null | undefined,
): boolean {
  if (!configuration) {
    return true;
  }

  return configuration.optionGroups.some((group) => group.options.length > 0);
}

export function resolveDirectCartVariantId(
  configuration: StorefrontProductConfigurationDto | null | undefined,
): string | null {
  if (!configuration || productRequiresOptionSelection(configuration)) {
    return null;
  }

  const purchasable = configuration.variants.filter(isPurchasableVariant);
  if (purchasable.length === 1) {
    return purchasable[0]!.id;
  }

  const implicit = purchasable.filter((variant) => variant.optionIds.length === 0);
  if (implicit.length === 1) {
    return implicit[0]!.id;
  }

  return purchasable[0]?.id ?? null;
}

export async function addStoreProductToCart(
  cartFacade: CartFacade,
  router: Router,
  productId: string,
  configuration: StorefrontProductConfigurationDto | null | undefined,
  requiresOptionSelection = productRequiresOptionSelection(configuration),
  directVariantId: string | null = resolveDirectCartVariantId(configuration),
): Promise<'added' | 'navigated'> {
  if (requiresOptionSelection) {
    await router.navigate(['/products', productId]);
    return 'navigated';
  }

  await cartFacade.addItem(productId, 1, directVariantId);
  return 'added';
}
