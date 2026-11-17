import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';

import { ProductFacetGroup } from '../../models/product.model';
import { CategoryFilterItem } from '../../models/category.model';
import { CategoryApiService } from '../../services/category-api.service';
import { ProductApiService } from '../../services/product-api.service';
import { StoreFiltersSidebarComponent } from '../../../products/components/store-filters-sidebar/store-filters-sidebar.component';
import { StoreCategoryNode } from '../../../products/models/product';
import { mapFacetGroups } from '../../../products/services/products.facade';
import { DynamicFilterGroup } from '../../../products/utils/storefront-filter.util';

/**
 * Live preview of the storefront filter panel, on a desktop or a phone, in English or Arabic. It is the real panel the
 * store uses, fed with the real products and filters of the chosen platform / category. While you edit a list, the
 * unsaved order, names and visibility are applied on top, so you can see the result before saving.
 */
@Component({
  selector: 'app-filter-preview',
  standalone: true,
  imports: [FormsModule, SelectModule, StoreFiltersSidebarComponent],
  template: `
    <div class="pv">
      <div class="pv__controls">
        <label class="pv__field">
          <span>Platform / category</span>
          <p-select
            [options]="[...scopeOptions()]"
            optionLabel="label"
            optionValue="id"
            [filter]="true"
            appendTo="body"
            [ngModel]="categoryId()"
            (ngModelChange)="categoryId.set($event)"
          />
        </label>
        <div class="pv__toggle" role="group" aria-label="Device">
          <button type="button" [class.is-active]="device() === 'desktop'" (click)="device.set('desktop')"><i class="pi pi-desktop"></i> Desktop</button>
          <button type="button" [class.is-active]="device() === 'mobile'" (click)="device.set('mobile')"><i class="pi pi-mobile"></i> Mobile</button>
        </div>
        <div class="pv__toggle" role="group" aria-label="Language">
          <button type="button" [class.is-active]="lang() === 'en'" (click)="lang.set('en')">English</button>
          <button type="button" [class.is-active]="lang() === 'ar'" (click)="lang.set('ar')">العربية</button>
        </div>
      </div>

      @if (usesDraft()) {
        <p class="pv__note">Showing your unsaved changes to this list (order, names, visibility). Save them in “Filter lists &amp; order” to publish.</p>
      } @else {
        <p class="pv__note">Showing what customers see now for this category.</p>
      }

      @if (loading()) {
        <p class="pv__note">Loading…</p>
      }

      <div class="pv__stage" [class.pv__stage--mobile]="device() === 'mobile'">
        <div class="pv__frame" [class.pv__frame--mobile]="device() === 'mobile'" [attr.dir]="lang() === 'ar' ? 'rtl' : 'ltr'">
          <app-store-filters-sidebar
            [filterGroups]="groups()"
            [activeFilters]="null"
            [collapsed]="false"
            [mobileOpen]="false"
            [activeFilterCount]="0"
            [resultCount]="null"
            [priceBounds]="priceBounds()"
            [categoryNodes]="nodes()"
            [selectedCategoryId]="categoryId()"
            [previewDevice]="device()"
            (categoryChange)="categoryId.set($event)"
          />
        </div>
      </div>
    </div>
  `,
  styles: `
    .pv {
      display: grid;
      gap: 0.85rem;
    }

    .pv__controls {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 1rem;
    }

    .pv__field {
      display: grid;
      gap: 0.3rem;
      min-width: 16rem;
      font-weight: 600;
      font-size: 0.85rem;
    }

    .pv__toggle {
      display: inline-flex;
      border: 1px solid var(--admin-border-default);
      border-radius: 999px;
      overflow: hidden;
    }

    .pv__toggle button {
      padding: 0.5rem 0.9rem;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    .pv__toggle button.is-active {
      background: color-mix(in srgb, var(--admin-primary) 18%, transparent);
      color: var(--admin-primary);
    }

    .pv__note {
      margin: 0;
      color: var(--admin-text-secondary);
    }

    .pv__stage {
      display: flex;
      justify-content: flex-start;
      padding: 1rem;
      border: 1px dashed var(--admin-border-default);
      border-radius: 0.75rem;
      background: var(--admin-surface-muted, transparent);
    }

    .pv__stage--mobile {
      justify-content: center;
    }

    .pv__frame {
      width: 100%;
      max-width: 19rem;
    }

    // A phone-sized frame; "transform" keeps the panel's fixed-position drawer styles inside it.
    .pv__frame--mobile {
      width: 23.5rem;
      max-width: 100%;
      padding: 0.75rem;
      border: 6px solid var(--admin-border-strong, #444);
      border-radius: 1.75rem;
      transform: translateZ(0);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterPreviewComponent {
  private readonly productApi = inject(ProductApiService);
  private readonly categoryApi = inject(CategoryApiService);

  /** The list being edited on the Filter lists tab (unsaved); applied on top when it is the previewed category. */
  readonly draftItems = input<readonly CategoryFilterItem[]>([]);
  /** The category whose list is open in the editor ('00000000-…' for the store-wide default). */
  readonly editedCategoryId = input('all');
  readonly scopeOptions = input<readonly { id: string; label: string }[]>([]);

  protected readonly categoryId = signal('all');
  protected readonly device = signal<'desktop' | 'mobile'>('desktop');
  protected readonly lang = signal<'en' | 'ar'>('en');
  protected readonly loading = signal(false);
  private readonly facets = signal<readonly ProductFacetGroup[]>([]);
  protected readonly priceBounds = signal<{ min: number | null; max: number | null }>({ min: null, max: null });
  protected readonly nodes = signal<readonly StoreCategoryNode[]>([]);

  protected readonly usesDraft = computed(
    () => this.draftItems().length > 0 && (this.categoryId() === this.editedCategoryId() || (this.editedCategoryId() === '00000000-0000-0000-0000-000000000000' && this.categoryId() === 'all')),
  );

  protected readonly groups = computed<readonly DynamicFilterGroup[]>(() => {
    const language = this.lang();
    const facets = this.facets();
    if (!this.usesDraft()) {
      return mapFacetGroups(facets, language);
    }

    // The editor's order, visibility and names on top of the real facets (a filter with no products here is not shown).
    const byKey = new Map(facets.map((facet) => [facet.key, facet]));
    const ordered: ProductFacetGroup[] = [];
    for (const item of this.draftItems()) {
      const facet = byKey.get(item.groupKey);
      if (facet && item.isVisible) {
        ordered.push({
          ...facet,
          displayName: item.displayNameEn?.trim() || facet.displayName,
          displayNameAr: item.displayNameAr?.trim() || facet.displayNameAr,
        });
      }
    }

    return mapFacetGroups(ordered, language);
  });

  constructor() {
    effect(() => {
      const edited = this.editedCategoryId();
      this.categoryId.set(edited === '00000000-0000-0000-0000-000000000000' ? 'all' : edited);
    });

    effect(() => {
      const id = this.categoryId();
      void this.load(id);
    });

    void firstValueFrom(this.categoryApi.getCategories({ pageNumber: 1, pageSize: 200, activeOnly: true })).then((result) =>
      this.nodes.set((result.items ?? []).map((category) => ({ id: category.id, parentId: category.parentId, label: category.nameEn }))),
    );
  }

  private async load(categoryId: string): Promise<void> {
    this.loading.set(true);
    try {
      const query = categoryId === 'all' ? {} : { categoryId };
      const [facets, range] = await Promise.all([
        firstValueFrom(this.productApi.getProductFacets(query)),
        firstValueFrom(this.productApi.getPriceRange(query)),
      ]);
      this.facets.set(facets);
      this.priceBounds.set({ min: range.min, max: range.max });
    } catch {
      this.facets.set([]);
      this.priceBounds.set({ min: null, max: null });
    } finally {
      this.loading.set(false);
    }
  }
}
