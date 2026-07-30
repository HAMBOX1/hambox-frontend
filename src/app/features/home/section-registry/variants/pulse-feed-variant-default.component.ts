import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PulseFeedSectionComponent } from '../../components/pulse-feed-section/pulse-feed-section.component';
import { PulseFeedSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-pulse-feed-variant-default',
  standalone: true,
  imports: [PulseFeedSectionComponent],
  template: `<app-pulse-feed-section [config]="config()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PulseFeedVariantDefaultComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<PulseFeedSectionConfig>();
}
