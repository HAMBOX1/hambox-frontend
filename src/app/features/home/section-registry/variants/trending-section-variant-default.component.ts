import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TrendingSectionComponent } from '../../components/trending-section/trending-section.component';
import { FeaturedCollectionsSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-trending-section-variant-default',
  standalone: true,
  imports: [TrendingSectionComponent],
  template: `
    @if (hasTrending()) {
      <app-trending-section
        [featuredProduct]="context().featuredHighlight"
        [rankItems]="context().trendingRanks"
        [valueItem]="context().trendingValue"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendingSectionVariantDefaultComponent {
  readonly context = input.required<SectionRenderContext>();
  // `config` (title/subtitle/maximumItems/displayStyle) isn't rendered by `TrendingSectionComponent`
  // today — it has no section heading — but the input is still declared so this variant has the
  // same shape as the rest of the registry and a settings form either way.
  readonly config = input.required<FeaturedCollectionsSectionConfig>();

  protected readonly hasTrending = computed(() => {
    const ctx = this.context();
    return ctx.featuredHighlight !== null || ctx.trendingRanks.length > 0 || ctx.trendingValue !== null;
  });
}
