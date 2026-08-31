import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';

import { HamboxCurrencyPipe } from '../../../../../shared/pipes/hambox-currency.pipe';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../../shared/components/admin';
import { OrderManagementFacade } from '../../../orders/services/order-management.facade';

const STATUS_TONE: Record<string, AdminStatusTone> = {
  Completed: 'success',
  Delivered: 'success',
  Paid: 'success',
  Processing: 'info',
  'Partially Delivered': 'info',
  Pending: 'warning',
  'Awaiting Delivery': 'warning',
  Cancelled: 'danger',
  Failed: 'danger',
  Refunded: 'neutral',
};

/** Quick peek at an order's status/items without leaving the current page (e.g. mid-ticket). */
@Component({
  selector: 'app-order-quick-view-dialog',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    TranslatePipe,
    ButtonModule,
    DialogModule,
    TableModule,
    HamboxCurrencyPipe,
    AdminStatusBadgeComponent,
    AdminLoadingSkeletonComponent,
    AdminErrorAlertComponent,
  ],
  providers: [OrderManagementFacade],
  templateUrl: './order-quick-view-dialog.component.html',
  styleUrl: './order-quick-view-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderQuickViewDialogComponent {
  private readonly facade = inject(OrderManagementFacade);

  readonly visible = input(false);
  readonly orderId = input<string | null>(null);

  readonly visibleChange = output<boolean>();

  protected readonly detail = this.facade.detail;
  protected readonly loading = this.facade.detailLoading;
  protected readonly error = this.facade.detailError;

  constructor() {
    effect(() => {
      const id = this.orderId();
      if (this.visible() && id) {
        void this.facade.loadDetail(id);
      }
    });
  }

  protected statusTone(status: string): AdminStatusTone {
    return STATUS_TONE[status] ?? 'neutral';
  }

  protected onHide(): void {
    this.visibleChange.emit(false);
  }

  protected close(): void {
    this.visibleChange.emit(false);
  }
}
