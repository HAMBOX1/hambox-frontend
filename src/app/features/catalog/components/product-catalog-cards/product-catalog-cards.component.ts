import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ButtonModule } from 'primeng/button';
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
  AdminSearchBarComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../shared/components/admin';
import { HamboxBottomSheetComponent } from '../../../../shared/components/hambox-bottom-sheet/hambox-bottom-sheet.component';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { CollectionOption } from '../../models/collection.model';
import { Product, ProductStatus } from '../../models/product.model';
import { productStatusLabel } from '../../utils/product-display.utils';
import { resolveProductImageUrl } from '../../utils/product-image.utils';

@Component({
  selector: 'app-product-catalog-cards',
  standalone: true,
  imports: [
    FormsModule,
    PaginatorModule,
    ButtonModule,
    CheckboxModule,
    TranslatePipe,
    HasPermissionDirective,
    HamboxCurrencyPipe,
    AdminStatusBadgeComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    AdminIconButtonComponent,
    AdminActionMenuComponent,
    AdminSearchBarComponent,
    HamboxBottomSheetComponent,
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
  readonly collectionOptions = input<readonly CollectionOption[]>([]);

  readonly createProduct = output<void>();
  readonly pageChange = output<{ first: number; rows: number }>();
  readonly productSelect = output<string>();
  readonly manageStock = output<Product>();
  readonly previewProduct = output<Product>();
  readonly duplicateProduct = output<Product>();
  readonly archiveProduct = output<Product>();
  readonly deleteProduct = output<Product>();
  readonly bulkToggle = output<{ productId: string; shiftKey: boolean }>();
  /** Emitted when the collections bottom sheet is saved — the page maps this into the same
   * partial-update path as the desktop table's collection popover. */
  readonly collectionsEdit = output<{ product: Product; collectionIds: readonly string[] }>();

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

  protected collectionCount(product: Product): number {
    return (product.collectionIds ?? []).length;
  }

  // --- Collections bottom sheet (mobile equivalent of the desktop table's popover) ---
  // No inline "create collection" here — matches the existing pattern of this mobile card
  // view already having no inline "create category" either; use the Collections page for that.

  private readonly collectionSheetProductState = signal<Product | null>(null);
  private readonly collectionDraftIdsState = signal<readonly string[]>([]);
  protected readonly collectionSheetSearchTerm = signal('');

  protected readonly collectionSheetOpen = signal(false);

  protected readonly filteredCollectionSheetOptions = computed(() => {
    const term = this.collectionSheetSearchTerm().trim().toLowerCase();
    const options = this.collectionOptions();

    if (!term) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(term));
  });

  protected isCollectionDraftChecked(collectionId: string): boolean {
    return this.collectionDraftIdsState().includes(collectionId);
  }

  protected openCollectionSheet(product: Product, event: Event): void {
    event.stopPropagation();
    this.collectionSheetProductState.set(product);
    this.collectionDraftIdsState.set(product.collectionIds ?? []);
    this.collectionSheetSearchTerm.set('');
    this.collectionSheetOpen.set(true);
  }

  protected closeCollectionSheet(): void {
    this.collectionSheetOpen.set(false);
    this.collectionSheetProductState.set(null);
  }

  protected toggleCollectionDraft(collectionId: string, checked: boolean): void {
    this.collectionDraftIdsState.update((ids) =>
      checked ? [...ids, collectionId] : ids.filter((id) => id !== collectionId),
    );
  }

  protected saveCollectionSheet(): void {
    const product = this.collectionSheetProductState();
    if (!product) {
      return;
    }

    this.collectionsEdit.emit({ product, collectionIds: this.collectionDraftIdsState() });
    this.closeCollectionSheet();
  }

  protected productActionMenuItems(product: Product): MenuItem[] {
    const t = (key: string) => this.translate.instant(key);
    const items: MenuItem[] = [
      {
        label: t('ADMIN.CATALOG_PAGE.ACTIONS.PREVIEW'),
        icon: 'pi pi-external-link',
        command: () => this.previewProduct.emit(product),
      },
    ];

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
