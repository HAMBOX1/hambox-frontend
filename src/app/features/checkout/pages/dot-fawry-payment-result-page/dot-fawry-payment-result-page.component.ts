import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { StorefrontNavLinksService } from '../../../home/services/storefront-nav-links.service';
import { PaymentProcessingCardComponent } from '../../components/payment-processing-card/payment-processing-card.component';
import { CheckoutFacade } from '../../services/checkout.facade';
import { DotFawryPaymentStatus } from '../../models/checkout';

const WALLET_LABEL_KEYS: Record<string, string> = {
  Fawry: 'CHECKOUT.METHOD_FAWRY',
  OrangeCash: 'CHECKOUT.METHOD_ORANGE_CASH',
  VodafoneCash: 'CHECKOUT.METHOD_VODAFONE_CASH',
};

const POLL_INTERVAL_MS = 5000;
// Fawry cash payment is a much longer-horizon action than DOT's OTP flow (the customer may need to
// physically visit an outlet) — poll for longer before giving up on this page. The reconciliation
// sweep and webhook keep resolving the attempt in the background regardless of whether this tab is open.
const MAX_POLL_MINUTES = 30;

@Component({
  selector: 'app-dot-fawry-payment-result-page',
  standalone: true,
  imports: [StorefrontNavComponent, StorefrontFooterComponent, PaymentProcessingCardComponent, RouterLink, TranslatePipe],
  templateUrl: './dot-fawry-payment-result-page.component.html',
  styleUrl: '../payment-processing-page/payment-processing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DotFawryPaymentResultPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly checkout = inject(CheckoutFacade);
  private readonly translate = inject(TranslateService);

  private destroyed = false;
  private pollTimeoutId?: ReturnType<typeof setTimeout>;

  protected readonly navLinks = inject(StorefrontNavLinksService).links;
  protected readonly status = signal<DotFawryPaymentStatus | 'Invalid'>('AwaitingPayment');
  protected readonly fawryReferenceNumber = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly operator = signal<string | null>(null);

  /** The selected wallet's translated display name (e.g. "Fawry", "Orange Cash") — interpolated into every stage message below. */
  protected readonly walletLabel = computed(() => {
    const key = (this.operator() && WALLET_LABEL_KEYS[this.operator()!]) || WALLET_LABEL_KEYS['Fawry'];
    return this.translate.instant(key);
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      clearTimeout(this.pollTimeoutId);
    });
  }

  ngOnInit(): void {
    const paymentAttemptId = this.route.snapshot.queryParamMap.get('paymentAttemptId');

    if (!paymentAttemptId) {
      this.status.set('Invalid');
      this.errorMessage.set('We could not confirm your payment request. Please try again.');
      return;
    }

    const deadline = Date.now() + MAX_POLL_MINUTES * 60_000;
    void this.pollUntilResolved(paymentAttemptId, deadline);
  }

  private async pollUntilResolved(paymentAttemptId: string, deadline: number): Promise<void> {
    if (this.destroyed) {
      return;
    }

    try {
      const result = await this.checkout.getDotFawryPaymentStatus(paymentAttemptId);
      this.fawryReferenceNumber.set(result.fawryReferenceNumber);
      this.operator.set(result.operator);

      if (result.status === 'Succeeded' && result.completedOrderId) {
        await this.router.navigate(['/checkout/success', result.completedOrderId]);
        return;
      }

      if (result.status === 'Failed' || result.status === 'Expired') {
        this.status.set(result.status);
        return;
      }

      this.status.set('AwaitingPayment');
    } catch {
      // Transient — the next poll tick picks the real state back up. Never treat a status-check
      // network error as payment failure.
    }

    if (this.destroyed) {
      return;
    }

    if (Date.now() > deadline) {
      this.status.set('Expired');
      return;
    }

    this.pollTimeoutId = setTimeout(() => {
      void this.pollUntilResolved(paymentAttemptId, deadline);
    }, POLL_INTERVAL_MS);
  }
}
