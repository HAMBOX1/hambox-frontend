import { HamboxCurrencyPipe } from '../../pipes/hambox-currency.pipe';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TrendingValueItem } from '../../../features/home/models/storefront-home';

@Component({
  selector: 'app-trending-value-card',
  standalone: true,
  imports: [ButtonModule, RouterLink, HamboxCurrencyPipe],
  templateUrl: './trending-value-card.component.html',
  styleUrl: './trending-value-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendingValueCardComponent {
  item = input.required<TrendingValueItem>();
}
