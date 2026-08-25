import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { ImageFallbackDirective } from '../../../../shared/directives/image-fallback.directive';
import { OrderSuccessItem } from '../../models/order-success';

@Component({
  selector: 'app-order-purchased-items',
  standalone: true,
  imports: [HamboxCurrencyPipe, ImageFallbackDirective],
  templateUrl: './order-purchased-items.component.html',
  styleUrl: './order-purchased-items.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderPurchasedItemsComponent {
  items = input.required<readonly OrderSuccessItem[]>();
  total = input.required<number>();
}
