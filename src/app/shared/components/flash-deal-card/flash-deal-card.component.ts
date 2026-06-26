import { HamboxCurrencyPipe } from '../../pipes/hambox-currency.pipe';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { FlashDeal } from '../../../features/home/models/storefront-home';

@Component({
  selector: 'app-flash-deal-card',
  standalone: true,
  imports: [ButtonModule, TagModule, RouterLink, HamboxCurrencyPipe],
  templateUrl: './flash-deal-card.component.html',
  styleUrl: './flash-deal-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashDealCardComponent {
  deal = input.required<FlashDeal>();
}
