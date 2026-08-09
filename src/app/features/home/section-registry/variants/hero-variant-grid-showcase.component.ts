import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { HeroGridShowcaseComponent } from '../../components/hero-grid-showcase/hero-grid-showcase.component';
import { HeroGridShowcaseConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-hero-variant-grid-showcase',
  standalone: true,
  imports: [HeroGridShowcaseComponent],
  template: `<app-hero-grid-showcase [hero]="hero()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroVariantGridShowcaseComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<HeroGridShowcaseConfig>();

  /** Blank fields fall back to the Product/Category marketing page's own target — see the
   * kinetic-glass variant's `hero` computed for the full rationale. */
  protected readonly hero = computed<HeroGridShowcaseConfig>(() => {
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
    };
  });
}
