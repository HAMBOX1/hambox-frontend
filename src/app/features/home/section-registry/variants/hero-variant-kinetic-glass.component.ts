import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { HeroSectionComponent } from '../../components/hero-section/hero-section.component';
import { StorefrontHeroContent } from '../../models/storefront-content.model';
import { HeroSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-hero-variant-kinetic-glass',
  standalone: true,
  imports: [HeroSectionComponent],
  template: `<app-hero-section [hero]="hero()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroVariantKineticGlassComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<HeroSectionConfig>();

  // `visible` is always true here — section-instance visibility (`isVisible`) already gates whether
  // this component is mounted at all (server-side filter on the storefront, `visibleSections` filter
  // in the admin preview), so the leaf `HeroSectionComponent`'s (unused-in-practice) `visible` flag
  // is a fixed pass-through rather than a second, redundant setting.
  //
  // On a Product/Category marketing page, any field the admin left blank falls back to the real
  // target's own title/description/image/link — never overriding a field the admin actually set.
  protected readonly hero = computed<StorefrontHeroContent>(() => {
    const config = this.config();
    const { targetProduct, targetCategory } = this.context();
    const fallbackTitle = targetProduct?.title ?? targetCategory?.title ?? '';
    const fallbackSubtitle = targetProduct?.description ?? targetCategory?.subtitle ?? '';
    const fallbackImage = targetProduct?.imageUrl ?? targetCategory?.imageUrl ?? '';
    const fallbackUrl = targetProduct?.route ?? targetCategory?.route ?? '';

    return {
      ...config,
      title: config.title || fallbackTitle,
      subtitle: config.subtitle || fallbackSubtitle,
      backgroundImageUrl: config.backgroundImageUrl || fallbackImage,
      primaryButtonUrl: config.primaryButtonUrl || fallbackUrl,
      visible: true,
    };
  });
}
