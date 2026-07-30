import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PopularCategoriesComponent } from '../../components/popular-categories/popular-categories.component';
import { PopularCategoriesSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-popular-categories-variant-default',
  standalone: true,
  imports: [PopularCategoriesComponent, EmptyStateComponent],
  template: `
    @if (context().categories.length) {
      <app-popular-categories [categories]="context().categories" [sectionTitle]="config().sectionTitle" />
    } @else {
      <section class="section-empty" aria-label="Categories unavailable">
        <app-empty-state
          icon="pi pi-folder-open"
          title="No categories yet"
          description="Active categories will appear here once they are published in the catalog."
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
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<PopularCategoriesSectionConfig>();
}
