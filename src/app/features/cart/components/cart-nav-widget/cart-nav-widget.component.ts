import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { CartFacade } from '../../services/cart.facade';

@Component({
  selector: 'app-cart-nav-widget',
  standalone: true,
  imports: [RouterLink, HamboxCurrencyPipe, TranslatePipe],
  templateUrl: './cart-nav-widget.component.html',
  styleUrl: './cart-nav-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartNavWidgetComponent {
  private readonly cartFacade = inject(CartFacade);

  compact = input(false);

  protected readonly itemCount = this.cartFacade.itemCount;
  protected readonly items = this.cartFacade.items;
  protected readonly summary = this.cartFacade.summary;
  protected readonly panelOpen = signal(false);

  protected togglePanel(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.panelOpen.update((open) => !open);
  }

  protected closePanel(): void {
    this.panelOpen.set(false);
  }

  protected onIncrement(id: string, event: Event): void {
    event.stopPropagation();
    void this.cartFacade.incrementQuantity(id);
  }

  protected onDecrement(id: string, event: Event): void {
    event.stopPropagation();
    void this.cartFacade.decrementQuantity(id);
  }

  protected onRemove(id: string, event: Event): void {
    event.stopPropagation();
    void this.cartFacade.removeItem(id);
  }
}
