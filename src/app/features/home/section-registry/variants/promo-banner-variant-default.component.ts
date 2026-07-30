import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PromoBannerComponent } from '../../components/promo-banner/promo-banner.component';
import { StorefrontPromoBannerContent } from '../../models/storefront-content.model';
import { PromoBannerSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-promo-banner-variant-default',
  standalone: true,
  imports: [PromoBannerComponent],
  template: `<app-promo-banner [banner]="banner()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoBannerVariantDefaultComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<PromoBannerSectionConfig>();

  // See HeroVariantKineticGlassComponent's comment — `visible` is a fixed pass-through, gating
  // already happened at the section-instance level before this component was ever mounted.
  protected readonly banner = computed<StorefrontPromoBannerContent>(() => ({ ...this.config(), visible: true }));
}
