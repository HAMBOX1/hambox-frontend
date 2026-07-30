import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PlatformSelectorSectionConfig } from '../../section-registry/models/section-config.model';

@Component({
  selector: 'app-platform-selector-section',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './platform-selector-section.component.html',
  styleUrl: './platform-selector-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformSelectorSectionComponent {
  readonly config = input.required<PlatformSelectorSectionConfig>();
}
