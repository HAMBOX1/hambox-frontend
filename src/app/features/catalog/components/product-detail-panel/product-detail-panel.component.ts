import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { Product, ProductStatus } from '../../models/product.model';
import { productStatusLabel } from '../../utils/product-display.utils';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { resolveProductImageUrl } from '../../utils/product-image.utils';
import { copyToClipboard, formatShortGuid } from '../../../../shared/utils/guid-display.util';
import {
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../shared/components/admin';

const DESCRIPTION_CLAMP_THRESHOLD = 180;
type CopiedField = 'id' | 'categoryId' | 'url' | null;

@Component({
  selector: 'app-product-detail-panel',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    ButtonModule,
    TooltipModule,
    HamboxCurrencyPipe,
    HasPermissionDirective,
    AdminLoadingSkeletonComponent,
    AdminEmptyStateComponent,
    AdminStatusBadgeComponent,
    AdminErrorAlertComponent,
    AdminSectionCardComponent,
    AdminIconButtonComponent,
  ],
  templateUrl: './product-detail-panel.component.html',
  styleUrl: './product-detail-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailPanelComponent {
  protected readonly permissions = PERMISSIONS;

  readonly product = input<Product | null>(null);
  readonly loading = input(false);
  readonly updatingStatus = input(false);
  readonly actionLoading = input(false);
  readonly statusError = input<string | null>(null);

  readonly closePanel = output<void>();
  readonly statusChange = output<ProductStatus>();
  readonly duplicate = output<void>();
  readonly deleteProduct = output<void>();

  protected readonly statusLabel = productStatusLabel;
  protected readonly resolveImageUrl = resolveProductImageUrl;
  protected readonly formatShortGuid = formatShortGuid;

  protected readonly descriptionExpanded = signal(false);
  protected readonly copiedField = signal<CopiedField>(null);

  protected readonly isLongDescription = computed(() => {
    const description = this.product()?.descriptionEn ?? '';
    return description.trim().length > DESCRIPTION_CLAMP_THRESHOLD;
  });

  protected readonly storefrontPath = computed(() => {
    const product = this.product();
    return product ? `/products/${product.id}` : null;
  });

  protected readonly storefrontUrl = computed(() => {
    const path = this.storefrontPath();
    if (!path || typeof window === 'undefined') {
      return path ?? '';
    }
    return `${window.location.origin}${path}`;
  });

  protected statusTone(status: ProductStatus): AdminStatusTone {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Draft':
        return 'warning';
      case 'Inactive':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  protected canPublish(status: ProductStatus): boolean {
    return status === 'Draft' || status === 'Inactive';
  }

  protected canHide(status: ProductStatus): boolean {
    return status === 'Active';
  }

  protected canArchive(status: ProductStatus): boolean {
    return status !== 'Archived';
  }

  protected onPublish(): void {
    this.statusChange.emit('Active');
  }

  protected onHide(): void {
    this.statusChange.emit('Inactive');
  }

  protected onArchive(): void {
    this.statusChange.emit('Archived');
  }

  protected onDuplicate(): void {
    this.duplicate.emit();
  }

  protected onDelete(): void {
    this.deleteProduct.emit();
  }

  protected onClose(): void {
    this.closePanel.emit();
  }

  protected toggleDescription(): void {
    this.descriptionExpanded.update((expanded) => !expanded);
  }

  protected async copyValue(value: string, field: CopiedField): Promise<void> {
    const copied = await copyToClipboard(value);
    if (!copied) {
      return;
    }

    this.copiedField.set(field);
    window.setTimeout(() => {
      if (this.copiedField() === field) {
        this.copiedField.set(null);
      }
    }, 1500);
  }
}
