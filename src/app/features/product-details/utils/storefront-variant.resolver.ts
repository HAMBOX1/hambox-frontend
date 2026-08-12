import {
  ProductOptionGroupDto,
  StorefrontProductConfigurationDto,
  StorefrontVariantDto,
} from '../../catalog/models/inventory-api.model';

export interface ResolvedStorefrontVariant {
  readonly variant: StorefrontVariantDto | null;
  readonly price: number;
  readonly comparePrice: number | null;
  readonly availableStock: number;
  readonly isLowStock: boolean;
  readonly isOutOfStock: boolean;
  readonly sku: string | null;
}

export function isOptionCompatible(
  configuration: StorefrontProductConfigurationDto,
  groupId: string,
  optionId: string,
  selectedByGroup: Readonly<Record<string, string>>,
): boolean {
  return configuration.variants.some((variant) => {
    if (!isPurchasableVariant(variant)) {
      return false;
    }

    if (!variant.optionIds.includes(optionId)) {
      return false;
    }

    return configuration.optionGroups.every((group) => {
      if (group.id === groupId) {
        return true;
      }

      const selected = selectedByGroup[group.id];
      return !selected || variant.optionIds.includes(selected);
    });
  });
}

/**
 * Which option groups should render as pickable chip rows right now: root groups are always
 * visible; a nested child group (e.g. Xbox -> Account Type) only becomes visible once its parent
 * option is selected, so a shopper never sees PSN's Account Type row while Xbox is selected.
 */
export function visibleOptionGroups(
  optionGroups: readonly ProductOptionGroupDto[],
  selectedByGroup: Readonly<Record<string, string>>,
): readonly ProductOptionGroupDto[] {
  const selectedOptionIds = new Set(Object.values(selectedByGroup).filter(Boolean));
  return optionGroups.filter(
    (group) =>
      group.options.length > 0 &&
      (group.parentOptionId === null || selectedOptionIds.has(group.parentOptionId)),
  );
}

export function getAvailableOptionsForGroup(
  configuration: StorefrontProductConfigurationDto,
  groupId: string,
  selectedByGroup: Readonly<Record<string, string>>,
): readonly { id: string; label: string; disabled: boolean; descriptionHtml?: string | null }[] {
  const group = configuration.optionGroups.find((entry) => entry.id === groupId);
  if (!group) {
    return [];
  }

  return group.options.map((option) => ({
    id: option.id,
    label: option.label,
    disabled: !isOptionCompatible(configuration, groupId, option.id, selectedByGroup),
    descriptionHtml: option.descriptionHtml,
  }));
}

export function resolveVariant(
  configuration: StorefrontProductConfigurationDto,
  selectedByGroup: Readonly<Record<string, string>>,
): ResolvedStorefrontVariant {
  if (configuration.variants.length === 0) {
    return unresolved(configuration);
  }

  const selectableGroups = visibleOptionGroups(configuration.optionGroups, selectedByGroup);

  // Products with variants but no selectable options (single implicit SKU).
  if (selectableGroups.length === 0) {
    const implicit = pickImplicitVariant(configuration.variants);
    return implicit ? toResolved(implicit) : unresolved(configuration);
  }

  const requiredGroups = selectableGroups.filter((group) => group.isRequired);
  const hasAllRequired = requiredGroups.every((group) => Boolean(selectedByGroup[group.id]));
  if (!hasAllRequired) {
    return unresolved(configuration);
  }

  const selectedIds = Object.values(selectedByGroup).filter(Boolean);
  const variant =
    configuration.variants.find((entry) => {
      if (entry.optionIds.length !== selectedIds.length) {
        return false;
      }

      return selectedIds.every((id) => entry.optionIds.includes(id));
    }) ?? null;

  if (!variant) {
    if (selectedIds.length === 0) {
      const implicit = pickImplicitVariant(configuration.variants);
      if (implicit) {
        return toResolved(implicit);
      }
    }

    return unresolved(configuration);
  }

  return toResolved(variant);
}

export function defaultSelections(
  configuration: StorefrontProductConfigurationDto,
): Record<string, string> {
  const selections: Record<string, string> = {};
  const firstPurchasable =
    configuration.variants.find((variant) => isPurchasableVariant(variant)) ??
    configuration.variants[0];

  if (!firstPurchasable) {
    return selections;
  }

  for (const group of configuration.optionGroups) {
    const match = group.options.find((option) => firstPurchasable.optionIds.includes(option.id));
    if (match) {
      selections[group.id] = match.id;
    }
  }

  return selections;
}

function isPurchasableVariant(variant: StorefrontVariantDto): boolean {
  return variant.availableStock > 0 && !variant.isOutOfStock;
}

function pickImplicitVariant(
  variants: readonly StorefrontVariantDto[],
): StorefrontVariantDto | null {
  const implicit = variants.filter((variant) => variant.optionIds.length === 0);
  return implicit.length === 1 ? implicit[0]! : null;
}

function toResolved(variant: StorefrontVariantDto): ResolvedStorefrontVariant {
  return {
    variant,
    price: variant.price,
    comparePrice: variant.comparePrice,
    availableStock: variant.availableStock,
    isLowStock: variant.isLowStock,
    isOutOfStock: variant.isOutOfStock,
    sku: variant.sku,
  };
}

function unresolved(configuration: StorefrontProductConfigurationDto): ResolvedStorefrontVariant {
  return {
    variant: null,
    price: configuration.basePrice,
    comparePrice: null,
    availableStock: 0,
    isLowStock: false,
    isOutOfStock: true,
    sku: null,
  };
}

export function formatVariantOptions(
  configuration: StorefrontProductConfigurationDto,
  variant: StorefrontVariantDto,
): string {
  const labels = configuration.optionGroups
    .flatMap((group) => group.options)
    .filter((option) => variant.optionIds.includes(option.id))
    .map((option) => option.label);

  return labels.length ? labels.join(' · ') : variant.sku;
}

export function isDuplicateCombination(
  variants: readonly { optionIds: readonly string[] }[],
  optionIds: readonly string[],
): boolean {
  const normalized = [...optionIds].sort().join('|');
  return variants.some((variant) => [...variant.optionIds].sort().join('|') === normalized);
}
