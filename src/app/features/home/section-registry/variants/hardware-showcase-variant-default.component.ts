import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { HardwareShowcaseSectionComponent } from '../../components/hardware-showcase-section/hardware-showcase-section.component';
import { HardwareShowcaseSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-hardware-showcase-variant-default',
  standalone: true,
  imports: [HardwareShowcaseSectionComponent],
  template: `<app-hardware-showcase-section [config]="config()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HardwareShowcaseVariantDefaultComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<HardwareShowcaseSectionConfig>();
}
