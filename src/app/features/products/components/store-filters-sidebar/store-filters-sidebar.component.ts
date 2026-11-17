import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { CurrencyService } from '../../../../core/currency/currency.service';
import { StoreCategoryNode } from '../../models/product';
import { DynamicFilterGroup } from '../../utils/storefront-filter.util';
import { StorefrontClientFilters } from '../../services/products.facade';

const STATIC_GROUP_IDS = ['price', 'availability'] as const;

@Component({
  selector: 'app-store-filters-sidebar',
  standalone: true,
  imports: [TranslatePipe, NgTemplateOutlet],
  host: {
    '[class.store-filters-host--collapsed]': 'collapsed()',
    '[class.store-filters-host--preview-mobile]': "previewDevice() === 'mobile'",
  },
  templateUrl: './store-filters-sidebar.component.html',
  styleUrl: './store-filters-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreFiltersSidebarComponent {
  readonly filterGroups = input<readonly DynamicFilterGroup[]>([]);
  readonly activeFilters = input<StorefrontClientFilters | null>(null);
  readonly collapsed = input(false);
  readonly mobileOpen = input(false);
  readonly activeFilterCount = input(0);
  /** Live number of matching products; shown on the apply button of the phone drawer. */
  readonly resultCount = input<number | null>(null);
  /** Lowest / highest selling price among the products in view, in USD (null until known). */
  readonly priceBounds = input<{ min: number | null; max: number | null }>({ min: null, max: null });
  /** Every active category with its parent, for the Platform / Category summary. */
  readonly categoryNodes = input<readonly StoreCategoryNode[]>([]);
  readonly selectedCategoryId = input('all');
  /** Admin preview only: forces the phone layout (the panel as a stand-alone card) whatever the screen width. */
  readonly previewDevice = input<'desktop' | 'mobile' | null>(null);

  readonly filtersChange = output<StorefrontClientFilters>();
  readonly resetFilters = output<void>();
  readonly toggleCollapse = output<void>();
  readonly closeMobile = output<void>();
  readonly categoryChange = output<string>();

  private readonly currency = inject(CurrencyService);

  protected readonly minPrice = signal('');
  protected readonly maxPrice = signal('');
  protected readonly stockOnly = signal(false);
  protected readonly attributeState = signal<Record<string, string[]>>({});
  protected readonly expandedGroups = signal<ReadonlySet<string>>(new Set(STATIC_GROUP_IDS));

  protected readonly totalActiveCount = computed(() => {
    let count = this.activeFilterCount();
    return count;
  });

  // ---- Platform / Category summary: where the customer is, with a way to switch.
  private readonly nodeById = computed(() => new Map(this.categoryNodes().map((node) => [node.id, node])));

  /** The platform: the top-level category the current one sits under (itself when it is top-level). */
  protected readonly platformId = computed(() => {
    const byId = this.nodeById();
    let current = byId.get(this.selectedCategoryId());
    while (current?.parentId && byId.has(current.parentId)) {
      current = byId.get(current.parentId);
    }
    return current?.id ?? 'all';
  });

  protected readonly platforms = computed(() =>
    this.categoryNodes().filter((node) => !node.parentId || !this.nodeById().has(node.parentId)),
  );

  protected readonly platformCategories = computed(() => {
    const platform = this.platformId();
    return platform === 'all' ? [] : this.categoryNodes().filter((node) => node.parentId === platform);
  });

  // ---- Price range: shown in the active currency, with linked inputs and slider.
  protected readonly boundMin = computed(() => {
    const min = this.priceBounds().min;
    return min === null ? 0 : Math.floor(this.currency.convertFromBase(min));
  });

  protected readonly boundMax = computed(() => {
    const max = this.priceBounds().max;
    return max === null ? 0 : Math.ceil(this.currency.convertFromBase(max));
  });

  protected readonly hasPriceRange = computed(() => this.priceBounds().max !== null && this.boundMax() > this.boundMin());
  protected readonly sliderMin = computed(() => this.parsePrice(this.minPrice()) ?? this.boundMin());
  protected readonly sliderMax = computed(() => this.parsePrice(this.maxPrice()) ?? this.boundMax());
  protected readonly currencyCode = computed(() => this.currency.currency());
  private readonly knownGroups = new Set<string>();

  /** A long list of values gets a search box; this is what is typed in each one. */
  protected readonly groupSearch = signal<Readonly<Record<string, string>>>({});
  protected static readonly SEARCH_FROM = 8;

  protected onGroupSearch(groupId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.groupSearch.update((current) => ({ ...current, [groupId]: value }));
  }

  /** The values of a group that match what was typed (values already chosen always stay visible). */
  protected visibleOptions(group: DynamicFilterGroup): readonly { id: string; label: string; count: number }[] {
    const term = (this.groupSearch()[group.id] ?? '').trim().toLowerCase();
    if (!term) {
      return group.options;
    }

    const chosen = this.attributeState()[group.id] ?? [];
    return group.options.filter((option) => option.label.toLowerCase().includes(term) || chosen.includes(option.id));
  }

  constructor() {
    effect(() => {
      const filters = this.activeFilters();
      if (filters) {
        this.minPrice.set(filters.minPrice !== null ? String(this.toDisplay(filters.minPrice)) : '');
        this.maxPrice.set(filters.maxPrice !== null ? String(this.toDisplay(filters.maxPrice)) : '');
        this.stockOnly.set(filters.inStockOnly);
        this.attributeState.set(
          Object.fromEntries(
            Object.entries(filters.attributes).map(([groupId, values]) => [groupId, [...values]]),
          ),
        );
      }
    });

    effect(() => {
      if (!this.filterGroups().length) {
        return;
      }

      this.attributeState.update((current) => {
        const next = { ...current };
        for (const group of this.filterGroups()) {
          if (!next[group.id]) {
            next[group.id] = [];
          }
        }
        return next;
      });

      // A filter opens expanded unless the admin set it to start collapsed; groups the customer already toggled keep that.
      this.expandedGroups.update((current) => {
        const next = new Set(current);
        for (const group of this.filterGroups()) {
          if (!this.knownGroups.has(group.id)) {
            this.knownGroups.add(group.id);
            if (group.defaultExpanded !== false) {
              next.add(group.id);
            }
          }
        }
        return next;
      });
    });
  }

  protected isExpanded(groupId: string): boolean {
    return this.expandedGroups().has(groupId);
  }

  protected toggleGroup(groupId: string): void {
    this.expandedGroups.update((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  protected onMinPriceInput(event: Event): void {
    this.minPrice.set((event.target as HTMLInputElement).value);
    this.emitFilters();
  }

  protected onMaxPriceInput(event: Event): void {
    this.maxPrice.set((event.target as HTMLInputElement).value);
    this.emitFilters();
  }

  /** Dragging the lower handle: it can never pass the upper one; sitting on the lowest bound means "no minimum". */
  protected onMinSlider(event: Event): void {
    const value = Math.min(Number((event.target as HTMLInputElement).value), this.sliderMax());
    this.minPrice.set(value <= this.boundMin() ? '' : String(value));
    this.emitFilters();
  }

  protected onMaxSlider(event: Event): void {
    const value = Math.max(Number((event.target as HTMLInputElement).value), this.sliderMin());
    this.maxPrice.set(value >= this.boundMax() ? '' : String(value));
    this.emitFilters();
  }

  protected resetPrice(): void {
    this.minPrice.set('');
    this.maxPrice.set('');
    this.emitFilters();
  }

  protected onScopeChange(event: Event): void {
    this.categoryChange.emit((event.target as HTMLSelectElement).value);
  }

  protected onStockOnlyChange(event: Event): void {
    this.stockOnly.set((event.target as HTMLInputElement).checked);
    this.emitFilters();
  }

  protected toggleAttribute(groupId: string, optionId: string): void {
    // A single-choice filter: ticking another value replaces the first one.
    const single = this.filterGroups().find((group) => group.id === groupId)?.multiSelect === false;
    this.attributeState.update((current) => {
      const wasSelected = (current[groupId] ?? []).includes(optionId);
      const selected = new Set(single ? [] : (current[groupId] ?? []));
      if (wasSelected) {
        selected.delete(optionId);
      } else {
        selected.add(optionId);
      }

      return { ...current, [groupId]: [...selected] };
    });
    this.emitFilters();
  }

  protected isAttributeSelected(groupId: string, optionId: string): boolean {
    return (this.attributeState()[groupId] ?? []).includes(optionId);
  }

  protected onReset(): void {
    this.minPrice.set('');
    this.maxPrice.set('');
    this.stockOnly.set(false);
    this.attributeState.set({});
    this.resetFilters.emit();
    this.emitFilters();
  }

  protected onToggleCollapse(): void {
    this.toggleCollapse.emit();
  }

  protected onCloseMobile(): void {
    this.closeMobile.emit();
  }

  protected onApplyMobile(): void {
    this.emitFilters();
    this.closeMobile.emit();
  }

  /** A stored USD amount as shown in the active currency, rounded to cents. */
  private toDisplay(usd: number): number {
    return Math.round(this.currency.convertFromBase(usd) * 100) / 100;
  }

  private emitFilters(): void {
    const min = this.parsePrice(this.minPrice());
    const max = this.parsePrice(this.maxPrice());
    this.filtersChange.emit({
      minPrice: min === null ? null : this.currency.convertToBase(min),
      maxPrice: max === null ? null : this.currency.convertToBase(max),
      inStockOnly: this.stockOnly(),
      attributes: this.attributeState(),
    });
  }

  private parsePrice(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
