import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StorefrontNavComponent } from '../../../../shared/components/storefront-nav/storefront-nav.component';
import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { STOREFRONT_PRODUCTS_NAV_LINKS } from '../../../products/services/storefront-products-data';
import { Products } from '../../../products/services/products';
import { mapProductToStoreProduct } from '../../../products/utils/storefront-product.mapper';
import { CheckoutFacade } from '../../services/checkout.facade';
import { mapProductsToRecommendations } from '../../utils/checkout.mapper';
import { OrderSuccessDetails, OrderRecommendation } from '../../models/order-success';
import { OrderSuccessHeroComponent } from '../../components/order-success-hero/order-success-hero.component';
import { OrderPurchasedItemsComponent } from '../../components/order-purchased-items/order-purchased-items.component';
import { OrderReferralBannerComponent } from '../../components/order-referral-banner/order-referral-banner.component';
import { OrderSupportSidebarComponent } from '../../components/order-support-sidebar/order-support-sidebar.component';
import { OrderRecommendationsComponent } from '../../components/order-recommendations/order-recommendations.component';

@Component({
  selector: 'app-order-success-page',
  standalone: true,
  imports: [
    StorefrontNavComponent,
    StorefrontFooterComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
    OrderSuccessHeroComponent,
    OrderPurchasedItemsComponent,
    OrderReferralBannerComponent,
    OrderSupportSidebarComponent,
    OrderRecommendationsComponent,
  ],
  templateUrl: './order-success-page.component.html',
  styleUrl: './order-success-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSuccessPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly checkoutFacade = inject(CheckoutFacade);
  private readonly products = inject(Products);

  protected readonly navLinks = signal([...STOREFRONT_PRODUCTS_NAV_LINKS]);
  protected readonly orderDetails = signal<OrderSuccessDetails | null>(null);
  protected readonly recommendations = signal<readonly OrderRecommendation[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (!orderId) {
      void this.router.navigate(['/home']);
      return;
    }

    void this.loadOrder(orderId);
  }

  protected retry(): void {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (orderId) {
      void this.loadOrder(orderId);
    }
  }

  private async loadOrder(orderId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [details, productPage] = await Promise.all([
        this.checkoutFacade.loadOrder(orderId),
        this.products.getActiveProducts({ pageNumber: 1, pageSize: 8 }),
      ]);

      this.orderDetails.set(details);
      this.recommendations.set(
        mapProductsToRecommendations(
          (productPage.items ?? []).slice(0, 8).map((product) => {
            const mapped = mapProductToStoreProduct(product);
            return {
              id: mapped.id,
              title: mapped.title,
              priceUsd: mapped.priceUsd,
              imageUrl: mapped.imageUrl,
            };
          }),
        ),
      );
    } catch {
      this.orderDetails.set(null);
      this.recommendations.set([]);
      this.error.set('Unable to load your order confirmation.');
    } finally {
      this.loading.set(false);
    }
  }
}
