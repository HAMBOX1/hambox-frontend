import { TranslatePipe } from '@ngx-translate/core';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';
import { ImageFallbackDirective } from '../../../../shared/directives/image-fallback.directive';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { HamboxDatePipe } from '../../../../shared/pipes/hambox-date.pipe';
import { AccountOrdersFacade } from '../../services/account-orders.facade';
import { resolveProductImageUrl } from '../../../catalog/utils/product-image.utils';

const ORDER_PLACEHOLDER_IMAGE = 'assets/images/placeholders/product.svg';

type DateRangeFilter = 'all' | '30' | '90' | '365';

@Component({
  selector: 'app-account-orders-page',
  standalone: true,
  imports: [
    RouterLink,
    HamboxCurrencyPipe,
    HamboxDatePipe,
    TranslatePipe,
    HamboxTranslateRefreshDirective,
    ImageFallbackDirective,
  ],
  templateUrl: './account-orders-page.component.html',
  styleUrl: './account-orders-page.component.scss',
})
export class AccountOrdersPageComponent implements OnInit {
  private readonly facade = inject(AccountOrdersFacade);
  private readonly i18n = inject(TranslationService);

  protected readonly orders = this.facade.orders;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  protected readonly statusFilter = signal<string>('all');
  protected readonly dateFilter = signal<DateRangeFilter>('all');

  protected readonly availableStatuses = computed(() => {
    const statuses = new Set(this.orders().map((order) => order.status));
    return Array.from(statuses).sort();
  });

  protected readonly filteredOrders = computed(() => {
    const status = this.statusFilter();
    const range = this.dateFilter();
    const cutoff = range === 'all' ? null : Date.now() - Number(range) * 24 * 60 * 60 * 1000;

    return this.orders().filter((order) => {
      const matchesStatus = status === 'all' || order.status === status;
      const matchesDate = cutoff === null || new Date(order.createdOnUtc).getTime() >= cutoff;
      return matchesStatus && matchesDate;
    });
  });

  ngOnInit(): void {
    void this.facade.loadOrders();
  }

  protected orderImage(imageUrl?: string | null): string {
    return resolveProductImageUrl(imageUrl ?? '') || ORDER_PLACEHOLDER_IMAGE;
  }

  protected statusClass(status: string): string {
    return `order-card__status--${status.toLowerCase()}`;
  }

  protected statusLabel(status: string): string {
    const key = `ACCOUNT.ORDER_STATUS.${status.toUpperCase().replace(/\s+/g, '_')}`;
    const translated = this.i18n.instant(key);
    return translated === key ? status : translated;
  }

  protected onStatusFilterChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }

  protected onDateFilterChange(event: Event): void {
    this.dateFilter.set((event.target as HTMLSelectElement).value as DateRangeFilter);
  }
}
