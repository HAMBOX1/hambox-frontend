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

  resetToDefaults(): void {
    this.visibleState.set(this.defaultSet());
    this.orderState.set(this.definitions.map((def) => def.id));
    this.persist();
    this.persistOrder();
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
