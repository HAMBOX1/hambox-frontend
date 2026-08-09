import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { CartLineItemComponent } from '../../components/cart-line-item/cart-line-item.component';
import { CartOrderSummaryComponent } from '../../components/cart-order-summary/cart-order-summary.component';
import { STOREFRONT_PRODUCTS_NAV_LINKS } from '../../../products/services/storefront-products-data';
import { CartFacade } from '../../services/cart.facade';
import { CartLineItem } from '../../models/cart';

import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';

const UNDO_WINDOW_MS = 6000;

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [
    RouterLink,
    StorefrontNavComponent,
    StorefrontFooterComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    CartLineItemComponent,
    CartOrderSummaryComponent,
    HamboxCurrencyPipe,
    TranslatePipe,
  ],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPageComponent implements OnInit {
  private readonly cartFacade = inject(CartFacade);
  private readonly translate = inject(TranslateService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly navLinks = signal([...STOREFRONT_PRODUCTS_NAV_LINKS]);
  protected readonly items = this.cartFacade.items;
  protected readonly summary = this.cartFacade.summary;
  protected readonly isEmpty = this.cartFacade.isEmpty;
  protected readonly loading = this.cartFacade.loading;
  protected readonly mutating = this.cartFacade.mutating;
  protected readonly error = this.cartFacade.error;

  protected readonly recentlyRemoved = signal<CartLineItem | null>(null);
  private undoTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearUndoTimer());
  }

  ngOnInit(): void {
    void this.cartFacade.load();
  }

  protected retry(): void {
    void this.cartFacade.load();
  }

  protected async removeItem(id: string): Promise<void> {
    const item = this.items().find((entry) => entry.id === id);
    await this.cartFacade.removeItem(id);

    if (!item) {
      return;
    }

    this.clearUndoTimer();
    this.recentlyRemoved.set(item);
    this.undoTimer = setTimeout(() => this.recentlyRemoved.set(null), UNDO_WINDOW_MS);
  }

  protected async undoRemove(): Promise<void> {
    const item = this.recentlyRemoved();
    if (!item) {
      return;
    }

    this.clearUndoTimer();
    this.recentlyRemoved.set(null);

    try {
      await this.cartFacade.addItem(item.productId, item.quantity, item.productVariantId);
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('CART.UNDO_ERROR'),
        life: 4000,
      });
    }
  }

  private clearUndoTimer(): void {
    if (this.undoTimer !== null) {
      clearTimeout(this.undoTimer);
      this.undoTimer = null;
    }
  }

  protected incrementQuantity(id: string): void {
    void this.cartFacade.incrementQuantity(id);
  }

  protected decrementQuantity(id: string): void {
    void this.cartFacade.decrementQuantity(id);
  }
}
