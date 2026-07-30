import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { HeroEditorialSpotlightConfig } from '../../section-registry/models/section-config.model';

@Component({
  selector: 'app-hero-editorial-spotlight',
  standalone: true,
  imports: [ButtonModule, RouterLink],
  templateUrl: './hero-editorial-spotlight.component.html',
  styleUrl: './hero-editorial-spotlight.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroEditorialSpotlightComponent {
  readonly hero = input.required<HeroEditorialSpotlightConfig>();
}
