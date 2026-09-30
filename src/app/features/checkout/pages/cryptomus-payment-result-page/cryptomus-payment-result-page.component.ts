import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { StorefrontNavLinksService } from '../../../home/services/storefront-nav-links.service';
import { PaymentProcessingCardComponent } from '../../components/payment-processing-card/payment-processing-card.component';
import { CheckoutFacade } from '../../services/checkout.facade';
import { CryptomusPaymentStatus } from '../../models/checkout';
import { parseApiError } from '../../../../core/models/api-error.model';

const POLL_INTERVAL_MS = 3000;
// Mirrors dot-payment-result-page's own budget — if a Cryptomus attempt genuinely stalls this
// long, something is wrong on HAMBOX's or Cryptomus's side rather than the customer just being slow.
const MAX_POLL_MINUTES = 10;

@Component({
  selector: 'app-cryptomus-payment-result-page',
  standalone: true,
  imports: [StorefrontNavComponent, StorefrontFooterComponent, PaymentProcessingCardComponent, RouterLink, TranslatePipe],
  templateUrl: './cryptomus-payment-result-page.component.html',
  styleUrl: '../payment-processing-page/payment-processing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CryptomusPaymentResultPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly checkout = inject(CheckoutFacade);

  private destroyed = false;
  private pollTimeoutId?: ReturnType<typeof setTimeout>;

  protected readonly navLinks = inject(StorefrontNavLinksService).links;
  protected readonly status = signal<CryptomusPaymentStatus | 'Invalid' | 'SessionExpired'>('Pending');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly returnUrl = this.router.url;

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
      const result = await this.checkout.getCryptomusPaymentStatus(paymentAttemptId);

      if (result.status === 'Succeeded' && result.completedOrderId) {
        await this.router.navigate(['/checkout/success', result.completedOrderId]);
        return;
      }

      if (result.status === 'Failed' || result.status === 'Expired') {
        this.status.set(result.status);
        return;
      }
    } catch (error) {
      // A session that's genuinely gone surfaces here as either the original request's 401, or —
      // once the auth interceptor's own refresh attempt also fails — a 403 from the refresh
      // endpoint itself (authInterceptor rethrows whatever the refresh call failed with, not the
      // original 401). Either way, retrying forever would just spin in place while the order may
      // already be paid. Every other error (network blip, 5xx) stays transient: the next poll
      // tick picks the real state back up.
      const status = parseApiError(error).status;
      if (status === 401 || status === 403) {
        this.status.set('SessionExpired');
        return;
      }
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
