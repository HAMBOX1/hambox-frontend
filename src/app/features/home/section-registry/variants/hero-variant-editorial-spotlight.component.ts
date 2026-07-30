import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { HeroEditorialSpotlightComponent } from '../../components/hero-editorial-spotlight/hero-editorial-spotlight.component';
import { HeroEditorialSpotlightConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-hero-variant-editorial-spotlight',
  standalone: true,
  imports: [HeroEditorialSpotlightComponent],
  template: `<app-hero-editorial-spotlight [hero]="config()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroVariantEditorialSpotlightComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<HeroEditorialSpotlightConfig>();
}
