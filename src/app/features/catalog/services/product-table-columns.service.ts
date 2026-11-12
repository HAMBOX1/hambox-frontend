import { computed, Injectable, signal } from '@angular/core';

/** Optional/toggleable columns in the Admin Products table. `product` (name/thumbnail) and the
 * actions column are always shown — they're the row's identity and primary action, not data to
 * hide — so they aren't part of this list. */
export type ProductColumnId =
  | 'stock'
  | 'sku'
  | 'salePrice'
  | 'costPrice'
  | 'memberPrice'
  | 'margin'
  | 'category'
  | 'internalCategories'
  | 'status'
  | 'supplier';

export interface ProductColumnDef {
  readonly id: ProductColumnId;
  readonly labelKey: string;
  readonly defaultVisible: boolean;
}

/** Order here is also the order the "Columns" picker lists them in. */
export const PRODUCT_TABLE_COLUMNS: readonly ProductColumnDef[] = [
  { id: 'stock', labelKey: 'ADMIN.CATALOG_PAGE.COLUMNS.STOCK', defaultVisible: true },
  { id: 'sku', labelKey: 'ADMIN.CATALOG_PAGE.COLUMNS.SKU', defaultVisible: false },
  { id: 'salePrice', labelKey: 'ADMIN.CATALOG_PAGE.COLUMNS.SALE_PRICE', defaultVisible: true },
  { id: 'costPrice', labelKey: 'ADMIN.CATALOG_PAGE.COLUMNS.COST_PRICE', defaultVisible: false },
  { id: 'memberPrice', labelKey: 'ADMIN.CATALOG_PAGE.COLUMNS.MEMBER_PRICE', defaultVisible: false },
  { id: 'margin', labelKey: 'ADMIN.CATALOG_PAGE.COLUMNS.MARGIN', defaultVisible: false },
  { id: 'category', labelKey: 'ADMIN.CATALOG_PAGE.COLUMNS.CATEGORY', defaultVisible: true },
  { id: 'internalCategories', labelKey: 'ADMIN.CATALOG_PAGE.COLUMNS.INTERNAL_CATEGORIES', defaultVisible: true },
  { id: 'status', labelKey: 'ADMIN.CATALOG_PAGE.COLUMNS.STATUS', defaultVisible: true },
  { id: 'supplier', labelKey: 'ADMIN.CATALOG_PAGE.COLUMNS.SUPPLIER', defaultVisible: true },
];

const STORAGE_KEY = 'hambox.admin.products.columns';
const ORDER_STORAGE_KEY = 'hambox.admin.products.columns.order';
const LAYOUT_STORAGE_KEY = 'hambox.admin.products.columns.layout';
const PRESETS_STORAGE_KEY = 'hambox.admin.products.columns.presets';

/** A named set of visible columns the admin can switch to with one tap. */
export interface ColumnPreset {
  readonly id: string;
  /** Translation key of a built-in preset; custom presets carry their own `name` instead. */
  readonly labelKey?: string;
  readonly name?: string;
  readonly columns: readonly ProductColumnId[];
  readonly builtin: boolean;
}

/** Built-in views. `default` is filled in from each column's `defaultVisible` flag. */
const BUILTIN_PRESETS: readonly ColumnPreset[] = [
  { id: 'default', labelKey: 'ADMIN.CATALOG_PAGE.COLUMNS.VIEW_DEFAULT', columns: [], builtin: true },
  {
    id: 'prices',
    labelKey: 'ADMIN.CATALOG_PAGE.COLUMNS.VIEW_PRICES',
    columns: ['salePrice', 'costPrice', 'memberPrice', 'margin'],
    builtin: true,
  },
  { id: 'stock', labelKey: 'ADMIN.CATALOG_PAGE.COLUMNS.VIEW_STOCK', columns: ['stock', 'supplier'], builtin: true },
];

/** Bounds of the product-name width the admin can choose, in rem. */
export const NAME_WIDTH_MIN_REM = 5;
export const NAME_WIDTH_MAX_REM = 24;

interface ColumnsLayout {
  pinName: boolean;
  pinActions: boolean;
  nameWidth: number | null;
}

/**
 * Root-scoped (like `AdminProductsViewModeService`) so the admin's column choices survive
 * navigating to a product's Edit page and back, and persisted to localStorage so they also
 * survive a full reload — "for the current admin/user" here means this browser profile, the same
 * scope every other per-admin Products-list preference in this file already uses (view mode,
 * the old price-column prefs this replaces).
 */
@Injectable({ providedIn: 'root' })
export class ProductTableColumnsService {
  readonly definitions = PRODUCT_TABLE_COLUMNS;

  private readonly visibleState = signal<ReadonlySet<ProductColumnId>>(this.readInitial());
  readonly visible = this.visibleState.asReadonly();

  /** Left-to-right order of the columns (hidden ones keep their slot, so un-hiding restores the place). */
  private readonly orderState = signal<readonly ProductColumnId[]>(this.readOrder());
  readonly order = this.orderState.asReadonly();

  private readonly layoutState = signal<ColumnsLayout>(this.readLayout());

  private readonly customPresets = signal<readonly ColumnPreset[]>(this.readPresets());

  /** Built-in views followed by the ones the admin saved. */
  readonly presets = computed<readonly ColumnPreset[]>(() => [
    ...BUILTIN_PRESETS.map((preset) =>
      preset.id === 'default' ? { ...preset, columns: this.defaultColumns() } : preset,
    ),
    ...this.customPresets(),
  ]);

  /** The preset whose columns are exactly the visible ones right now, if any. */
  readonly activePresetId = computed<string | null>(() => {
    const visible = this.visibleState();
    const match = this.presets().find(
      (preset) => preset.columns.length === visible.size && preset.columns.every((id) => visible.has(id)),
    );
    return match?.id ?? null;
  });

  /** Keeps the product name in view while the wide table scrolls sideways. */
  readonly pinName = computed(() => this.layoutState().pinName);

  /** Keeps the row's ⋮ menu (and edit button on wide screens) in view while the table scrolls sideways. */
  readonly pinActions = computed(() => this.layoutState().pinActions);

  /** Chosen width of the product name in rem, or null for the stylesheet default. */
  readonly nameWidth = computed(() => this.layoutState().nameWidth);

  /** The column definitions in the admin's chosen order — what the Columns picker lists. */
  readonly orderedDefinitions = computed<readonly ProductColumnDef[]>(() =>
    this.orderState()
      .map((id) => this.definitions.find((def) => def.id === id))
      .filter((def): def is ProductColumnDef => def !== undefined),
  );

  /** Visible columns in the chosen order — what the table renders. */
  readonly orderedVisible = computed<readonly ProductColumnId[]>(() =>
    this.orderState().filter((id) => this.visibleState().has(id)),
  );

  canMove(id: ProductColumnId, delta: -1 | 1): boolean {
    const index = this.orderState().indexOf(id);
    const target = index + delta;
    return index !== -1 && target >= 0 && target < this.orderState().length;
  }

  /** Swaps a column with its neighbour (one step left or right in the table). */
  move(id: ProductColumnId, delta: -1 | 1): void {
    if (!this.canMove(id, delta)) {
      return;
    }

    this.orderState.update((current) => {
      const next = [...current];
      const index = next.indexOf(id);
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
    this.persistOrder();
  }

  isVisible(id: ProductColumnId): boolean {
    return this.visibleState().has(id);
  }

  setVisible(id: ProductColumnId, value: boolean): void {
    this.visibleState.update((current) => {
      const next = new Set(current);
      if (value) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    this.persist();
  }

  /** Shows exactly the columns of the chosen view; the order the admin arranged is kept. */
  applyPreset(id: string): void {
    const preset = this.presets().find((candidate) => candidate.id === id);
    if (!preset) {
      return;
    }

    this.visibleState.set(new Set(preset.columns));
    this.persist();
  }

  /** Stores the columns visible right now under a name, so they come back with one tap. Returns the new view's id. */
  saveCurrentAsPreset(name: string): string | null {
    const trimmed = name.trim().slice(0, 30);
    if (!trimmed || this.visibleState().size === 0) {
      return null;
    }

    const id = `custom-${Date.now().toString(36)}`;
    this.customPresets.update((current) => [
      ...current,
      { id, name: trimmed, columns: [...this.visibleState()], builtin: false },
    ]);
    this.persistPresets();
    return id;
  }

  deletePreset(id: string): void {
    this.customPresets.update((current) => current.filter((preset) => preset.id !== id));
    this.persistPresets();
  }

  setPinName(value: boolean): void {
    this.updateLayout({ pinName: value });
  }

  setPinActions(value: boolean): void {
    this.updateLayout({ pinActions: value });
  }

  /** `null` goes back to the default width; anything else is clamped to the allowed range. */
  setNameWidth(rem: number | null): void {
    const width = rem === null || !Number.isFinite(rem)
      ? null
      : Math.min(NAME_WIDTH_MAX_REM, Math.max(NAME_WIDTH_MIN_REM, Math.round(rem)));
    this.updateLayout({ nameWidth: width });
  }

  resetToDefaults(): void {
    this.visibleState.set(this.defaultSet());
    this.orderState.set(this.definitions.map((def) => def.id));
    this.layoutState.set(this.defaultLayout());
    this.persist();
    this.persistOrder();
    this.persistLayout();
  }

  private defaultColumns(): ProductColumnId[] {
    return this.isPhone() ? [...this.phoneSet()] : this.definitions.filter((def) => def.defaultVisible).map((def) => def.id);
  }

  private readPresets(): ColumnPreset[] {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PRESETS_STORAGE_KEY) : null;
      if (raw === null) {
        return [];
      }

      const known = new Set<string>(this.definitions.map((def) => def.id));
      return (JSON.parse(raw) as { id?: unknown; name?: unknown; columns?: unknown }[])
        .filter((entry) => typeof entry.id === 'string' && typeof entry.name === 'string' && Array.isArray(entry.columns))
        .map((entry) => ({
          id: entry.id as string,
          name: entry.name as string,
          columns: (entry.columns as string[]).filter((id): id is ProductColumnId => known.has(id)),
          builtin: false,
        }));
    } catch {
      return [];
    }
  }

  private persistPresets(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          PRESETS_STORAGE_KEY,
          JSON.stringify(this.customPresets().map(({ id, name, columns }) => ({ id, name, columns }))),
        );
      }
    } catch {
      // Best effort only.
    }
  }

  private defaultLayout(): ColumnsLayout {
    return { pinName: true, pinActions: true, nameWidth: null };
  }

  private updateLayout(change: Partial<ColumnsLayout>): void {
    this.layoutState.update((current) => ({ ...current, ...change }));
    this.persistLayout();
  }

  private readLayout(): ColumnsLayout {
    const defaults = this.defaultLayout();
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LAYOUT_STORAGE_KEY) : null;
      if (raw === null) {
        return defaults;
      }

      const saved = JSON.parse(raw) as Partial<ColumnsLayout>;
      const width = typeof saved.nameWidth === 'number' && Number.isFinite(saved.nameWidth)
        ? Math.min(NAME_WIDTH_MAX_REM, Math.max(NAME_WIDTH_MIN_REM, saved.nameWidth))
        : null;
      return {
        pinName: typeof saved.pinName === 'boolean' ? saved.pinName : defaults.pinName,
        pinActions: typeof saved.pinActions === 'boolean' ? saved.pinActions : defaults.pinActions,
        nameWidth: width,
      };
    } catch {
      return defaults;
    }
  }

  private persistLayout(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(this.layoutState()));
      }
    } catch {
      // Best effort only.
    }
  }

  private isPhone(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }

  /** First visit on a phone: name, stock, price and status only; the details arrow shows the rest. */
  private phoneSet(): Set<ProductColumnId> {
    return new Set<ProductColumnId>(['stock', 'salePrice', 'status']);
  }

  private defaultSet(): Set<ProductColumnId> {
    return new Set(this.definitions.filter((def) => def.defaultVisible).map((def) => def.id));
  }

  private readInitial(): Set<ProductColumnId> {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw === null) {
        return this.isPhone() ? this.phoneSet() : this.defaultSet();
      }

      const ids = JSON.parse(raw) as string[];
      const known = new Set(this.definitions.map((def) => def.id));
      return new Set(ids.filter((id): id is ProductColumnId => known.has(id as ProductColumnId)));
    } catch {
      return this.defaultSet();
    }
  }

  private readOrder(): readonly ProductColumnId[] {
    const defaults = this.definitions.map((def) => def.id);
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(ORDER_STORAGE_KEY) : null;
      if (raw === null) {
        return defaults;
      }

      const saved = (JSON.parse(raw) as string[]).filter((id): id is ProductColumnId => defaults.includes(id as ProductColumnId));
      // Columns added after the order was saved go to the end, in their default order.
      return [...saved, ...defaults.filter((id) => !saved.includes(id))];
    } catch {
      return defaults;
    }
  }

  private persistOrder(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify([...this.orderState()]));
      }
    } catch {
      // Best effort only.
    }
  }

  private persist(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.visibleState()]));
      }
    } catch {
      // Best effort only.
    }
  }
}
