import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { TranslationService } from '../../../../core/i18n/translation.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { CategoryApiService } from '../../../catalog/services/category-api.service';
import { PopularCategoriesComponent } from '../../components/popular-categories/popular-categories.component';
import { StorefrontCategory } from '../../models/storefront-home';
import { mapCategoryToStorefrontCategory } from '../../utils/storefront-home.mapper';
import { PopularCategoriesSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

/**
 * A grid of tiles. By default the store's active categories; the admin can pick which categories (and their order), or
 * switch the tiles to products (chosen with the "Products shown" options every Products section has).
 */
@Component({
  selector: 'app-popular-categories-variant-default',
  standalone: true,
  imports: [PopularCategoriesComponent, EmptyStateComponent],
  template: `
    @if (tiles().length) {
      <app-popular-categories [categories]="tiles()" [sectionTitle]="config().sectionTitle" />
    } @else if (!loading()) {
      <section class="section-empty" aria-label="Nothing to show">
        <app-empty-state
          [icon]="showsProducts() ? 'pi pi-box' : 'pi pi-folder-open'"
          [title]="showsProducts() ? 'No products yet' : 'No categories yet'"
          [description]="
            showsProducts()
              ? 'Choose the products to show in this section’s settings.'
              : 'Active categories will appear here once they are published in the catalog.'
          "
        />
      </section>
    }
  `,
  styles: `
    .section-empty {
      padding: 0 16px 32px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopularCategoriesVariantDefaultComponent {
  private readonly categoryApi = inject(CategoryApiService);
  private readonly translation = inject(TranslationService);

  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<PopularCategoriesSectionConfig>();

  protected readonly loading = signal(false);
  /** The picked categories once loaded; null while there is nothing picked or the lookup failed. */
  private readonly picked = signal<readonly StorefrontCategory[] | null>(null);

  protected readonly showsProducts = computed(() => this.config().contentType === 'products');
  private readonly pickedIds = computed(() => (this.showsProducts() ? [] : (this.config().categoryIds ?? [])));

  protected readonly tiles = computed<readonly StorefrontCategory[]>(() => {
    if (this.showsProducts()) {
      return this.context().featuredProducts.map((product) => ({
        id: product.id,
        title: product.title,
        subtitle: product.subtitle,
        imageUrl: product.imageUrl,
        route: `/products/${product.id}`,
      }));
    }

    if (this.pickedIds().length > 0) {
      // While the picked ones load, show nothing rather than flashing the default categories.
      return this.picked() ?? (this.loading() ? [] : this.context().categories);
    }

    return this.context().categories;
  });

  constructor() {
    effect((onCleanup) => {
      const ids = this.pickedIds();
      if (ids.length === 0) {
        this.picked.set(null);
        this.loading.set(false);
        return;
      }

      let cancelled = false;
      this.loading.set(true);
      firstValueFrom(this.categoryApi.getCategories({ pageNumber: 1, pageSize: 100, activeOnly: true }))
        .then((result) => {
          if (cancelled) {
            return;
          }
          const lang = this.translation.language();
          const byId = new Map(result.items.map((category) => [category.id, category]));
          this.picked.set(
            ids
              .map((id) => byId.get(id))
              .filter((category) => !!category)
              .map((category) => mapCategoryToStorefrontCategory(category, lang)),
          );
        })
        .catch(() => {
          if (!cancelled) {
            this.picked.set(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            this.loading.set(false);
          }
        });
      onCleanup(() => {
        cancelled = true;
      });
    });
  }
}
