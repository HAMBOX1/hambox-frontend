import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { DynamicFilterGroup } from '../../utils/storefront-filter.util';
import { StorefrontClientFilters } from '../../services/products.facade';

const STATIC_GROUP_IDS = ['price', 'availability'] as const;

@Component({
  selector: 'app-store-filters-sidebar',
  standalone: true,
  imports: [TranslatePipe],
  host: {
    '[class.store-filters-host--collapsed]': 'collapsed()',
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

  readonly filtersChange = output<StorefrontClientFilters>();
  readonly resetFilters = output<void>();
  readonly toggleCollapse = output<void>();
  readonly closeMobile = output<void>();

  protected readonly minPrice = signal('');
  protected readonly maxPrice = signal('');
  protected readonly stockOnly = signal(false);
  protected readonly attributeState = signal<Record<string, string[]>>({});
  protected readonly expandedGroups = signal<ReadonlySet<string>>(new Set(STATIC_GROUP_IDS));

  protected readonly totalActiveCount = computed(() => {
    let count = this.activeFilterCount();
    return count;
  });

  constructor() {
    effect(() => {
      const filters = this.activeFilters();
      if (filters) {
        this.minPrice.set(filters.minPrice !== null ? String(filters.minPrice) : '');
        this.maxPrice.set(filters.maxPrice !== null ? String(filters.maxPrice) : '');
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

      this.expandedGroups.update((current) => {
        const next = new Set(current);
        for (const group of this.filterGroups()) {
          next.add(group.id);
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

  protected onStockOnlyChange(event: Event): void {
    this.stockOnly.set((event.target as HTMLInputElement).checked);
    this.emitFilters();
  }

  protected toggleAttribute(groupId: string, optionId: string): void {
    this.attributeState.update((current) => {
      const selected = new Set(current[groupId] ?? []);
      if (selected.has(optionId)) {
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

  private emitFilters(): void {
    this.filtersChange.emit({
      minPrice: this.parsePrice(this.minPrice()),
      maxPrice: this.parsePrice(this.maxPrice()),
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
