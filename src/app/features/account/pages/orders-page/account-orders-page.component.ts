import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { AccountOrdersFacade } from '../../services/account-orders.facade';
import { productPlaceholderImage } from '../../../home/utils/storefront-home.mapper';

@Component({
  selector: 'app-account-orders-page',
  standalone: true,
  imports: [RouterLink, HamboxCurrencyPipe, DatePipe],
  templateUrl: './account-orders-page.component.html',
  styleUrl: './account-orders-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountOrdersPageComponent implements OnInit {
  private readonly facade = inject(AccountOrdersFacade);

  protected readonly orders = this.facade.orders;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  ngOnInit(): void {
    void this.facade.loadOrders();
  }

  protected placeholderImage(index: number): string {
    return productPlaceholderImage(index);
  }

  protected statusClass(status: string): string {
    return `order-card__status--${status.toLowerCase()}`;
  }
}
