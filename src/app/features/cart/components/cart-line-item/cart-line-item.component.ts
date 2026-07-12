import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { CartLineItem } from '../../models/cart';

@Component({
  selector: 'app-cart-line-item',
  standalone: true,
  imports: [HamboxCurrencyPipe, TranslatePipe],
  templateUrl: './cart-line-item.component.html',
  styleUrl: './cart-line-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartLineItemComponent {
  item = input.required<CartLineItem>();

  remove = output<string>();
  increment = output<string>();
  decrement = output<string>();

  protected onRemove(): void {
    this.remove.emit(this.item().id);
  }

  protected onIncrement(): void {
    this.increment.emit(this.item().id);
  }

  protected onDecrement(): void {
    this.decrement.emit(this.item().id);
  }
}
