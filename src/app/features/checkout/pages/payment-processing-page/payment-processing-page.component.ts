import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { interval } from 'rxjs';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { STOREFRONT_PRODUCTS_NAV_LINKS } from '../../../products/services/storefront-products-data';
import { PaymentProcessingCardComponent } from '../../components/payment-processing-card/payment-processing-card.component';

@Component({
  selector: 'app-payment-processing-page',
  standalone: true,
  imports: [StorefrontNavComponent, StorefrontFooterComponent, PaymentProcessingCardComponent],
  templateUrl: './payment-processing-page.component.html',
  styleUrl: './payment-processing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentProcessingPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly navLinks = signal([...STOREFRONT_PRODUCTS_NAV_LINKS]);
  protected readonly progress = signal(0);

  ngOnInit(): void {
    const orderId = this.route.snapshot.queryParamMap.get('orderId');
    if (!orderId) {
      void this.router.navigate(['/checkout']);
      return;
    }

    interval(120)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tick) => {
        const next = Math.min(67 + tick * 2, 100);
        this.progress.set(next);

        if (next >= 100) {
          void this.router.navigate(['/checkout/success', orderId]);
        }
      });
  }
}
