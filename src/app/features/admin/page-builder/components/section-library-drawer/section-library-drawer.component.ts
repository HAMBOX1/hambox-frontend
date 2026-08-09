import { ChangeDetectionStrategy, Component, computed, output, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DrawerModule } from 'primeng/drawer';

import {
  AdminEmptyStateComponent,
  AdminSearchBarComponent,
} from '../../../../../shared/components/admin';
import { SectionVariantDefinition } from '../../../../home/section-registry/models/section-variant.model';
import { SECTION_VARIANT_REGISTRY } from '../../../../home/section-registry/section-variant-registry';
import { SectionFullPreviewDialogComponent } from '../section-full-preview-dialog/section-full-preview-dialog.component';
import { SectionLibraryCardComponent } from '../section-library-card/section-library-card.component';

const FAVORITES_KEY = 'hambox.page-builder.favorite-sections';
const RECENT_KEY = 'hambox.page-builder.recent-sections';
const MAX_RECENT = 8;

type LibraryFilter = 'all' | 'favorites' | 'recent' | 'popular' | 'newest';

function variantKeyOf(variant: SectionVariantDefinition): string {
  return `${variant.category}:${variant.variantKey}`;
}

function loadKeySet(key: string): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function loadKeyList(key: string): readonly string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveKeys(key: string, values: Iterable<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...values]));
  } catch {
    // storage unavailable — favorites/recents just won't persist
  }
}

/**
 * Visual Section Library: fast-preview card grid (search + category + Favorites/Recently Used/
 * Popular/Newest filters) plus a full-preview dialog that renders the real component. Both the card
 * grid's Quick Add and the full-preview dialog's Quick Add fund through `select()` — the single place
 * that records "recently used" and inserts the section, so the two entry points never drift.
 */
@Component({
  selector: 'app-section-library-drawer',
  standalone: true,
  imports: [
    DrawerModule,
    TranslatePipe,
    AdminSearchBarComponent,
    AdminEmptyStateComponent,
    SectionLibraryCardComponent,
    SectionFullPreviewDialogComponent,
  ],
  templateUrl: './section-library-drawer.component.html',
  styleUrl: './section-library-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionLibraryDrawerComponent {
  readonly visible = input(false);
  /** Category names to hide entirely (e.g. `HOMEPAGE_ONLY_SECTION_CATEGORIES` for a Product/Category page). */
  readonly excludedCategories = input<readonly string[]>([]);
  readonly visibleChange = output<boolean>();
  readonly variantSelected = output<SectionVariantDefinition>();

  protected readonly searchTerm = signal('');
  protected readonly activeCategory = signal<string | null>(null);
  protected readonly activeFilter = signal<LibraryFilter>('all');
  protected readonly previewVariant = signal<SectionVariantDefinition | null>(null);

  private readonly favoriteKeys = signal(loadKeySet(FAVORITES_KEY));
  private readonly recentKeys = signal(loadKeyList(RECENT_KEY));
  private lastSelectionAt = 0;

  protected readonly filters: readonly {
    readonly value: LibraryFilter;
    readonly labelKey: string;
    readonly icon: string;
  }[] = [
    { value: 'all', labelKey: 'ADMIN.PAGE_BUILDER.LIBRARY.FILTER_ALL', icon: 'pi pi-th-large' },
    {
      value: 'favorites',
      labelKey: 'ADMIN.PAGE_BUILDER.LIBRARY.FILTER_FAVORITES',
      icon: 'pi pi-star',
    },
    {
      value: 'recent',
      labelKey: 'ADMIN.PAGE_BUILDER.LIBRARY.FILTER_RECENT',
      icon: 'pi pi-history',
    },
    {
      value: 'popular',
      labelKey: 'ADMIN.PAGE_BUILDER.LIBRARY.FILTER_POPULAR',
      icon: 'pi pi-chart-line',
    },
    {
      value: 'newest',
      labelKey: 'ADMIN.PAGE_BUILDER.LIBRARY.FILTER_NEWEST',
      icon: 'pi pi-sparkles',
    },
  ];

  private readonly availableVariants = computed(() => {
    const excluded = new Set(this.excludedCategories());
    return excluded.size
      ? SECTION_VARIANT_REGISTRY.filter((v) => !excluded.has(v.category))
      : SECTION_VARIANT_REGISTRY;
  });

  protected readonly categories = computed(() => [
    ...new Set(this.availableVariants().map((v) => v.category)),
  ]);

  /** Filtered variants paired with their memoized favorite state — computed once per dependency
   * change rather than calling a lookup method per card on every change-detection pass. */
  protected readonly cards = computed(() => {
    const favorites = this.favoriteKeys();
    return this.variants().map((variant) => ({
      variant,
      favorited: favorites.has(variantKeyOf(variant)),
    }));
  });

  /** Context-specific empty-state copy: distinguishes "no search results" from an empty Favorites/
   * Recently Used tab or an empty category, rather than one generic message for every case. */
  protected readonly emptyStateKey = computed(() => {
    if (this.searchTerm().trim()) {
      return 'ADMIN.PAGE_BUILDER.LIBRARY.EMPTY_SEARCH';
    }
    if (this.activeFilter() === 'favorites') {
      return 'ADMIN.PAGE_BUILDER.LIBRARY.EMPTY_FAVORITES';
    }
    if (this.activeFilter() === 'recent') {
      return 'ADMIN.PAGE_BUILDER.LIBRARY.EMPTY_RECENT';
    }
    if (this.activeCategory()) {
      return 'ADMIN.PAGE_BUILDER.LIBRARY.EMPTY_CATEGORY';
    }
    return 'ADMIN.PAGE_BUILDER.LIBRARY.EMPTY';
  });

  protected readonly variants = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const category = this.activeCategory();
    const filter = this.activeFilter();

    const available = this.availableVariants();
    let source: readonly SectionVariantDefinition[];
    if (filter === 'recent') {
      const byKey = new Map(available.map((v) => [variantKeyOf(v), v]));
      source = this.recentKeys()
        .map((key) => byKey.get(key))
        .filter((v): v is SectionVariantDefinition => v !== undefined);
    } else if (filter === 'favorites') {
      const favorites = this.favoriteKeys();
      source = available.filter((v) => favorites.has(variantKeyOf(v)));
    } else if (filter === 'popular') {
      source = available.filter((v) => v.badge === 'popular');
    } else if (filter === 'newest') {
      source = available.filter((v) => v.badge === 'new');
    } else {
      source = available;
    }

    return source.filter((v) => {
      if (category && v.category !== category) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        v.displayName.toLowerCase().includes(term) ||
        v.description.toLowerCase().includes(term) ||
        v.category.toLowerCase().includes(term) ||
        v.variantKey.toLowerCase().includes(term) ||
        v.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    });
  });

  protected toggleFavorite(variant: SectionVariantDefinition): void {
    const key = variantKeyOf(variant);
    const next = new Set(this.favoriteKeys());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.favoriteKeys.set(next);
    saveKeys(FAVORITES_KEY, next);
  }

  protected openPreview(variant: SectionVariantDefinition): void {
    this.previewVariant.set(variant);
  }

  protected closePreview(): void {
    this.previewVariant.set(null);
  }

  protected quickAddFromPreview(): void {
    const variant = this.previewVariant();
    if (variant) {
      this.select(variant);
    }
  }

  /** Single insertion funnel for both the card grid's Quick Add and the full-preview dialog's Quick
   * Add — keeps "recently used" tracking and the close/emit sequence in one place. Debounced against
   * rapid repeated calls (e.g. a physical double-click landing twice on the same Quick Add button)
   * so a section is never inserted more than once per user gesture. */
  protected select(variant: SectionVariantDefinition): void {
    const now = Date.now();
    if (now - this.lastSelectionAt < 400) {
      return;
    }
    this.lastSelectionAt = now;

    const key = variantKeyOf(variant);
    const nextRecent = [key, ...this.recentKeys().filter((k) => k !== key)].slice(0, MAX_RECENT);
    this.recentKeys.set(nextRecent);
    saveKeys(RECENT_KEY, nextRecent);

    this.previewVariant.set(null);
    this.variantSelected.emit(variant);
    this.visibleChange.emit(false);
  }
}
