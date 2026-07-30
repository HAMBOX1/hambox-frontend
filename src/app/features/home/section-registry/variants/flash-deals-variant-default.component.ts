import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FlashDealsSectionComponent } from '../../components/flash-deals-section/flash-deals-section.component';
import { FlashDealsSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-flash-deals-variant-default',
  standalone: true,
  imports: [FlashDealsSectionComponent, EmptyStateComponent],
  template: `
    @if (context().featuredProducts.length) {
      <app-flash-deals-section
        [deals]="context().featuredProducts"
        [initialCountdownSeconds]="config().countdownSeconds"
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
