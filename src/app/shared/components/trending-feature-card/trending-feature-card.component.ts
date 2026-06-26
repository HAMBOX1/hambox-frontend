import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { StorefrontFeaturedProduct } from '../../../features/home/models/storefront-home';

@Component({
  selector: 'app-trending-feature-card',
  standalone: true,
  imports: [ButtonModule, RouterLink],
  templateUrl: './trending-feature-card.component.html',
  styleUrl: './trending-feature-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendingFeatureCardComponent {
  readonly feature = input.required<StorefrontFeaturedProduct>();
}
