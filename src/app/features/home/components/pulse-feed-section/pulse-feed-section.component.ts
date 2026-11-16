import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PulseFeedSectionConfig } from '../../section-registry/models/section-config.model';
import { HamboxLinkDirective } from '../../../../shared/directives/hambox-link.directive';

@Component({
  selector: 'app-pulse-feed-section',
  standalone: true,
  imports: [HamboxLinkDirective],
  templateUrl: './pulse-feed-section.component.html',
  styleUrl: './pulse-feed-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PulseFeedSectionComponent {
  readonly config = input.required<PulseFeedSectionConfig>();
}
