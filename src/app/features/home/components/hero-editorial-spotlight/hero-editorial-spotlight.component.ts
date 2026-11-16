import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { HeroEditorialSpotlightConfig } from '../../section-registry/models/section-config.model';
import { HamboxLinkDirective } from '../../../../shared/directives/hambox-link.directive';

@Component({
  selector: 'app-hero-editorial-spotlight',
  standalone: true,
  imports: [ButtonModule, HamboxLinkDirective],
  templateUrl: './hero-editorial-spotlight.component.html',
  styleUrl: './hero-editorial-spotlight.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroEditorialSpotlightComponent {
  readonly hero = input.required<HeroEditorialSpotlightConfig>();
}
