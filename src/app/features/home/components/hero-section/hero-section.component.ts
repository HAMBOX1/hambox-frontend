import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { ParallaxDirective } from '../../../../shared/directives/parallax.directive';
import { StorefrontHeroContent } from '../../models/storefront-content.model';
import { HamboxLinkDirective } from '../../../../shared/directives/hambox-link.directive';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [ButtonModule, ParallaxDirective, HamboxLinkDirective],
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSectionComponent {
  readonly hero = input.required<StorefrontHeroContent>();

  protected readonly boltIcon = 'assets/images/hambox-hero-bolt.svg';
}
