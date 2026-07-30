import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { HardwareShowcaseSectionConfig } from '../../section-registry/models/section-config.model';

@Component({
  selector: 'app-hardware-showcase-section',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './hardware-showcase-section.component.html',
  styleUrl: './hardware-showcase-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HardwareShowcaseSectionComponent {
  readonly config = input.required<HardwareShowcaseSectionConfig>();
}
