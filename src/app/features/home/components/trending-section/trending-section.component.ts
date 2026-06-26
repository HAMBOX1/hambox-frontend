import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TrendingFeatureCardComponent } from '../../../../shared/components/trending-feature-card/trending-feature-card.component';
import { TrendingRankCardComponent } from '../../../../shared/components/trending-rank-card/trending-rank-card.component';
import { TrendingValueCardComponent } from '../../../../shared/components/trending-value-card/trending-value-card.component';
import {
  StorefrontFeaturedProduct,
  TrendingRankItem,
  TrendingValueItem,
} from '../../models/storefront-home';

@Component({
  selector: 'app-trending-section',
  standalone: true,
  imports: [TrendingFeatureCardComponent, TrendingRankCardComponent, TrendingValueCardComponent],
  templateUrl: './trending-section.component.html',
  styleUrl: './trending-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendingSectionComponent {
  featuredProduct = input<StorefrontFeaturedProduct | null>(null);
  rankItems = input.required<readonly TrendingRankItem[]>();
  valueItem = input<TrendingValueItem | null>(null);
}
