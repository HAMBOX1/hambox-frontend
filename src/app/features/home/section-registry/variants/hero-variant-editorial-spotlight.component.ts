import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { HeroEditorialSpotlightComponent } from '../../components/hero-editorial-spotlight/hero-editorial-spotlight.component';
import { HeroEditorialSpotlightConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-hero-variant-editorial-spotlight',
  standalone: true,
  imports: [HeroEditorialSpotlightComponent],
  template: `<app-hero-editorial-spotlight [hero]="hero()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroVariantEditorialSpotlightComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<HeroEditorialSpotlightConfig>();

  /** Blank fields on the large "featured" card fall back to the marketing page's own target — the
   * two small side cards stay purely admin-authored (no second/third target to fall back to). */
  protected readonly hero = computed<HeroEditorialSpotlightConfig>(() => {
    const config = this.config();
    const { targetProduct, targetCategory } = this.context();
    const fallbackTitle = targetProduct?.title ?? targetCategory?.title ?? '';
    const fallbackSubtitle = targetProduct?.description ?? targetCategory?.subtitle ?? '';
    const fallbackImage = targetProduct?.imageUrl ?? targetCategory?.imageUrl ?? '';
    const fallbackUrl = targetProduct?.route ?? targetCategory?.route ?? '';

    return {
      ...config,
      title: config.title || fallbackTitle,
      featuredTitle: config.featuredTitle || fallbackTitle,
      featuredSubtitle: config.featuredSubtitle || fallbackSubtitle,
      featuredImageUrl: config.featuredImageUrl || fallbackImage,
      featuredButtonUrl: config.featuredButtonUrl || fallbackUrl,
    };
  });
}
