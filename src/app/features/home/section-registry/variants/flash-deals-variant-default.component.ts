import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { StoreProductCardComponent } from '../../../products/components/store-product-card/store-product-card.component';
import { FlashDealsSectionComponent } from '../../components/flash-deals-section/flash-deals-section.component';
import { FlashDealsSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-flash-deals-variant-default',
  standalone: true,
  imports: [FlashDealsSectionComponent, EmptyStateComponent, StoreProductCardComponent],
  template: `
    @if (context().targetCategoryProducts; as categoryProducts) {
      <!-- Category marketing page: real products in this category, not a live-ranked flash-deal feed. -->
      @if (categoryProducts.length) {
        <section class="category-products" aria-label="Products in this category">
          @if (config().sectionTitle) {
            <h2 class="category-products__title">{{ config().sectionTitle }}</h2>
          }
          <div class="category-products__grid">
            @for (product of categoryProducts; track product.id) {
              <app-store-product-card [product]="product" />
            }
          </div>
        </section>
      } @else {
        <section class="section-empty" aria-label="No products in this category">
          <app-empty-state
            icon="pi pi-shopping-bag"
            title="No products in this category yet"
            description="Active products in this category will appear here once published."
          />
        </section>
      }
    } @else if (context().featuredProducts.length) {
      <app-flash-deals-section
        [deals]="context().featuredProducts"
        [initialCountdownSeconds]="config().countdownSeconds"
        [countdownDateUtc]="config().countdownDateUtc"
        [sectionTitle]="config().sectionTitle"
        [sectionSubtitle]="config().sectionSubtitle"
        [countdownEnabled]="config().countdownEnabled"
      />
    } @else {
      <section class="section-empty" aria-label="Featured products unavailable">
        <app-empty-state
          icon="pi pi-shopping-bag"
          title="No featured products yet"
          description="Active products will appear here once they are published in the catalog."
          actionLabel="Browse store"
          actionIcon="pi pi-arrow-right"
          (action)="browseStore()"
        />
      </section>
    }
  `,
  styles: `
    .section-empty {
      padding: 0 16px 32px;
    }
    .category-products {
      padding: 0 16px 32px;
    }
    .category-products__title {
      margin: 0 0 16px;
    }
    .category-products__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashDealsVariantDefaultComponent {
  private readonly router = inject(Router);

  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<FlashDealsSectionConfig>();

  protected browseStore(): void {
    void this.router.navigate(['/products']);
  }
}
