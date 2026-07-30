import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { HeroGridShowcaseComponent } from '../../components/hero-grid-showcase/hero-grid-showcase.component';
import { HeroGridShowcaseConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-hero-variant-grid-showcase',
  standalone: true,
  imports: [HeroGridShowcaseComponent],
  template: `<app-hero-grid-showcase [hero]="config()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroVariantGridShowcaseComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<HeroGridShowcaseConfig>();
}
