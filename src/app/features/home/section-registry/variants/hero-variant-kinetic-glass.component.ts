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
  protected readonly hero = computed<StorefrontHeroContent>(() => ({ ...this.config(), visible: true }));
}
