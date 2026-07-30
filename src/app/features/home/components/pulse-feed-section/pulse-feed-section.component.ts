import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PulseFeedSectionConfig } from '../../section-registry/models/section-config.model';

@Component({
  selector: 'app-pulse-feed-section',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './pulse-feed-section.component.html',
  styleUrl: './pulse-feed-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PulseFeedSectionComponent {
  readonly config = input.required<PulseFeedSectionConfig>();
}
