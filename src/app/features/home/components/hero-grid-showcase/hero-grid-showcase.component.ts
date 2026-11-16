import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { HeroGridShowcaseConfig } from '../../section-registry/models/section-config.model';
import { HamboxLinkDirective } from '../../../../shared/directives/hambox-link.directive';

@Component({
  selector: 'app-hero-grid-showcase',
  standalone: true,
  imports: [ButtonModule, HamboxLinkDirective],
  templateUrl: './hero-grid-showcase.component.html',
  styleUrl: './hero-grid-showcase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroGridShowcaseComponent {
  readonly hero = input.required<HeroGridShowcaseConfig>();

  protected readonly boltIcon = 'assets/images/hambox-hero-bolt.svg';
}
