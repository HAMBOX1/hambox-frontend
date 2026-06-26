import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { AccountApiService } from '../../services/account-api.service';
import { AccountOrdersFacade } from '../../services/account-orders.facade';
import { WriteReviewDialogComponent } from '../../components/write-review-dialog/write-review-dialog.component';
import { OrderItemReviewStatusApiDto } from '../../models/account-api.model';

@Component({
  selector: 'app-account-order-detail-page',
  standalone: true,
  imports: [RouterLink, HamboxCurrencyPipe, DatePipe, WriteReviewDialogComponent],
  templateUrl: './account-order-detail-page.component.html',
  styleUrl: './account-order-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountOrderDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly facade = inject(AccountOrdersFacade);
  private readonly api = inject(AccountApiService);

  protected readonly order = this.facade.selectedOrder;
  protected readonly loading = this.facade.detailLoading;
  protected readonly error = this.facade.error;
  protected readonly reviewTarget = signal<OrderItemReviewStatusApiDto | null>(null);
  protected readonly reviewOpen = signal(false);

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (orderId) {
      void this.facade.loadOrder(orderId);
    }
  }

  protected openReview(item: OrderItemReviewStatusApiDto): void {
    this.reviewTarget.set(item);
    this.reviewOpen.set(true);
  }

  protected closeReview(): void {
    this.reviewOpen.set(false);
    this.reviewTarget.set(null);
  }

  protected async submitReview(payload: { rating: number; comment: string }): Promise<void> {
    const target = this.reviewTarget();
    const order = this.order();
    if (!target || !order) {
      return;
    }

    await firstValueFrom(
      this.api.createReview({
        productId: target.productId,
        orderId: order.id,
        rating: payload.rating,
        comment: payload.comment,
      }),
    );

    this.closeReview();
    await this.facade.loadOrder(order.id);
  }
}
