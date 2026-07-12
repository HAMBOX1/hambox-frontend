import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TagModule } from 'primeng/tag';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
  AdminStatusBadgeComponent,
} from '../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../shared/components/admin/admin-breadcrumb.helpers';
import { ProductVariantDto } from '../../models/inventory-api.model';
import { VariantInventoryPanelComponent } from '../../components/variant-inventory-panel/variant-inventory-panel.component';
import { ProductEditorFacade } from '../../services/product-editor.facade';

@Component({
  selector: 'app-variant-inventory-page',
  standalone: true,
  imports: [
    TagModule,
    AdminPageHeaderComponent,
    AdminStatCardComponent,
    AdminStatGridComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminStatusBadgeComponent,
    VariantInventoryPanelComponent,
  ],
  providers: [ProductEditorFacade],
  templateUrl: './variant-inventory-page.component.html',
  styleUrl: './variant-inventory-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantInventoryPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(ProductEditorFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly product = this.facade.product;
  protected readonly variant = this.facade.selectedVariant;
  protected readonly statistics = this.facade.statistics;

  protected readonly variantId = signal('');
  protected readonly productId = signal('');

  protected readonly breadcrumbs = computed(() => {
    const product = this.product();
    const variant = this.variant();

    return adminBreadcrumbs(
      { label: 'Inventory', route: '/admin/inventory' },
      {
        label: product?.nameEn ?? 'Product',
        route: product ? `/admin/products/${product.id}/edit` : null,
      },
      { label: variant?.sku ?? 'Variant', route: null },
    );
  });

  protected readonly statItems = computed(() => {
    const stats = this.statistics();
    if (!stats) {
      return [];
    }

    return [
      { label: 'Available', value: String(stats.available), tone: 'success' as const },
      { label: 'Reserved', value: String(stats.reserved), tone: 'info' as const },
      { label: 'Sold', value: String(stats.sold), tone: 'default' as const },
      { label: 'Expired', value: String(stats.expired), tone: 'warning' as const },
    ];
  });

  ngOnInit(): void {
    const variantId = this.route.snapshot.paramMap.get('variantId') ?? '';
    const productId =
      this.route.snapshot.queryParamMap.get('productId') ??
      this.route.snapshot.queryParamMap.get('product') ??
      '';

    this.variantId.set(variantId);
    this.productId.set(productId);

    if (!variantId || !productId) {
      void this.router.navigate(['/admin/inventory']);
      return;
    }

    void this.bootstrap(productId, variantId);
  }

  protected optionSummary(variant: ProductVariantDto): string {
    const labels = this.facade
      .optionGroups()
      .flatMap((group) =>
        group.options
          .filter((option) => variant.optionIds.includes(option.id))
          .map((option) => `${group.displayName}: ${option.label}`),
      );

    return labels.length ? labels.join(' · ') : variant.sku;
  }

  private async bootstrap(productId: string, variantId: string): Promise<void> {
    await this.facade.load(productId);
    await this.facade.selectVariant(variantId);
  }
}
