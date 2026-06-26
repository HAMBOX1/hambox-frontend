import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { StorefrontHeroContent } from '../../models/storefront-content.model';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [ButtonModule, RouterLink],
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSectionComponent {
  readonly hero = input.required<StorefrontHeroContent>();

  protected readonly boltIcon = 'assets/images/hambox-hero-bolt.svg';
}
