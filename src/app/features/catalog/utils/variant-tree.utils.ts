import { ProductOptionGroupDto, ProductVariantDto } from '../models/inventory-api.model';

export interface VariantTreeNode {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly children: readonly VariantTreeNode[];
  readonly variant: ProductVariantDto | null;
}

/** Bound once by the owning manager component so the same reference is reused across every recursive row/leaf card (keeps OnPush cheap). */
export interface VariantTreeCallbacks {
  isExpanded(key: string): boolean;
  toggleExpand(key: string): void;
  isSelected(variantId: string): boolean;
  toggleSelect(variantId: string, checked: boolean, shiftKey?: boolean): void;
  bulkSelectionActive(): boolean;
  openVariant(variant: ProductVariantDto): void;
  editVariant(variant: ProductVariantDto): void;
  deleteVariant(variant: ProductVariantDto): void;
  isActive(variantId: string): boolean;
  displayPrice(variant: ProductVariantDto): number;
  statusSeverity(variant: ProductVariantDto): 'success' | 'warn' | 'danger' | 'secondary' | 'info';
  isHighlighted(variantId: string): boolean;
  searchActive(): boolean;
}

function sortBySortOrder<T extends { sortOrder: number }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

/** Groups variants into a tree keyed by option group depth (e.g. Platform -> Region -> Edition), skipping branches with no matching variants. */
export function buildVariantTree(
  groups: readonly ProductOptionGroupDto[],
  variants: readonly ProductVariantDto[],
): readonly VariantTreeNode[] {
  return buildLevel(groupsWithOptions(groups), variants, 0, '');
}

/** An option group with no options yet (e.g. mid-setup) can never appear in any variant's optionIds, so it must not count as a tree depth level — otherwise it pushes "last level" past the real terminal options and the true leaves get misclassified as empty branches. */
function groupsWithOptions(groups: readonly ProductOptionGroupDto[]): ProductOptionGroupDto[] {
  return sortBySortOrder(groups).filter((group) => group.options.length > 0);
}

function buildLevel(
  groups: readonly ProductOptionGroupDto[],
  variants: readonly ProductVariantDto[],
  depth: number,
  keyPrefix: string,
): VariantTreeNode[] {
  if (depth >= groups.length) {
    return [];
  }

  const isLastLevel = depth === groups.length - 1;
  const nodes: VariantTreeNode[] = [];

  for (const option of sortBySortOrder(groups[depth].options)) {
    const matching = variants.filter((variant) => variant.optionIds.includes(option.id));
    if (!matching.length) {
      continue;
    }

    const key = `${keyPrefix}${option.id}`;
    nodes.push({
      key,
      label: option.label,
      count: matching.length,
      variant: isLastLevel ? matching[0] : null,
      children: isLastLevel ? [] : buildLevel(groups, matching, depth + 1, `${key}/`),
    });
  }

  return nodes;
}

/** True when every node in this array is a variant leaf rather than a further sub-group — the point at which a list should render as virtualized leaf cards instead of recursing into more branches. */
export function isLeafGroup(nodes: readonly VariantTreeNode[]): boolean {
  return nodes.length > 0 && nodes[0].variant !== null;
}

/** Ancestor node keys (root-first) for a variant, so the tree can auto-expand the path to it. */
export function pathToVariant(
  groups: readonly ProductOptionGroupDto[],
  variant: ProductVariantDto,
): readonly string[] {
  const segments: string[] = [];
  const keys: string[] = [];

  for (const group of groupsWithOptions(groups)) {
    const optionId = group.options.find((option) => variant.optionIds.includes(option.id))?.id;
    if (!optionId) {
      break;
    }
    segments.push(optionId);
    keys.push(segments.join('/'));
  }

  return keys;
}

/** "Steam / Global / Ultimate" style breadcrumb for a variant, root option group first. */
export function breadcrumbForVariant(
  groups: readonly ProductOptionGroupDto[],
  variant: ProductVariantDto,
): string {
  return groupsWithOptions(groups)
    .map((group) => group.options.find((option) => variant.optionIds.includes(option.id))?.label)
    .filter((label): label is string => !!label)
    .join(' / ');
}
