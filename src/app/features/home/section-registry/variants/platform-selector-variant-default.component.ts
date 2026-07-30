import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PlatformSelectorSectionComponent } from '../../components/platform-selector-section/platform-selector-section.component';
import { PlatformSelectorSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-platform-selector-variant-default',
  standalone: true,
  imports: [PlatformSelectorSectionComponent],
  template: `<app-platform-selector-section [config]="config()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformSelectorVariantDefaultComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<PlatformSelectorSectionConfig>();
}
