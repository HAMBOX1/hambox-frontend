import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ArenaBriefingsSectionConfig } from '../../section-registry/models/section-config.model';

@Component({
  selector: 'app-arena-briefings-section',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './arena-briefings-section.component.html',
  styleUrl: './arena-briefings-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArenaBriefingsSectionComponent {
  readonly config = input.required<ArenaBriefingsSectionConfig>();

  protected readonly leftItems = computed(() => {
    const half = Math.ceil(this.config().sideItems.length / 2);
    return this.config().sideItems.slice(0, half);
  });

  protected readonly rightItems = computed(() => {
    const half = Math.ceil(this.config().sideItems.length / 2);
    return this.config().sideItems.slice(half);
  });
}
