import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { AccountWishlistFacade } from '../../services/account-wishlist.facade';
import { resolveWishlistItemImageUrl } from '../../utils/wishlist-image.util';

@Component({
  selector: 'app-account-wishlist-page',
  standalone: true,
  imports: [RouterLink, HamboxCurrencyPipe],
  templateUrl: './account-wishlist-page.component.html',
  styleUrl: './account-wishlist-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountWishlistPageComponent implements OnInit {
  private readonly facade = inject(AccountWishlistFacade);

  protected readonly items = this.facade.items;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly actionError = this.facade.actionError;

  ngOnInit(): void {
    void this.facade.load();
  }

  protected itemImageUrl(imageUrl: string | null | undefined, index: number): string {
    return resolveWishlistItemImageUrl(imageUrl, index);
  }

  protected remove(productId: string): void {
    void this.facade.remove(productId);
  }

  protected moveToCart(productId: string): void {
    void this.facade.moveToCart(productId);
  }
}
