import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LatestArrivalsSectionComponent } from '../../components/latest-arrivals-section/latest-arrivals-section.component';
import { LatestArrivalsSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-latest-arrivals-variant-default',
  standalone: true,
  imports: [LatestArrivalsSectionComponent, EmptyStateComponent],
  template: `
    @if (context().featuredProducts.length) {
      <app-latest-arrivals-section
        [deals]="context().featuredProducts"
        [sectionTitle]="config().sectionTitle"
        [sectionTitleAccent]="config().sectionTitleAccent"
        [sectionSubtitle]="config().sectionSubtitle"
      />
    } @else {
      <section class="section-empty" aria-label="Latest arrivals unavailable">
        <app-empty-state
          icon="pi pi-shopping-bag"
          title="No products yet"
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
export class LatestArrivalsVariantDefaultComponent {
  private readonly router = inject(Router);

  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<LatestArrivalsSectionConfig>();

  protected browseStore(): void {
    void this.router.navigate(['/products']);
  }
}
