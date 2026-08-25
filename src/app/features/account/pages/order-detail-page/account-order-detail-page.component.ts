import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';

import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { HamboxDatePipe } from '../../../../shared/pipes/hambox-date.pipe';
import { AccountApiService } from '../../services/account-api.service';
import { AccountOrdersFacade } from '../../services/account-orders.facade';
import { WriteReviewDialogComponent } from '../../components/write-review-dialog/write-review-dialog.component';
import { OrderItemReviewStatusApiDto } from '../../models/account-api.model';
import { TranslationService } from '../../../../core/i18n/translation.service';

@Component({
  selector: 'app-account-order-detail-page',
  standalone: true,
  imports: [RouterLink, HamboxCurrencyPipe, HamboxDatePipe, TranslatePipe, WriteReviewDialogComponent, HamboxTranslateRefreshDirective],
  templateUrl: './account-order-detail-page.component.html',
  styleUrl: './account-order-detail-page.component.scss',
})
export class AccountOrderDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly facade = inject(AccountOrdersFacade);
  private readonly api = inject(AccountApiService);
  private readonly translate = inject(TranslateService);
  private readonly i18n = inject(TranslationService);

  protected readonly order = this.facade.selectedOrder;
  protected readonly loading = this.facade.detailLoading;
  protected readonly error = this.facade.error;
  protected readonly reviewTarget = signal<OrderItemReviewStatusApiDto | null>(null);
  protected readonly reviewOpen = signal(false);
  protected readonly reviewError = signal<string | null>(null);

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

  protected statusLabel(status: string): string {
    const key = `ACCOUNT.ORDER_STATUS.${status.toUpperCase().replace(/\s+/g, '_')}`;
    const translated = this.i18n.instant(key);
    return translated === key ? status : translated;
  }

  /** Order is paid and being fulfilled, but no keys are ready yet — a normal, temporary state,
   * not a sign anything is wrong (see ACCOUNT.ORDER_DETAIL_UI.PROCESSING_NOTE). */
  protected isProcessingStatus(status: string): boolean {
    return status === 'Pending' || status === 'Processing';
  }

  protected timelineEventLabel(eventType: string): string {
    const key = `ACCOUNT.TIMELINE_EVENT.${eventType.toUpperCase().replace(/\s+/g, '_')}`;
    const translated = this.i18n.instant(key);
    return translated === key ? eventType : translated;
  }

  protected async submitReview(payload: { rating: number; comment: string }): Promise<void> {
    const target = this.reviewTarget();
    const order = this.order();
    if (!target || !order) {
      return;
    }

    this.reviewError.set(null);

    try {
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
    } catch {
      this.reviewError.set(this.translate.instant('ACCOUNT.ORDER_DETAIL_UI.REVIEW_ERROR'));
    }
  }

  /** Cancellation is staff-mediated only — customers request it via a support ticket, never directly. */
  protected isCancellable(status: string): boolean {
    return status === 'Pending';
  }

  protected cancelRequestSubject(orderNumber: string): string {
    return this.translate.instant('ACCOUNT.ORDER_DETAIL_UI.CANCEL_REQUEST_SUBJECT', { orderNumber });
  }
}
