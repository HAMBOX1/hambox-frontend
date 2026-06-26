import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { StoreProduct } from '../../models/product';
import { CartFacade } from '../../../cart/services/cart.facade';

@Component({
  selector: 'app-store-product-card',
  standalone: true,
  imports: [RouterLink, TranslatePipe, HamboxCurrencyPipe],
  templateUrl: './store-product-card.component.html',
  styleUrl: './store-product-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreProductCardComponent {
  private readonly cartFacade = inject(CartFacade);
  private readonly translate = inject(TranslateService);

  product = input.required<StoreProduct>();

  protected readonly cartIconSrc = 'assets/images/top-nav/cart-icon.svg';
  protected readonly addError = signal<string | null>(null);

  protected async addToCart(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (this.product().outOfStock) {
      return;
    }

    this.addError.set(null);

    try {
      await this.cartFacade.addItem(this.product().id);
    } catch {
      this.addError.set(this.translate.instant('CART.ADD_ERROR'));
    }
  }
}
