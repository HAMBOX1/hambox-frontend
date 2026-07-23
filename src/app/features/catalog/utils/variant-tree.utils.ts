import { ProductOptionDto, ProductOptionGroupDto, ProductVariantDto } from '../models/inventory-api.model';

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

/** Root-level groups (no parent option), sorted and stripped of not-yet-configured empty groups. */
function rootGroupsWithOptions(groups: readonly ProductOptionGroupDto[]): ProductOptionGroupDto[] {
  return sortBySortOrder(groups).filter((group) => group.parentOptionId === null && group.options.length > 0);
}

/** Maps an option id to the (non-empty) child option groups nested under it, sorted by sortOrder. */
function childGroupsByParentOptionId(
  groups: readonly ProductOptionGroupDto[],
): ReadonlyMap<string, ProductOptionGroupDto[]> {
  const map = new Map<string, ProductOptionGroupDto[]>();
  for (const group of groups) {
    if (group.parentOptionId === null || group.options.length === 0) {
      continue;
    }
    const siblings = map.get(group.parentOptionId) ?? [];
    siblings.push(group);
    map.set(group.parentOptionId, siblings);
  }
  for (const siblings of map.values()) {
    siblings.sort((left, right) => left.sortOrder - right.sortOrder);
  }
  return map;
}

/**
 * Groups variants into a tree following the option groups' real parent/child edges (Platform -> Xbox ->
 * Account Type -> ...), skipping branches with no matching variants. Multiple independent root groups
 * (e.g. legacy flat products with Platform + Region) still cross-multiply as sequential tree levels,
 * matching the old flat behavior. An option's own child groups (if any) are descended into *before*
 * continuing to the remaining sibling root groups — mirroring the backend's `ExpandGroups`/`ExpandOption`
 * — so e.g. Steam's Account Type branch still nests under Steam even when a later "Edition" root group
 * also applies to every leaf; sibling branches (Xbox's Account Type vs. PSN's Account Type) never mix.
 */
export function buildVariantTree(
  groups: readonly ProductOptionGroupDto[],
  variants: readonly ProductVariantDto[],
): readonly VariantTreeNode[] {
  const childGroups = childGroupsByParentOptionId(groups);
  return buildLevel(rootGroupsWithOptions(groups), variants, '', childGroups);
}

function buildLevel(
  remainingGroups: readonly ProductOptionGroupDto[],
  variants: readonly ProductVariantDto[],
  keyPrefix: string,
  childGroups: ReadonlyMap<string, ProductOptionGroupDto[]>,
): VariantTreeNode[] {
  if (remainingGroups.length === 0) {
    return [];
  }

  const [group, ...restGroups] = remainingGroups;
  const nodes: VariantTreeNode[] = [];

  for (const option of sortBySortOrder(group.options)) {
    const matching = variants.filter((variant) => variant.optionIds.includes(option.id));
    if (!matching.length) {
      continue;
    }

    const key = `${keyPrefix}${option.id}`;
    const nextGroups = [...(childGroups.get(option.id) ?? []), ...restGroups];
    const isLeaf = nextGroups.length === 0;

    nodes.push({
      key,
      label: option.label,
      count: matching.length,
      variant: isLeaf ? matching[0] : null,
      children: isLeaf ? [] : buildLevel(nextGroups, matching, `${key}/`, childGroups),
    });
  }

  return nodes;
}

/** True when every node in this array is a variant leaf rather than a further sub-group — the point at which a list should render as virtualized leaf cards instead of recursing into more branches. */
export function isLeafGroup(nodes: readonly VariantTreeNode[]): boolean {
  return nodes.length > 0 && nodes[0].variant !== null;
}

/** Walks the same root-then-child-edges path as buildVariantTree for a single variant, root-first. */
function pathSegmentsForVariant(
  groups: readonly ProductOptionGroupDto[],
  variant: ProductVariantDto,
): readonly ProductOptionDto[] {
  const childGroups = childGroupsByParentOptionId(groups);
  const segments: ProductOptionDto[] = [];
  let currentGroups = rootGroupsWithOptions(groups);

  while (currentGroups.length > 0) {
    const [group, ...restGroups] = currentGroups;
    const option = sortBySortOrder(group.options).find((candidate) => variant.optionIds.includes(candidate.id));
    if (!option) {
      break;
    }

    segments.push(option);
    currentGroups = [...(childGroups.get(option.id) ?? []), ...restGroups];
  }

  return segments;
}

/** Ancestor node keys (root-first) for a variant, so the tree can auto-expand the path to it. */
export function pathToVariant(
  groups: readonly ProductOptionGroupDto[],
  variant: ProductVariantDto,
): readonly string[] {
  const keys: string[] = [];
  let prefix = '';

  for (const option of pathSegmentsForVariant(groups, variant)) {
    prefix += option.id;
    keys.push(prefix);
    prefix += '/';
  }

  return keys;
}

/** "Steam / Global / Ultimate" style breadcrumb for a variant, root option group first. */
export function breadcrumbForVariant(
  groups: readonly ProductOptionGroupDto[],
  variant: ProductVariantDto,
): string {
  return pathSegmentsForVariant(groups, variant)
    .map((option) => option.label)
    .join(' / ');
}
