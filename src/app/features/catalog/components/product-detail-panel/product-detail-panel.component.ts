import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import {
  DEFAULT_PRODUCT_INVENTORY_PLACEHOLDERS,
  Product,
  ProductInventoryPlaceholders,
  ProductStatus,
} from '../../models/product.model';
import {
  productStatusLabel,
  productStatusSeverity,
} from '../../utils/product-display.utils';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { resolveProductImageUrl } from '../../utils/product-image.utils';

@Component({
  selector: 'app-product-detail-panel',
  standalone: true,
  imports: [RouterLink, ButtonModule, SkeletonModule, TagModule, HamboxCurrencyPipe],
  templateUrl: './product-detail-panel.component.html',
  styleUrl: './product-detail-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailPanelComponent {
  readonly product = input<Product | null>(null);
  readonly loading = input(false);
  readonly updatingStatus = input(false);
  readonly statusError = input<string | null>(null);
  readonly placeholders = input<ProductInventoryPlaceholders>(DEFAULT_PRODUCT_INVENTORY_PLACEHOLDERS);

  readonly closePanel = output<void>();
  readonly statusChange = output<ProductStatus>();

  protected readonly statusLabel = productStatusLabel;
  protected readonly statusSeverity = productStatusSeverity;
  protected readonly resolveImageUrl = resolveProductImageUrl;

  protected readonly tabs = ['Overview', 'Inventory', 'Pricing', 'Activity'] as const;
  protected readonly activeTab = 'Overview';

  protected canPublish(status: ProductStatus): boolean {
    return status === 'Draft' || status === 'Inactive';
  }

  protected canHide(status: ProductStatus): boolean {
    return status === 'Active';
  }

  protected onPublish(): void {
    this.statusChange.emit('Active');
  }

  protected onHide(): void {
    this.statusChange.emit('Inactive');
  }

  protected onClose(): void {
    this.closePanel.emit();
  }
}
