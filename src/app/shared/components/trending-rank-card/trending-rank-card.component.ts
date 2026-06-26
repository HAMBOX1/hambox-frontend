import { HamboxCurrencyPipe } from '../../pipes/hambox-currency.pipe';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrendingRankItem } from '../../../features/home/models/storefront-home';

@Component({
  selector: 'app-trending-rank-card',
  standalone: true,
  imports: [RouterLink, HamboxCurrencyPipe],
  templateUrl: './trending-rank-card.component.html',
  styleUrl: './trending-rank-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendingRankCardComponent {
  item = input.required<TrendingRankItem>();
}
