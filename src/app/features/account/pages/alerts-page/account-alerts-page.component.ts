import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';
import { CustomerAlertsFacade } from '../../services/customer-alerts.facade';
import { resolveWishlistItemImageUrl } from '../../utils/wishlist-image.util';

@Component({
  selector: 'app-account-alerts-page',
  standalone: true,
  imports: [RouterLink, HamboxCurrencyPipe, TranslatePipe, HamboxTranslateRefreshDirective],
  templateUrl: './account-alerts-page.component.html',
  styleUrl: './account-alerts-page.component.scss',
})
export class AccountAlertsPageComponent implements OnInit {
  private readonly facade = inject(CustomerAlertsFacade);

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

  protected remove(id: string): void {
    void this.facade.remove(id);
  }
}
