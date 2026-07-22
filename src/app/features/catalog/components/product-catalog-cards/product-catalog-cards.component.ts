import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { CheckboxModule } from 'primeng/checkbox';
import { MenuItem } from 'primeng/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../core/permissions/permission.service';
import {
  AdminActionMenuComponent,
  AdminEmptyStateComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { Product, ProductStatus } from '../../models/product.model';
import { productStatusLabel } from '../../utils/product-display.utils';
import { resolveProductImageUrl } from '../../utils/product-image.utils';

@Component({
  selector: 'app-product-catalog-cards',
  standalone: true,
  imports: [
    FormsModule,
    PaginatorModule,
    CheckboxModule,
    TranslatePipe,
    HasPermissionDirective,
    HamboxCurrencyPipe,
    AdminStatusBadgeComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    AdminIconButtonComponent,
    AdminActionMenuComponent,
  ],
  templateUrl: './product-catalog-cards.component.html',
  styleUrl: './product-catalog-cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCatalogCardsComponent {
  private readonly permissionService = inject(PermissionService);
  private readonly translate = inject(TranslateService);

  protected readonly permissions = PERMISSIONS;

  readonly products = input.required<readonly Product[]>();
  readonly loading = input(false);
  readonly totalRecords = input(0);
  readonly pageSize = input(20);
  readonly first = input(0);
  readonly searchActive = input(false);
  readonly bulkSelectedIds = input<ReadonlySet<string>>(new Set());

  readonly createProduct = output<void>();
  readonly pageChange = output<{ first: number; rows: number }>();
  readonly productSelect = output<string>();
  readonly manageStock = output<Product>();
  readonly duplicateProduct = output<Product>();
  readonly archiveProduct = output<Product>();
  readonly deleteProduct = output<Product>();
  readonly bulkToggle = output<{ productId: string; shiftKey: boolean }>();

  protected readonly statusLabel = productStatusLabel;
  protected readonly resolveImageUrl = resolveProductImageUrl;
  protected readonly failedImageIds = signal<ReadonlySet<string>>(new Set());

  protected statusTone(status: ProductStatus): AdminStatusTone {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Draft':
        return 'warning';
      case 'Inactive':
        return 'danger';
      case 'Archived':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  protected isImageFailed(productId: string): boolean {
    return this.failedImageIds().has(productId);
  }

  protected onImageError(productId: string): void {
    this.failedImageIds.update((ids) => new Set(ids).add(productId));
  }

  protected onPaginatorChange(event: PaginatorState): void {
    this.pageChange.emit({ first: event.first ?? 0, rows: event.rows ?? this.pageSize() });
  }

  protected onCardClick(product: Product): void {
    this.productSelect.emit(product.id);
  }

  protected isBulkSelected(productId: string): boolean {
    return this.bulkSelectedIds().has(productId);
  }

  protected onBulkCheckboxClick(product: Product, event: Event | undefined): void {
    const shiftKey = event instanceof MouseEvent && event.shiftKey;
    this.bulkToggle.emit({ productId: product.id, shiftKey });
  }

  protected onStockClick(product: Product, event: Event): void {
    event.stopPropagation();
    this.manageStock.emit(product);
  }

  protected productActionMenuItems(product: Product): MenuItem[] {
    const t = (key: string) => this.translate.instant(key);
    const items: MenuItem[] = [];

    if (this.permissionService.hasPermission(this.permissions.Catalog.Products.Create)) {
      items.push({
        label: t('ADMIN.CATALOG_PAGE.ACTIONS.DUPLICATE'),
        icon: 'pi pi-copy',
        command: () => this.duplicateProduct.emit(product),
      });
    }

    if (
      this.permissionService.hasPermission(this.permissions.Catalog.Products.Edit) &&
      product.status !== 'Archived'
    ) {
      items.push({
        label: t('ADMIN.CATALOG_PAGE.ACTIONS.ARCHIVE'),
        icon: 'pi pi-inbox',
        command: () => this.archiveProduct.emit(product),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Catalog.Products.Delete)) {
      items.push({
        label: t('ADMIN.CATALOG_PAGE.ACTIONS.DELETE'),
        icon: 'pi pi-trash',
        command: () => this.deleteProduct.emit(product),
      });
    }

    return items;
  }
}
