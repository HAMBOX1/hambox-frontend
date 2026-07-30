import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ArenaBriefingsSectionComponent } from '../../components/arena-briefings-section/arena-briefings-section.component';
import { ArenaBriefingsSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-arena-briefings-variant-default',
  standalone: true,
  imports: [ArenaBriefingsSectionComponent],
  template: `<app-arena-briefings-section [config]="config()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArenaBriefingsVariantDefaultComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<ArenaBriefingsSectionConfig>();
}
