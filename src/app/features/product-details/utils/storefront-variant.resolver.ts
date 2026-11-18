import {
  ProductOptionGroupDto,
  StorefrontProductConfigurationDto,
  StorefrontVariantDto,
} from '../../catalog/models/inventory-api.model';
import { isPurchasableVariant } from '../../products/utils/storefront-product-stock.util';

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
): readonly { id: string; label: string; disabled: boolean; descriptionHtml?: string | null; showDescriptionInline?: boolean }[] {
  const group = configuration.optionGroups.find((entry) => entry.id === groupId);
  if (!group) {
    return [];
  }

  return group.options.map((option) => ({
    id: option.id,
    label: option.label,
    disabled: !isOptionCompatible(configuration, groupId, option.id, selectedByGroup),
    descriptionHtml: option.descriptionHtml,
    showDescriptionInline: option.showDescriptionInline,
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

  // Only the choices of the rows the shopper can see count: a child row hidden after its parent changed must not keep
  // blocking the match with a leftover choice.
  const selectedIds = selectableGroups.map((group) => selectedByGroup[group.id]).filter((id): id is string => Boolean(id));
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

/**
 * The choices after the shopper picked `optionId` in `changedGroupId`: every other row keeps its choice when it still goes
 * with the new one, otherwise it switches to the first option that does (instead of being emptied, which left the page
 * with no price / "out of stock" until the shopper clicked again), rows that are no longer shown are cleared, and a newly
 * shown required row gets its first available option.
 */
export function repairSelections(
  configuration: StorefrontProductConfigurationDto,
  selectedByGroup: Readonly<Record<string, string>>,
  changedGroupId: string,
  optionId: string,
): Record<string, string> {
  const next: Record<string, string> = { ...selectedByGroup, [changedGroupId]: optionId };

  for (let round = 0; round < 10; round++) {
    let changed = false;
    const visible = visibleOptionGroups(configuration.optionGroups, next);
    const visibleIds = new Set(visible.map((group) => group.id));

    for (const id of Object.keys(next)) {
      if (!visibleIds.has(id)) {
        delete next[id];
        changed = true;
      }
    }

    for (const group of visible) {
      if (group.id === changedGroupId) {
        continue;
      }

      const current = next[group.id];
      if (current && isOptionCompatible(configuration, group.id, current, next)) {
        continue;
      }

      const pick = group.options.find((option) => isOptionCompatible(configuration, group.id, option.id, next));
      if (pick && (current || group.isRequired)) {
        next[group.id] = pick.id;
        changed = true;
      } else if (current) {
        delete next[group.id];
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return next;
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
