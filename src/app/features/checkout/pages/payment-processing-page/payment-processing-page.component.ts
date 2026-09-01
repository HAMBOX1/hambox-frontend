import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { StorefrontNavLinksService } from '../../../home/services/storefront-nav-links.service';
import { PaymentProcessingCardComponent } from '../../components/payment-processing-card/payment-processing-card.component';
import { CheckoutFacade } from '../../services/checkout.facade';
import { MembershipCheckoutFacade } from '../../services/membership-checkout.facade';
import { CartFacade } from '../../../cart/services/cart.facade';
import { ThemeEngineService } from '../../../../core/theme/theme-engine.service';
import { isDotFawryWallet, isDotWallet } from '../../models/checkout';

const CHECKOUT_STAGES = [
  'Authorizing payment',
  'Processing payment',
  'Creating order',
  'Reserving inventory',
  'Delivering license keys',
  'Sending confirmation',
] as const;

const MEMBERSHIP_CHECKOUT_STAGES = [
  'Authorizing payment',
  'Processing payment',
  'Creating membership order',
  'Activating membership',
  'Applying benefits',
  'Sending confirmation',
] as const;

@Component({
  selector: 'app-payment-processing-page',
  standalone: true,
  imports: [StorefrontNavComponent, StorefrontFooterComponent, PaymentProcessingCardComponent, RouterLink],
  templateUrl: './payment-processing-page.component.html',
  styleUrl: './payment-processing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentProcessingPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly checkout = inject(CheckoutFacade);
  private readonly membershipCheckout = inject(MembershipCheckoutFacade);
  private readonly cartFacade = inject(CartFacade);
  private readonly themeEngine = inject(ThemeEngineService);

  protected readonly navLinks = inject(StorefrontNavLinksService).links;
  protected readonly progress = signal(8);
  protected readonly stageLabel = signal<string>(CHECKOUT_STAGES[0]);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const orderId = this.route.snapshot.queryParamMap.get('orderId');
    const mode = this.route.snapshot.queryParamMap.get('mode');

    if (orderId) {
      this.runLegacyCompletion(orderId);
      return;
    }

    if (mode === 'checkout') {
      void this.runCheckoutFlow();
      return;
    }

    if (mode === 'membership') {
      void this.runMembershipCheckoutFlow();
      return;
    }

    void this.router.navigate(['/checkout']);
  }

  private runLegacyCompletion(orderId: string): void {
    interval(120)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tick) => {
        const next = Math.min(67 + tick * 2, 100);
        this.progress.set(next);
        this.stageLabel.set('Finalizing your order');

        if (next >= 100) {
          void this.router.navigate(['/checkout/success', orderId]);
        }
      });
  }

  private async runCheckoutFlow(): Promise<void> {
    if (this.cartFacade.isEmpty()) {
      void this.router.navigate(['/cart']);
      return;
    }

    if (this.checkout.paymentMethod() === 'dot' || isDotWallet(this.checkout.paymentMethod())) {
      void this.runDotCheckoutFlow();
      return;
    }

    if (isDotFawryWallet(this.checkout.paymentMethod())) {
      void this.runDotFawryCheckoutFlow();
      return;
    }

    let stageIndex = 0;
    const stageTimer = interval(700)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        stageIndex = Math.min(stageIndex + 1, CHECKOUT_STAGES.length - 1);
        this.stageLabel.set(CHECKOUT_STAGES[stageIndex]);
        this.progress.set(Math.min(12 + stageIndex * 14, 88));
      });

    try {
      const order = await this.checkout.submitOrder();
      stageTimer.unsubscribe();
      this.stageLabel.set('Payment successful');
      this.progress.set(100);

      await new Promise((resolve) => setTimeout(resolve, 500));
      await this.router.navigate(['/checkout/success', order.id]);
    } catch (error) {
      stageTimer.unsubscribe();
      const message =
        error instanceof Error ? error.message : 'Checkout failed. Please try again.';
      this.error.set(message);
      this.stageLabel.set('Payment failed');
    }
  }

  private async runDotCheckoutFlow(): Promise<void> {
    this.stageLabel.set('Preparing secure payment');
    this.progress.set(20);

    try {
      const initiation = await this.checkout.initiateDotCheckout();
      this.stageLabel.set('Redirecting to your carrier');
      this.progress.set(90);
      // Full page navigation — DOT's OTP flow is an external, off-app experience. There is
      // nothing further for this Angular page to do; the browser leaves the app entirely until
      // DOT redirects back to the backend callback, which lands on /checkout/dot/result.
      window.location.href = initiation.otpLandingPageUrl;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Checkout failed. Please try again.';
      this.error.set(message);
      this.stageLabel.set('Payment failed');
    }
  }

  private async runDotFawryCheckoutFlow(): Promise<void> {
    this.stageLabel.set('Preparing secure payment');
    this.progress.set(20);

    try {
      const initiation = await this.checkout.initiateDotFawryCheckout();
      this.stageLabel.set('Awaiting wallet payment');
      this.progress.set(90);
      // In-app navigation — unlike DOT's OTP flow, Direct Billing is server-to-server: there is
      // nothing to redirect the browser to. The result page shows the payment reference and polls
      // status until the customer completes payment and DOT's webhook confirms it.
      await this.router.navigate(['/checkout/dot-fawry/result'], {
        queryParams: { paymentAttemptId: initiation.paymentAttemptId },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Checkout failed. Please try again.';
      this.error.set(message);
      this.stageLabel.set('Payment failed');
    }
  }

  private async runMembershipCheckoutFlow(): Promise<void> {
    const planId = this.route.snapshot.queryParamMap.get('planId');
    const action = this.route.snapshot.queryParamMap.get('action') ?? 'subscribe';

    if (!planId) {
      void this.router.navigate(['/account/membership']);
      return;
    }

    await this.membershipCheckout.initialize(planId, action);
    this.membershipCheckout.updateBillingField('email', this.checkout.billingDetails().email);
    this.membershipCheckout.updateBillingField('country', this.checkout.billingDetails().country);
    this.membershipCheckout.selectPaymentMethod(this.checkout.paymentMethod());

    let stageIndex = 0;
    const stageTimer = interval(700)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        stageIndex = Math.min(stageIndex + 1, MEMBERSHIP_CHECKOUT_STAGES.length - 1);
        this.stageLabel.set(MEMBERSHIP_CHECKOUT_STAGES[stageIndex]);
        this.progress.set(Math.min(12 + stageIndex * 14, 88));
      });

    try {
      const order = await this.membershipCheckout.submitCheckout();
      await this.themeEngine.loadActiveTheme();
      stageTimer.unsubscribe();
      this.stageLabel.set('Membership activated');
      this.progress.set(100);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await this.router.navigate(['/checkout/success', order.id], {
        queryParams: { type: 'membership' },
      });
    } catch (error) {
      stageTimer.unsubscribe();
      const message =
        error instanceof Error ? error.message : 'Membership checkout failed. Please try again.';
      this.error.set(message);
      this.stageLabel.set('Payment failed');
    }
  }
}
