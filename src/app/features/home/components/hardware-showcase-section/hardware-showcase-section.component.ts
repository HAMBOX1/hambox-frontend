import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { HardwareShowcaseSectionConfig } from '../../section-registry/models/section-config.model';
import { HamboxLinkDirective } from '../../../../shared/directives/hambox-link.directive';

@Component({
  selector: 'app-hardware-showcase-section',
  standalone: true,
  imports: [HamboxLinkDirective],
  templateUrl: './hardware-showcase-section.component.html',
  styleUrl: './hardware-showcase-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HardwareShowcaseSectionComponent {
  readonly config = input.required<HardwareShowcaseSectionConfig>();
}
